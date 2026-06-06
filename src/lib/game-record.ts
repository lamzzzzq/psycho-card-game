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
  const items = readPending();
  items.push(input);
  // 上限 10 局，老的丟掉避免無限增長
  writePending(items.slice(-10));
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
export async function retryPendingSaves(): Promise<void> {
  const items = readPending();
  if (items.length === 0) return;
  const now = Date.now();
  const remaining: SaveGameSessionInput[] = [];
  for (const item of items) {
    if (now - item.startedAt > MAX_RETRY_AGE_MS) continue; // 過期，丟棄
    const id = await saveOnce(item, SAVE_TIMEOUT_MS);
    if (!id) remaining.push(item);
  }
  writePending(remaining);
}

/**
 * Save a finished game. Best-effort with timeout + localStorage retry buffer.
 * Returns the inserted session id, or null if persistence failed.
 * Host crash window narrowed from minutes (fire-and-forget) to ~5s + retry.
 */
export async function saveGameSession(input: SaveGameSessionInput): Promise<string | null> {
  const id = await saveOnce(input, SAVE_TIMEOUT_MS);
  if (!id) {
    console.warn('[game-record] save timed out or failed — buffered to localStorage for retry');
    bufferForRetry(input);
  }
  return id;
}

async function saveOnce(input: SaveGameSessionInput, timeoutMs: number): Promise<string | null> {
  const work = saveInner(input);
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

    // 1) Snapshot BigFive for every non-AI seat (one snapshot per participant).
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

    // 2) Create the session row.
    const { data: session, error: sErr } = await supabase
      .from('game_sessions')
      .insert({
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
      })
      .select('id')
      .single();
    if (sErr || !session) {
      console.warn('[game-record] insert session failed', sErr);
      return null;
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
        session_id: session.id,
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

    return session.id;
  } catch (err) {
    console.warn('[game-record] saveGameSession exception', err);
    return null;
  }
}
