'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Room, RoomPlayer, RoomSettings, RealtimeMessage, PvpAction, SerializedGameState } from '@/types/pvp';
import { getRoomPlayers, updateRoomStatus, kickPlayer, dissolveRoom, leaveRoom } from '@/lib/room-api';
import {
  saveGameSession,
  bufferPendingSave,
  removePendingInterrupted,
  SaveGameSessionInput,
} from '@/lib/game-record';
import { BigFiveScores } from '@/types';
import { serializeGameState } from '@/lib/pvp-serializer';
import { initializePvpGame, applyPvpAction } from '@/lib/pvp-game-logic';

// Host-side grace-period timers: presence drops → 3-minute hold-off
// → real markPlayerLeft + broadcast. Lives outside the zustand state
// so it's not persisted / serialized.
const OFFLINE_GRACE_MS = 3 * 60 * 1000;
const offlineTimers = new Map<string, ReturnType<typeof setTimeout>>();

// Host-side claim-window auto-resolve. 抢牌窗口（碰/胡/过）要求所有有资格的
// 玩家都响应才推进；若有人在线却发呆不点，窗口会永久卡死全桌。超时后 host 替
// 未响应者补 skip-pong，让回合继续。一旦离开 claim-window 立即清除。
const CLAIM_WINDOW_MS = 20 * 1000;
let claimTimer: ReturnType<typeof setTimeout> | null = null;
function clearClaimTimer() {
  if (claimTimer) { clearTimeout(claimTimer); claimTimer = null; }
}

// 武裝 claim-window 超時器。除了「剛進入 claim-window」時調用，host 刷新後
// 重新訂閱時也要調（rawGameState 從 localStorage 恢復停在 claim-window，而
// claimTimer 是模塊變量刷新即丟——不補一針的話 AFK 玩家會把全桌卡死）。
// 待響應名單以 rawGameState.players（座位穩定）為準，不用房間名冊。
function armClaimTimer(getStore: () => PvpStore) {
  clearClaimTimer();
  claimTimer = setTimeout(() => {
    claimTimer = null;
    const store = getStore();
    const s = store.rawGameState;
    if (!store.isHost || !s || s.phase !== 'claim-window') return;
    const responded = new Set(s.claimResponses as string[]);
    const pending = (s.players as { id: string; hasLeft?: boolean }[]).filter(
      (p, idx) => idx !== s.discardedByIndex && !p.hasLeft && !responded.has(p.id)
    );
    // 逐个补 skip-pong；engine 在全员响应后自动 finalize 推进回合。
    for (const p of pending) {
      store.handlePlayerAction(p.id, { type: 'skip-pong' });
    }
  }, CLAIM_WINDOW_MS);
}

// Client-side host-grace timer (non-host clients only). If the host
// vanishes, every non-host independently starts a 3-min countdown.
// Host comes back inside the window → cancel. Otherwise the room is
// truly unrecoverable and we dissolve locally.
let hostGraceTimer: ReturnType<typeof setTimeout> | null = null;

interface PvpStore {
  // Room state
  room: Room | null;
  players: RoomPlayer[];
  myPlayerId: string | null;
  channel: RealtimeChannel | null;

  // Game state (host runs the full state, others get serialized view)
  gameState: SerializedGameState | null;
  rawGameState: any | null; // host-only full game state
  isHost: boolean;

  // Tentative-offline players (presence dropped but still inside grace
  // period). Visible to every client via player-offline broadcast.
  offlinePlayerIds: string[];

  // Actions
  setRoom: (room: Room) => void;
  setMyPlayerId: (id: string) => void;
  setPlayers: (players: RoomPlayer[]) => void;
  subscribeRoom: (roomCode: string, myPlayerId: string) => void;
  unsubscribeRoom: () => void;
  sendMessage: (msg: RealtimeMessage) => void;

  // Host-only
  startGame: () => void;
  handlePlayerAction: (fromPlayerId: string, action: PvpAction) => void;
  // Host 中途退出/解散時，把當前未結束的對局存成「中斷局」(winner=null)。
  persistInterruptedGame: () => void;
  // Host 頁面卸載（pagehide/beforeunload）時同步把中斷快照寫入 localStorage
  // 重傳緩衝——硬崩潰/直接關頁時 async 存檔活不到返回，這是唯一保數據的窗口。
  bufferInterruptedSnapshot: () => void;

  reset: () => void;
}

// 模塊級去重：同一局（按 gameStartedAt）只存一次中斷記錄，避免退出流程
// 多處觸發導致重複寫入。
const interruptedSaved = new Set<number>();

// 同一局中斷記錄的穩定 sessionId（按 gameStartedAt 鍵控）：pagehide 快照可能
// 反覆觸發、之後 persistInterruptedGame 也可能再存——全部複用同一個 id，
// localStorage 緩衝按 id 替換 + Supabase 按 id 去重，保證一局最多一條中斷行。
const interruptedSessionIds = new Map<number, string>();
function interruptedSessionId(startedAt: number): string {
  let sid = interruptedSessionIds.get(startedAt);
  if (!sid) {
    sid =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${startedAt}-interrupted`;
    interruptedSessionIds.set(startedAt, sid);
  }
  return sid;
}

// 座位元數據：以引擎 players 為準（中途退出者仍佔位），房間名冊只用來補
// student_id；player-joined 廣播漏收時 student_id 為空 → 用 player_id 兜底
// （PVP 流程裏兩者恆等），避免 game_participants.student_id 存 null 丟歸屬。
function buildSeatMeta(
  rawState: { players: { id: string }[] },
  roster: RoomPlayer[]
): SaveGameSessionInput['seatMeta'] {
  const roomPlayerById = new Map(roster.map((rp) => [rp.player_id, rp]));
  return rawState.players.map((p, i) => ({
    seatIndex: i,
    playerId: p.id,
    studentId: roomPlayerById.get(p.id)?.student_id ?? p.id ?? null,
    isAi: false,
  }));
}

// 構造中斷局的存檔輸入（winner=null）。persistInterruptedGame（網絡存）和
// bufferInterruptedSnapshot（純 localStorage）共用。
function buildInterruptedInput(
  rawGameState: {
    phase?: string;
    players: { id: string }[];
    actionLog?: { timestamp?: number }[];
    gameStartedAt?: number;
  },
  room: Room,
  players: RoomPlayer[]
): (SaveGameSessionInput & { sessionId: string }) | null {
  if (!rawGameState || rawGameState.phase === 'game-over') return null;
  const startedAt: number =
    rawGameState.gameStartedAt ??
    rawGameState.actionLog?.[0]?.timestamp ??
    Date.now();
  return {
    mode: 'pvp',
    roomId: room.id,
    roomCode: room.code,
    startedAt,
    finalState: { ...rawGameState, winner: null } as unknown as SaveGameSessionInput['finalState'],
    seatMeta: buildSeatMeta(rawGameState, players),
    sessionId: interruptedSessionId(startedAt),
  };
}

export const usePvpStore = create<PvpStore>()(
  persist(
    (set, get) => ({
  room: null,
  players: [],
  myPlayerId: null,
  channel: null,
  gameState: null,
  rawGameState: null,
  isHost: false,
  offlinePlayerIds: [],

  setRoom: (room) => set({ room }),
  setMyPlayerId: (id) => set({ myPlayerId: id }),
  setPlayers: (players) => set({ players }),

  subscribeRoom: (roomCode, myPlayerId) => {
    const existing = get().channel;
    if (existing) existing.unsubscribe();

    const channel = supabase.channel(`pvp-${roomCode}`, {
      config: { broadcast: { self: false } },
    });

    // (Re)subscribe 後的 presence 全量清點開關：leave/join 事件只覆蓋「訂閱
    // 期間發生」的變化；自己剛（重新）連上時錯過的離線/回歸要靠第一次
    // presence sync 對賬。每次 SUBSCRIBED 都重新武裝一次（斷線重連後同樣
    // 需要對賬）。
    let pendingSweep = true;

    // 非 host 的「房主消失」倒計時。到點 = 房間確實救不回來了：best-effort
    // 把房間標成 ended + 清掉自己的座位（否則 DB 裏永遠掛着 'playing' 殭屍
    // 房，房主名下 room_players 也一直纏着這個學號），再跳回首頁。
    const armHostGraceTimer = () => {
      if (hostGraceTimer) clearTimeout(hostGraceTimer);
      hostGraceTimer = setTimeout(async () => {
        hostGraceTimer = null;
        const { room: r, myPlayerId: me } = get();
        const cleanup: Promise<unknown>[] = [];
        if (r) cleanup.push(updateRoomStatus(r.id, 'ended').catch(() => {}));
        if (r && me) cleanup.push(leaveRoom(r.id, me).catch(() => {}));
        // 最多等 1.5s，別讓收屍拖住玩家離場。
        await Promise.race([
          Promise.allSettled(cleanup),
          new Promise((res) => setTimeout(res, 1500)),
        ]);
        get().unsubscribeRoom();
        if (typeof window !== 'undefined') window.location.href = '/';
      }, OFFLINE_GRACE_MS);
    };

    // Host 側：把某玩家標成「暫時離線」+ 廣播 + 武裝 3 分鐘寬限計時器。
    // presence leave 事件和 sync 對賬共用。
    const hostMarkOffline = (lid: string) => {
      set(s => s.offlinePlayerIds.includes(lid)
        ? s
        : { offlinePlayerIds: [...s.offlinePlayerIds, lid] });
      get().sendMessage({ type: 'player-offline', playerId: lid });
      // Reset any prior timer (presence flap)
      const prev = offlineTimers.get(lid);
      if (prev) clearTimeout(prev);
      const timer = setTimeout(() => {
        offlineTimers.delete(lid);
        const stillHost = get().isHost;
        const currRaw = get().rawGameState;
        if (!stillHost || !currRaw || currRaw.phase === 'game-over') return;
        const stillNotLeft = (currRaw.players as { id: string; hasLeft?: boolean }[])
          .find((p) => p.id === lid && !p.hasLeft);
        if (!stillNotLeft) return;
        // Grace expired — really leave. The broadcast below has
        // self:false, so host's own broadcast handler doesn't
        // fire — that's why we manually splice players + clear
        // offlinePlayerIds locally (instead of relying on the
        // broadcast handler at 'case player-left').
        get().handlePlayerAction(lid, { type: 'leave' });
        get().sendMessage({ type: 'player-left', playerId: lid });
        set(s => ({
          players: s.players.filter((p) => p.player_id !== lid),
          offlinePlayerIds: s.offlinePlayerIds.filter((id) => id !== lid),
        }));
      }, OFFLINE_GRACE_MS);
      offlineTimers.set(lid, timer);
    };

    channel
      .on('broadcast', { event: 'msg' }, ({ payload }: { payload: RealtimeMessage }) => {
        const { room, myPlayerId: myId, isHost } = get();
        if (!room) return;

        switch (payload.type) {
          case 'player-joined': {
            set(s => {
              const idx = s.players.findIndex(p => p.player_id === payload.player.id);
              if (idx >= 0) {
                // 已存在 → 合并补齐缺失字段(用既有值优先，incoming 只填 null)。
                // 这样后到的「重广播」能把先前建成 null 的 big_five/学号/头像补上，
                // 修复各客户端「測評狀態/学号」分歧；且不会用 null 覆盖已有的好值。
                const ex = s.players[idx];
                const merged = {
                  ...ex,
                  student_id: ex.student_id ?? payload.player.studentId,
                  big_five: ex.big_five ?? payload.player.bigFive,
                  avatar: ex.avatar ?? payload.player.avatar,
                };
                if (merged.student_id === ex.student_id && merged.big_five === ex.big_five && merged.avatar === ex.avatar) return s;
                const next = [...s.players];
                next[idx] = merged;
                return { players: next };
              }
              return {
                players: [...s.players, {
                  room_id: room.id,
                  player_id: payload.player.id,
                  seat_index: payload.seatIndex,
                  student_id: payload.player.studentId,
                  big_five: payload.player.bigFive,
                  avatar: payload.player.avatar,
                }],
              };
            });
            // 花名册收敛：host 把「既有」玩家的 join 重广播一遍，让新加入者补齐
            // 学号/测评状态/头像（后加入者会漏掉先前的广播）。dedup 守卫(上面)防重复/循环。
            if (isHost) {
              const existing = get().players.filter((p) => p.player_id !== payload.player.id);
              for (const p of existing) {
                get().sendMessage({
                  type: 'player-joined',
                  player: { id: p.player_id, studentId: p.student_id ?? p.player_id, bigFive: p.big_five ?? null, avatar: p.avatar },
                  seatIndex: p.seat_index,
                });
              }
            }
            break;
          }

          case 'player-left':
            set(s => ({
              players: s.players.filter(p => p.player_id !== payload.playerId),
              offlinePlayerIds: s.offlinePlayerIds.filter((id) => id !== payload.playerId),
            }));
            break;

          case 'player-offline':
            set(s => s.offlinePlayerIds.includes(payload.playerId)
              ? s
              : { offlinePlayerIds: [...s.offlinePlayerIds, payload.playerId] });
            break;

          case 'player-online':
            set(s => ({
              offlinePlayerIds: s.offlinePlayerIds.filter((id) => id !== payload.playerId),
            }));
            break;

          case 'player-kicked':
            if (payload.playerId === myId) {
              get().unsubscribeRoom();
              window.location.href = '/pvp';
            } else {
              set(s => ({ players: s.players.filter(p => p.player_id !== payload.playerId) }));
            }
            break;

          case 'room-dissolved':
            get().unsubscribeRoom();
            window.location.href = '/pvp';
            break;

          case 'settings-changed':
            set(s => ({ room: s.room ? { ...s.room, settings: payload.settings } : null }));
            break;

          case 'game-start':
          case 'game-state-update':
            // Drop payloads addressed to other recipients (per-player
            // hand-privacy broadcast). Untagged payloads are accepted
            // for backwards-compat with legacy '__all__' broadcasts.
            if (payload.toPlayerId && payload.toPlayerId !== myId) break;
            set({ gameState: payload.gameState });
            break;

          case 'action-request':
            if (isHost) {
              get().handlePlayerAction(payload.fromPlayerId, payload.action);
            }
            break;

          case 'big-five-updated':
            set(s => ({
              players: s.players.map(p =>
                p.player_id === payload.playerId ? { ...p, big_five: payload.bigFive } : p
              ),
            }));
            break;

          case 'game-over':
            // Host saves result, everyone sees it in gameState.
            // Also clear any stale offline UI — once the game is over
            // we don't want lingering "離線中" badges if someone happened
            // to disconnect right at the end.
            for (const t of offlineTimers.values()) clearTimeout(t);
            offlineTimers.clear();
            clearClaimTimer();
            set({ offlinePlayerIds: [] });
            break;

          case 'state-request':
            // Host replies privately to the requester (resync after
            // refresh). Personal snapshot — never expose other hands.
            if (isHost) {
              const rawState = get().rawGameState;
              if (rawState) {
                const requesterId = payload.fromPlayerId;
                const snapshot = serializeGameState(rawState, requesterId);
                channel.send({
                  type: 'broadcast',
                  event: 'msg',
                  payload: {
                    type: 'game-state-update',
                    gameState: snapshot,
                    toPlayerId: requesterId,
                  },
                });
              }
            }
            break;
        }
      })
      // Presence channel — supabase auto-pings every subscriber and
      // fires 'leave' on disconnect (close tab / network drop / OS sleep).
      // Don't kick immediately — give them OFFLINE_GRACE_MS (3 min) to
      // come back. Switching apps / brief connection drops shouldn't
      // boot the player. Host promotes to a real leave only when the
      // timer expires without reconnect.
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        const { isHost: hostNow, rawGameState, room } = get();
        const leftIds = (leftPresences as { player_id?: string }[])
          .map((p) => p.player_id)
          .filter((id): id is string => typeof id === 'string');
        if (leftIds.length === 0 || !room) return;

        const hostPid = room.host_id;

        // Case 1: HOST vanished. Earlier we dissolved immediately, but
        // rawGameState is persisted in localStorage, so a host that
        // tabbed away / refreshed can come back and resume. Give them
        // the same 3-min grace as everyone else. Non-host clients can't
        // act during the gap (action-requests have nowhere to land),
        // so the UI shows a "房主暫時離線" banner via offlinePlayerIds.
        if (!hostNow && hostPid && leftIds.includes(hostPid)) {
          // Mark host as offline locally; show the banner.
          set(s => s.offlinePlayerIds.includes(hostPid)
            ? s
            : { offlinePlayerIds: [...s.offlinePlayerIds, hostPid] });
          // Independent client-side timeout — no broadcast (the host is
          // gone, no one would forward it). Each client races its own
          // countdown.
          armHostGraceTimer();
          return;
        }

        // Case 2: I'm host. Mark non-host leavers as tentatively offline
        // and start a grace timer. If they reconnect within 3 min, we
        // cancel. Otherwise we promote to a real leave.
        if (hostNow && rawGameState && rawGameState.phase !== 'game-over') {
          for (const lid of leftIds) {
            if (lid === hostPid) continue;
            const stillIn = (rawGameState.players as { id: string; hasLeft?: boolean }[])
              .find((p) => p.id === lid && !p.hasLeft);
            if (!stillIn) continue;
            hostMarkOffline(lid);
          }
        }
      })
      // Presence 全量對賬（每次 SUBSCRIBED 後的第一個 sync 跑一次）：
      // - Host 刷新後，模塊級 offlineTimers 已隨頁面丟失——之前掉線的玩家
      //   沒人計時，若一直不回來，回合輪到他就永久卡桌。這裏按引擎座位表
      //   逐一比對 presence，缺席者補標離線 + 重新武裝寬限計時器。
      // - 非 host 斷線重連期間錯過了 host 的 leave/join 事件，同樣靠 sync
      //   對賬補上 / 撤掉「房主離線」倒計時。
      .on('presence', { event: 'sync' }, () => {
        if (!pendingSweep) return;
        pendingSweep = false;
        const { isHost: hostNow, room: rm, rawGameState: raw, myPlayerId: me } = get();
        if (!rm) return;
        let present: Set<string>;
        try {
          const st = channel.presenceState() as Record<string, Array<{ player_id?: string }>>;
          present = new Set(
            Object.values(st).flat()
              .map((p) => p.player_id)
              .filter((x): x is string => typeof x === 'string')
          );
        } catch {
          return;
        }
        const hostPid = rm.host_id;
        if (!hostNow && hostPid) {
          if (present.has(hostPid)) {
            if (hostGraceTimer) { clearTimeout(hostGraceTimer); hostGraceTimer = null; }
            set(s => s.offlinePlayerIds.includes(hostPid)
              ? { offlinePlayerIds: s.offlinePlayerIds.filter((id) => id !== hostPid) }
              : s);
          } else if (!hostGraceTimer) {
            set(s => s.offlinePlayerIds.includes(hostPid)
              ? s
              : { offlinePlayerIds: [...s.offlinePlayerIds, hostPid] });
            armHostGraceTimer();
          }
        }
        if (hostNow && raw && raw.phase !== 'game-over') {
          const enginePlayers = raw.players as { id: string; hasLeft?: boolean }[];
          for (const p of enginePlayers) {
            if (p.hasLeft || p.id === me) continue;
            if (present.has(p.id)) {
              const t = offlineTimers.get(p.id);
              if (t) { clearTimeout(t); offlineTimers.delete(p.id); }
              set(s => s.offlinePlayerIds.includes(p.id)
                ? { offlinePlayerIds: s.offlinePlayerIds.filter((id) => id !== p.id) }
                : s);
            } else if (!offlineTimers.has(p.id)) {
              hostMarkOffline(p.id);
            }
          }
        }
      })
      // Presence 'join' fires on initial subscribe AND on reconnect.
      // Use it to cancel a pending grace-timer when the player returns
      // within the window.
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        const { isHost: hostNow, room: rm, sendMessage: send } = get();
        const joinIds = (newPresences as { player_id?: string }[])
          .map((p) => p.player_id)
          .filter((id): id is string => typeof id === 'string');
        const hostPid = rm?.host_id;
        for (const jid of joinIds) {
          // Case A: host coming back — cancel the client-side
          // host-grace countdown (regardless of whether I'm the host or
          // a peer).
          if (hostPid && jid === hostPid && hostGraceTimer) {
            clearTimeout(hostGraceTimer);
            hostGraceTimer = null;
          }
          // Case B: host's per-player grace timer (host only).
          const t = offlineTimers.get(jid);
          if (t) {
            clearTimeout(t);
            offlineTimers.delete(jid);
          }
          // Clear local offline state.
          set(s => s.offlinePlayerIds.includes(jid)
            ? { offlinePlayerIds: s.offlinePlayerIds.filter((id) => id !== jid) }
            : s);
          if (hostNow) {
            send({ type: 'player-online', playerId: jid });
          }
        }
      })
      .subscribe(async (status) => {
        if (status !== 'SUBSCRIBED') return;
        // 每次（重）連上都重新武裝 presence 對賬：斷線期間錯過的 leave/join
        // 由下一個 sync 事件補賬（peer 刷新撞上 host 寬限期 / host 刷新丟
        // offlineTimers 兩種情況都在 sync handler 裏處理）。
        pendingSweep = true;
        // Track self in presence so others can detect our disconnect.
        try { await channel.track({ player_id: myPlayerId, t: Date.now() }); } catch {}

        const { isHost: iAmHost, myPlayerId: mid, rawGameState } = get();

        if (!iAmHost && mid) {
          // Non-host asks host for the current authoritative state.
          channel.send({
            type: 'broadcast',
            event: 'msg',
            payload: { type: 'state-request', fromPlayerId: mid },
          });
        } else if (iAmHost && rawGameState) {
          // Host just reconnected — re-broadcast personalized state per
          // recipient so anyone who acted during the outage can reconcile,
          // without leaking other hands.
          const orderedPlayers = [...get().players].sort(
            (a, b) => a.seat_index - b.seat_index
          );
          for (const op of orderedPlayers) {
            const pid = op.player_id;
            const snapshot = serializeGameState(rawGameState, pid);
            channel.send({
              type: 'broadcast',
              event: 'msg',
              payload: {
                type: 'game-state-update',
                gameState: snapshot,
                toPlayerId: pid,
              },
            });
          }
          // Host 刷新回來時若對局停在 claim-window，模塊級 claimTimer 已隨
          // 刷新丟失 → 重新武裝，否則 AFK 玩家會把窗口永久卡死。
          if (rawGameState.phase === 'claim-window' && !claimTimer) {
            armClaimTimer(get);
          }
          // Host 復活、對局續命 → 之前 pagehide 落的中斷快照已過期，撤掉。
          // 不撤的話，下次 retryPendingSaves 會把「活着的局」補傳成中斷局，
          // 與之後的正常終局記錄自相矛盾。之後若再崩潰，pagehide 會重新落快照。
          // ⚠️ 僅在前台撤：iOS 後台掛起時 socket 閃斷重連也會走到這裏，此時
          // 頁面隨時被 OS 靜默殺掉（無 pagehide/visibilitychange）——快照是
          // 唯一保險，不能撤。回前台後 visibilitychange handler 會補撤。
          if (
            rawGameState.phase !== 'game-over' &&
            (typeof document === 'undefined' || document.visibilityState === 'visible')
          ) {
            const startedAt: number | undefined =
              (rawGameState as { gameStartedAt?: number }).gameStartedAt ??
              rawGameState.actionLog?.[0]?.timestamp;
            if (startedAt != null) removePendingInterrupted(startedAt);
          }
        }
      });

    set({ channel, myPlayerId });
  },

  unsubscribeRoom: () => {
    const { channel } = get();
    if (channel) channel.unsubscribe();
    // Clear all pending grace timers (host's per-player + client-side
    // host-grace).
    for (const t of offlineTimers.values()) clearTimeout(t);
    offlineTimers.clear();
    clearClaimTimer();
    if (hostGraceTimer) {
      clearTimeout(hostGraceTimer);
      hostGraceTimer = null;
    }
    set({ channel: null, room: null, players: [], gameState: null, rawGameState: null, isHost: false, offlinePlayerIds: [] });
  },

  sendMessage: (msg) => {
    const { channel } = get();
    if (!channel) return;
    channel.send({ type: 'broadcast', event: 'msg', payload: msg });
  },

  startGame: () => {
    const { players, room, myPlayerId } = get();
    if (!room || !myPlayerId) return;

    // Gather BigFive for each player
    const bigFiveMap = Object.fromEntries(
      players.map(p => [p.player_id, p.big_five ?? null]).filter(([, v]) => v !== null)
    );

    const maxPlayers = (room.settings as RoomSettings).maxPlayers ?? 4;
    const orderedPlayers = [...players]
      .sort((a, b) => a.seat_index - b.seat_index)
      .slice(0, maxPlayers);
    const rawState = initializePvpGame(orderedPlayers, bigFiveMap, room.settings);
    // 記開局時刻，game-record 用這個值而不是 actionLog[0].timestamp（actionLog 第一項
    // 可能是 leave 之類的非"開局"動作，會誤把 started_at 染成動作時間）。
    (rawState as { gameStartedAt?: number }).gameStartedAt = Date.now();

    // Store full state internally (host only)
    set({ rawGameState: rawState });

    set({ isHost: true });
    updateRoomStatus(room.id, 'playing');

    // Broadcast serialized state to each player
    const { channel } = get();
    if (!channel) return;

    // Per-recipient broadcast: each player only ever sees their own hand
    // + the public state. Replaces the old '__all__' mode which leaked
    // every hand to every client (visible in opponent devtools).
    for (const op of orderedPlayers) {
      const pid = op.player_id;
      const personal = serializeGameState(rawState, pid);
      get().sendMessage({ type: 'game-start', gameState: personal, toPlayerId: pid });
    }

    // Also update local gameState for host
    const hostSerialized = serializeGameState(rawState, myPlayerId);
    set({ gameState: hostSerialized });
  },

  handlePlayerAction: (_fromPlayerId, action) => {
    const rawState = get().rawGameState;
    if (!rawState) return;
    // 避免 game-over 後再觸發的 action（例如 leave）重複 broadcast / 重複 save。
    const wasAlreadyWinner = !!rawState.winner;

    const { players, room } = get();
    // 當前玩家判定以引擎的 players（座位穩定）為準——房間名冊在玩家被剔除後
    // 會縮短，用名冊索引會錯位（詳見 applyPvpAction 同款注釋）。
    const rawPlayers = rawState.players as { id: string }[];
    const currentPlayerId = rawPlayers[rawState.currentPlayerIndex]?.id;

    // 'leave' is unconditional — any player at any time can quit. Whitelist
    // it before the current-player gate, otherwise the host would silently
    // drop a non-current-player's exit and the room would deadlock when
    // turn rotation lands on the now-unmanned seat.
    if (
      action.type !== 'leave' &&
      _fromPlayerId !== currentPlayerId &&
      action.type !== 'pong' &&
      action.type !== 'skip-pong' &&
      action.type !== 'hu'
    ) return;

    const newState = applyPvpAction(rawState, _fromPlayerId, action);
    set({ rawGameState: newState });

    // Per-recipient broadcast to keep hands private.
    const orderedPlayers = [...players].sort((a, b) => a.seat_index - b.seat_index);
    for (const op of orderedPlayers) {
      const pid = op.player_id;
      const personal = serializeGameState(newState, pid);
      get().sendMessage({ type: 'game-state-update', gameState: personal, toPlayerId: pid });
    }

    // Update host view
    const hostSerialized = serializeGameState(newState, get().myPlayerId);
    set({ gameState: hostSerialized });

    // 抢牌窗口防卡死：刚进入 claim-window 时起一个超时；超时则替所有「有资格但
    // 未响应」的玩家补 skip-pong（最后一个会触发 finalize 让回合推进）。窗口一解
    // （phase 不再是 claim-window）立即清除计时器。
    if (newState.phase === 'claim-window') {
      if (rawState.phase !== 'claim-window') {
        armClaimTimer(get);
      }
    } else {
      clearClaimTimer();
    }

    if (newState.winner && !wasAlreadyWinner) {
      const winnerId = newState.winner;
      get().sendMessage({ type: 'game-over', winnerId });
      if (room) {
        // New schema: game_sessions + game_participants + big_five_snapshots.
        // Falls back silently if Supabase is unreachable (best-effort).
        const startedAt =
          (newState as { gameStartedAt?: number }).gameStartedAt ??
          newState.actionLog[0]?.timestamp ??
          Date.now();
        // 對局正常打完 → pagehide 落過的中斷快照作廢，撤掉，避免補傳出
        // 「同一局既有完整記錄又有中斷記錄」。
        removePendingInterrupted(startedAt);
        // fire-and-forget but with internal upfront localStorage buffer +
        // 5s timeout (saveGameSession 先落緩衝再發網絡、成功才移除)。這裏
        // 仍不 await，避免阻塞 UI；host 崩潰保護靠 retryPendingSaves() 補傳。
        void saveGameSession({
          mode: 'pvp',
          roomId: room.id,
          roomCode: room.code,
          startedAt,
          finalState: newState,
          seatMeta: buildSeatMeta(newState, players),
        });
        // Reset room status so "再來一局" can navigate back to room
        updateRoomStatus(room.id, 'waiting');
      }
    }
  },

  persistInterruptedGame: () => {
    const { isHost, rawGameState, room, players } = get();
    // 只有 host 持有完整 rawGameState 才能存；遊戲沒開始 / 已正常結束都不在此存。
    if (!isHost || !rawGameState || !room) return;

    const input = buildInterruptedInput(rawGameState, room, players);
    if (!input) return; // 已正常結束（winner 路徑存過）

    // 模塊級去重：退出流程多處觸發也只真正發起一次網絡存。
    if (interruptedSaved.has(input.startedAt)) return;
    interruptedSaved.add(input.startedAt);

    // winner=null → game-record 寫入 winner_player_id=null，課堂查詢可區分中斷局。
    // sessionId 與 pagehide 快照共用同一個（按 startedAt 鍵控）→ 緩衝按 id 替換、
    // Supabase 按 id 去重，兩條路徑最多落一條中斷行。
    // fire-and-forget（內部先落緩衝 + 5s 超時）。
    void saveGameSession(input);
  },

  bufferInterruptedSnapshot: () => {
    const { isHost, rawGameState, room, players } = get();
    if (!isHost || !rawGameState || !room) return;
    const input = buildInterruptedInput(rawGameState, room, players);
    if (!input) return;
    // 純同步 localStorage 寫入（頁面卸載時 async 網絡活不到返回）。
    // 若之後頁面其實沒死（bfcache 回來 / 只是切後台）：host 重訂閱成功時
    // removePendingInterrupted 會把這條快照撤掉，不會誤傳。
    bufferPendingSave(input);
  },

  reset: () => {
    get().unsubscribeRoom();
    set({ room: null, players: [], myPlayerId: null, channel: null, gameState: null, rawGameState: null, isHost: false, offlinePlayerIds: [] });
    try { localStorage.removeItem('psycho-card-pvp'); } catch {}
  },
    }),
    {
      name: 'psycho-card-pvp',
      storage: createJSONStorage(() => localStorage),
      // Channel isn't serializable (functions + live socket). Everything
      // else survives a refresh so the UI can re-render immediately and
      // then re-subscribe.
      partialize: (s) => ({
        room: s.room,
        players: s.players,
        myPlayerId: s.myPlayerId,
        gameState: s.gameState,
        rawGameState: s.rawGameState,
        isHost: s.isHost,
      }),
    }
  )
);
