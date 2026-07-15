/**
 * Persist a finished game to Supabase.
 *
 * Schema lives in supabase/migrations/0001_game_records.sql.
 * Three tables:
 *   - big_five_snapshots: 學號 ↔ 當次比賽使用的人格分數對應（不覆蓋歷史）
 *   - game_sessions: 一局的元數據
 *   - game_participants: 一行一人一局（核心查詢表）
 *
 * Failures are logged but never thrown — saving stats must NEVER block the
 * end-of-game UI flow.
 */
import { supabase } from './supabase';
import { GameState, BigFiveScores, Player, PlayerId } from '@/types';
import { getPlayerScore, getRankings } from './game-logic';

export interface SeatMeta {
  seatIndex: number;
  playerId: string | null;   // null for AI
  studentId: string | null;  // null for AI
  isAi: boolean;
}

export interface SaveGameSessionInput {
  mode: 'single' | 'pvp';
  roomId?: string | null;
  roomCode?: string | null;
  startedAt: number;         // unix ms (use first action's timestamp or initGame time)
  finalState: GameState;
  seatMeta: SeatMeta[];      // one per seat, in seat order
  // 客户端生成的稳定 session id：用于去重。慢速存档触发 5s 超时返回 null → 缓存重传，
  // 但底层可能已写成功 → 重传时同 id 会 23505，saveInner 据此跳过，避免重复行。
  sessionId?: string;
}

/** Insert one BigFive snapshot. Returns inserted row id. */
async function insertSnapshot(input: {
  playerId: string;
  studentId: string;
  scores: BigFiveScores;
  source: 'assessment' | 'manual' | 'game-start';
}): Promise<string | null> {
  // 客户端生成 id：big_five_snapshots 开了 INSERT-only RLS（隐私，不给 SELECT），
  // 所以不能用 .insert().select('id') 回读——那样 RETURNING 会被 RLS 拦住整条回滚。
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined;
  const { error } = await supabase
    .from('big_five_snapshots')
    .insert({
      ...(id ? { id } : {}),
      player_id: input.playerId,
      student_id: input.studentId,
      scores: input.scores,
      source: input.source,
    });
  if (error) {
    console.warn('[game-record] insertSnapshot failed', error);
    return null;
  }
  return id ?? null;
}

// 失敗/超時 payload 暫存在 localStorage，下次啓動時 retrySavePending() 重傳。
const PENDING_KEY = 'psycho-card-pending-saves';
const SAVE_TIMEOUT_MS = 5000;

function readPending(): SaveGameSessionInput[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writePending(items: SaveGameSessionInput[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(items));
  } catch {}
}

function bufferForRetry(input: SaveGameSessionInput) {
  // 同 sessionId 的舊條目替換掉（pagehide 可能反覆觸發），避免重複行
  const items = readPending().filter((it) => it.sessionId !== input.sessionId);
  items.push(input);
  // 上限 10 局，老的丟掉避免無限增長
  writePending(items.slice(-10));
}

function removePending(sessionId: string) {
  const items = readPending();
  const next = items.filter((it) => it.sessionId !== sessionId);
  if (next.length !== items.length) writePending(next);
}

/**
 * 同步把一局寫入重傳緩衝（不碰網絡）。給 pagehide/beforeunload 用——
 * 頁面卸載時 async 網絡請求活不到返回，先落 localStorage，下次啓動
 * retryPendingSaves() 補傳。調用方必須傳入穩定 sessionId（重複調用去重）。
 */
export function bufferPendingSave(input: SaveGameSessionInput & { sessionId: string }) {
  bufferForRetry(input);
}

/**
 * 清掉緩衝裏某局的「中斷快照」（winner=null 且 startedAt 匹配）。
 * host 掉線前 pagehide 存過中斷快照，但之後成功恢復（對局繼續/正常打完）
 * 時必須調這個，否則下次啓動會把「已復活的局」當中斷局補傳，造成
 * 同一局既有完整記錄又有中斷記錄。
 */
export function removePendingInterrupted(startedAt: number) {
  const items = readPending();
  const next = items.filter(
    (it) => !(it.startedAt === startedAt && it.finalState.winner == null)
  );
  if (next.length !== items.length) writePending(next);
}

// 暫存存檔的最長重試時效。超過這個時間還沒傳上去的，丟棄不再補傳——
// 否則幾周前的舊局會在某次打開時被翻出來、蓋上"今天"的 ended_at 落庫，
// 污染課堂數據（曾出現 5/20 的局 6/2 才補傳的情況）。host 崩潰後數小時內
// 重開補傳這種正常場景不受影響。
const MAX_RETRY_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Retry any pending saves left over from a previous session.
 * Call once on app startup (e.g. PVP lobby mount).
 * 過期（> MAX_RETRY_AGE_MS）的暫存存檔直接丟棄，不補傳。
 */
// usePvpStore 的 zustand persist key（見該文件 persist name）。這裏直接讀
// localStorage 而不 import store——避免循環依賴，也不受 rehydrate 時序影響。
const PVP_STORE_KEY = 'psycho-card-pvp';

// 補傳前先撤「其實還活着的局」的中斷快照：host 崩潰後 pagehide/hidden 落過
// winner=null 快照，但 rawGameState 也持久化着、對局可以復活。若用戶重開後
// 先落在大廳（retryPendingSaves 掛載點），不撤就會把活局誤傳成中斷局，之後
// 打完又存一條完整行——同一局兩條記錄且 append-only 表刪不掉。
function dropLiveGameSnapshot() {
  try {
    const raw = localStorage.getItem(PVP_STORE_KEY);
    if (!raw) return;
    const st = JSON.parse(raw)?.state;
    const g = st?.isHost ? st?.rawGameState : null;
    if (!g || g.phase === 'game-over') return;
    const startedAt: number | undefined = g.gameStartedAt ?? g.actionLog?.[0]?.timestamp;
    if (startedAt != null) removePendingInterrupted(startedAt);
  } catch {}
}

let retryInFlight = false;
export async function retryPendingSaves(): Promise<void> {
  // 多個頁面掛載點（大廳/遊戲頁）可能同時觸發——串行化，避免同一條目雙發。
  if (retryInFlight) return;
  retryInFlight = true;
  try {
    dropLiveGameSnapshot();
    const items = readPending();
    if (items.length === 0) return;
    // 舊版緩衝條目可能沒有 sessionId → 補一個並寫回，逐條移除才有錨點。
    let mutated = false;
    for (const it of items) {
      if (!it.sessionId) {
        it.sessionId =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `${it.startedAt}-${it.roomCode ?? 'x'}`;
        mutated = true;
      }
    }
    if (mutated) writePending(items);
    const now = Date.now();
    for (const item of items) {
      if (now - item.startedAt > MAX_RETRY_AGE_MS) {
        removePending(item.sessionId!); // 過期，丟棄
        continue;
      }
      const id = await saveOnce(item, SAVE_TIMEOUT_MS);
      // 逐條成功逐條移除（而不是最後批量覆寫）：期間若有新對局結束寫入
      // 緩衝，批量覆寫會把它沖掉。
      if (id) removePending(item.sessionId!);
    }
  } finally {
    retryInFlight = false;
  }
}

/**
 * Save a finished game. Best-effort with timeout + localStorage retry buffer.
 * Returns the inserted session id, or null if persistence failed.
 * Host crash window narrowed from minutes (fire-and-forget) to ~5s + retry.
 */
export async function saveGameSession(input: SaveGameSessionInput): Promise<string | null> {
  // 确保有稳定 session id（去重用）。在 saveOnce 之前赋值，缓存重传时复用同一 id。
  if (!input.sessionId) {
    input.sessionId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${input.startedAt}-${input.roomCode ?? 'x'}`;
  }
  // 先落緩衝、成功再移除（而非失敗才緩衝）：終局後 host 立刻關頁面的話，
  // in-flight 網絡請求會死掉——緩衝先行保證下次啓動必能補傳。同 sessionId
  // 重傳在 saveInner 裏被 23505 + participants 檢查去重，不會產生重複行。
  bufferForRetry(input);
  const id = await saveOnce(input, SAVE_TIMEOUT_MS);
  if (id) {
    removePending(input.sessionId);
  } else {
    console.warn('[game-record] save timed out or failed — kept in localStorage for retry');
  }
  return id;
}

// 按 sessionId 合流的在途寫入：saveGameSession 的 5s 超時只是「不等了」，
// 底層 saveInner 仍在跑；若此時 retryPendingSaves 對同一 sessionId 再發一次，
// 兩個 writer 會撞 saveInner 的 23505→查 participants 為空→都補寫 的 TOCTOU
// 窗口，寫出重複行。合流後同一局同一時刻只有一個 saveInner，後來者等它的結果。
const inFlightSaves = new Map<string, Promise<string | null>>();

async function saveOnce(input: SaveGameSessionInput, timeoutMs: number): Promise<string | null> {
  const sid = input.sessionId;
  let work = sid ? inFlightSaves.get(sid) : undefined;
  if (!work) {
    work = saveInner(input);
    if (sid) {
      inFlightSaves.set(sid, work);
      void work.finally(() => inFlightSaves.delete(sid));
    }
  }
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
  return Promise.race([work, timeout]);
}

async function saveInner(input: SaveGameSessionInput): Promise<string | null> {
  try {
    // rank 排序：先剔除 hasLeft 玩家排到尾部，再按 getRankings (declaredSets desc,
    // hand asc) 在活人內部排。否則 last-standing winner 可能因 declaredSets=0
    // 被退出玩家擠到 rank=2 而 is_winner=true，數據自相矛盾。
    const winnerId = input.finalState.winner;
    const activePlayers = input.finalState.players.filter((p) => !p.hasLeft);
    const leftPlayers = input.finalState.players.filter((p) => p.hasLeft);
    const ranked: Player[] = [
      ...getRankings(activePlayers),
      ...getRankings(leftPlayers),
    ];

    const sessionId = input.sessionId!;

    // 1) 先建 session（去重闸门）：用客户端生成的稳定 id。若 23505（慢速成功后的
    //    重传），说明本局已写过 → 直接返回，跳过快照/参与者，避免整套重复行。
    const { error: sErr } = await supabase
      .from('game_sessions')
      .insert({
        id: sessionId,
        mode: input.mode,
        room_id: input.roomId ?? null,
        room_code: input.roomCode ?? null,
        started_at: new Date(input.startedAt).toISOString(),
        ended_at: new Date().toISOString(),
        total_rounds: input.finalState.settings.totalRounds,
        rounds_played: input.finalState.currentRound,
        winner_player_id:
          input.mode === 'pvp' && winnerId
            ? (winnerId as unknown as string)
            : null,  // single-player winner is 'human'|'ai-N', not a UUID
      });
    if (sErr) {
      if (sErr.code === '23505') {
        // session 已存在：可能是(a)上次完整写过 或(b)上次写完 session 就挂了、participants 没写(孤儿)。
        // participants 是单条多行 insert(全有或全无)，故查它就能区分：有→真已存档,跳过;无→半写,继续补。
        const { data: existing } = await supabase
          .from('game_participants')
          .select('id')
          .eq('session_id', sessionId)
          .limit(1);
        if (existing && existing.length > 0) return sessionId; // 已完整存档 → 不重复写
        // 否则落空(孤儿 session) → 不 return，往下补写 snapshots + participants
      } else {
        console.warn('[game-record] insert session failed', sErr);
        return null;
      }
    }

    // 2) Snapshot BigFive for every non-AI seat (one snapshot per participant).
    //    This nails down 學號 ↔ 這一局使用的人格分數 forever.
    const snapshotByPlayerId = new Map<string, string>();
    for (const meta of input.seatMeta) {
      if (meta.isAi || !meta.playerId || !meta.studentId) continue;
      const seatPlayer = input.finalState.players[meta.seatIndex];
      if (!seatPlayer) continue;
      const snapshotId = await insertSnapshot({
        playerId: meta.playerId,
        studentId: meta.studentId,
        scores: seatPlayer.bigFiveScores,
        source: 'game-start',
      });
      if (snapshotId) snapshotByPlayerId.set(meta.playerId, snapshotId);
    }

    // 3) Count actions per player from the actionLog.
    const counts: Record<string, { huS: number; huF: number; pS: number; pF: number }> = {};
    for (const a of input.finalState.actionLog) {
      const pid = a.playerId as string;
      counts[pid] ??= { huS: 0, huF: 0, pS: 0, pF: 0 };
      if (a.type === 'hu-success') counts[pid].huS++;
      else if (a.type === 'hu-fail') counts[pid].huF++;
      else if (a.type === 'pong-success') counts[pid].pS++;
      else if (a.type === 'pong-fail') counts[pid].pF++;
    }

    // 4) One participant row per seat.
    const rows = input.finalState.players.map((p, idx) => {
      const meta = input.seatMeta.find((m) => m.seatIndex === idx);
      const rank = ranked.findIndex((r) => r.id === p.id) + 1;
      const c = counts[p.id as unknown as string] ?? { huS: 0, huF: 0, pS: 0, pF: 0 };
      return {
        session_id: sessionId,
        player_id: meta?.playerId ?? null,
        student_id: meta?.studentId ?? null,
        seat_index: idx,
        is_ai: meta?.isAi ?? !p.isHuman,
        // 分数只存进 big_five_snapshots（已锁 SELECT），这里仅留 FK，不再反规范化分数列，
        // 避免 anon 经公开的 /stats 读到「学号→分数」。见 identity-plan 隐私残留 todo。
        big_five_snapshot_id: meta?.playerId ? snapshotByPlayerId.get(meta.playerId) ?? null : null,
        declared_count: p.declaredSets.length,
        remaining_cards: p.hand.length,
        final_score: getPlayerScore(p),
        rank: rank > 0 ? rank : idx + 1,
        is_winner: p.id === winnerId,
        hu_success_count: c.huS,
        hu_fail_count: c.huF,
        pong_success_count: c.pS,
        pong_fail_count: c.pF,
      };
    });

    const { error: pErr } = await supabase.from('game_participants').insert(rows);
    if (pErr) {
      console.warn('[game-record] insert participants failed', pErr);
      // session row already in — return it anyway so caller knows partial success.
    }

    return sessionId;
  } catch (err) {
    console.warn('[game-record] saveGameSession exception', err);
    return null;
  }
}
