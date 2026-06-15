'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Room, RoomPlayer, RoomSettings, RealtimeMessage, PvpAction, SerializedGameState } from '@/types/pvp';
import { getRoomPlayers, updateRoomStatus, kickPlayer, dissolveRoom } from '@/lib/room-api';
import { saveGameSession, retryPendingSaves } from '@/lib/game-record';
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

  reset: () => void;
}

// 模塊級去重：同一局（按 gameStartedAt）只存一次中斷記錄，避免退出流程
// 多處觸發導致重複寫入。
const interruptedSaved = new Set<number>();

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

    channel
      .on('broadcast', { event: 'msg' }, ({ payload }: { payload: RealtimeMessage }) => {
        const { room, myPlayerId: myId, isHost } = get();
        if (!room) return;

        switch (payload.type) {
          case 'player-joined':
            set(s => {
              if (s.players.some(p => p.player_id === payload.player.id)) return s;
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
            break;

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
        const { isHost: hostNow, rawGameState, room, sendMessage: send } = get();
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
          if (hostGraceTimer) clearTimeout(hostGraceTimer);
          hostGraceTimer = setTimeout(() => {
            hostGraceTimer = null;
            // 3 min and host still hasn't returned — give up.
            get().unsubscribeRoom();
            if (typeof window !== 'undefined') window.location.href = '/';
          }, OFFLINE_GRACE_MS);
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
            // Mark offline locally + broadcast
            set(s => s.offlinePlayerIds.includes(lid)
              ? s
              : { offlinePlayerIds: [...s.offlinePlayerIds, lid] });
            send({ type: 'player-offline', playerId: lid });
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
              send({ type: 'player-left', playerId: lid });
              set(s => ({
                players: s.players.filter((p) => p.player_id !== lid),
                offlinePlayerIds: s.offlinePlayerIds.filter((id) => id !== lid),
              }));
            }, OFFLINE_GRACE_MS);
            offlineTimers.set(lid, timer);
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
        // Track self in presence so others can detect our disconnect.
        try { await channel.track({ player_id: myPlayerId, t: Date.now() }); } catch {}

        const { isHost: iAmHost, myPlayerId: mid, rawGameState, room: rm2 } = get();

        // Defensive: peer refresh while the host happens to be inside
        // their 3-min grace window. We just (re-)subscribed but missed
        // the 'leave' event for the host, so no grace timer is running.
        // Check current presence state; if host pid isn't present,
        // synthesize the offline state + start the local timer.
        const hostPid2 = rm2?.host_id;
        if (!iAmHost && hostPid2) {
          try {
            const presence = channel.presenceState() as Record<string, Array<{ player_id?: string }>>;
            const allPresent = Object.values(presence).flat();
            const hostHere = allPresent.some((p) => p.player_id === hostPid2);
            if (!hostHere && !hostGraceTimer) {
              set((s) => s.offlinePlayerIds.includes(hostPid2)
                ? s
                : { offlinePlayerIds: [...s.offlinePlayerIds, hostPid2] });
              hostGraceTimer = setTimeout(() => {
                hostGraceTimer = null;
                get().unsubscribeRoom();
                if (typeof window !== 'undefined') window.location.href = '/';
              }, OFFLINE_GRACE_MS);
            }
          } catch {
            // presence read failed — fall through to normal state-request
          }
        }

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
    const orderedPlayers = [...players].sort((a, b) => a.seat_index - b.seat_index);
    const currentPlayerId = orderedPlayers[rawState.currentPlayerIndex]?.player_id;

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

    const newState = applyPvpAction(rawState, _fromPlayerId, action, orderedPlayers);
    set({ rawGameState: newState });

    // Per-recipient broadcast to keep hands private.
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
        clearClaimTimer();
        claimTimer = setTimeout(() => {
          claimTimer = null;
          const s = get().rawGameState;
          if (!get().isHost || !s || s.phase !== 'claim-window') return;
          const ordered = [...get().players].sort((a, b) => a.seat_index - b.seat_index);
          const responded = new Set(s.claimResponses as unknown as string[]);
          const pending = ordered.filter(
            (op, idx) => idx !== s.discardedByIndex && !responded.has(op.player_id)
          );
          // 逐个补 skip-pong；engine 在全员响应后自动 finalize 推进回合。
          for (const op of pending) {
            get().handlePlayerAction(op.player_id, { type: 'skip-pong' });
          }
        }, CLAIM_WINDOW_MS);
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
        const seatMeta = orderedPlayers.map((rp, i) => ({
          seatIndex: i,
          playerId: rp.player_id,
          // player_id 在 PVP 流程里恒等于学号（info={id:sid,studentId:sid}）。
          // 若某人的 player-joined 广播没收到，student_id 会是空 → 用 player_id 兜底，
          // 避免 game_participants.student_id 存成 null 丢失归属。
          studentId: rp.student_id ?? rp.player_id ?? null,
          isAi: false,
        }));
        // fire-and-forget but with internal 5s timeout + localStorage retry
        // buffer (saveGameSession 內部處理超時和暫存)。這裏仍不 await，避免阻塞
        // UI；真正的 host 崩潰保護靠 retryPendingSaves() 下次啓動補傳。
        void saveGameSession({
          mode: 'pvp',
          roomId: room.id,
          roomCode: room.code,
          startedAt,
          finalState: newState,
          seatMeta,
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
    if (rawGameState.phase === 'game-over') return; // 正常結束已由 winner 路徑存過

    const key: number | undefined =
      (rawGameState as { gameStartedAt?: number }).gameStartedAt ??
      rawGameState.actionLog?.[0]?.timestamp;
    if (key != null) {
      if (interruptedSaved.has(key)) return;
      interruptedSaved.add(key);
    }

    const orderedPlayers = [...players].sort((a, b) => a.seat_index - b.seat_index);
    const startedAt = key ?? Date.now();
    const seatMeta = orderedPlayers.map((rp, i) => ({
      seatIndex: i,
      playerId: rp.player_id,
      studentId: rp.student_id ?? null,
      isAi: false,
    }));
    // winner=null → game-record 寫入 winner_player_id=null，課堂查詢可區分中斷局。
    // fire-and-forget（內部 5s 超時 + localStorage 重試）。
    void saveGameSession({
      mode: 'pvp',
      roomId: room.id,
      roomCode: room.code,
      startedAt,
      finalState: { ...rawGameState, winner: null },
      seatMeta,
    });
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
