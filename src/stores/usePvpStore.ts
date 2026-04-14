'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';
import { Room, RoomPlayer, RoomSettings, RealtimeMessage, PvpAction, SerializedGameState } from '@/types/pvp';
import { getRoomPlayers, updateRoomStatus, kickPlayer, dissolveRoom, saveGameResult } from '@/lib/room-api';
import { BigFiveScores } from '@/types';
import { serializeGameState } from '@/lib/pvp-serializer';
import { initializePvpGame, applyPvpAction } from '@/lib/pvp-game-logic';

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

  reset: () => void;
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
                }],
              };
            });
            break;

          case 'player-left':
            set(s => ({ players: s.players.filter(p => p.player_id !== payload.playerId) }));
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
            // Host saves result, everyone sees it in gameState
            break;

          case 'state-request':
            // Host replies with the current authoritative state so a
            // refreshed client can resync mid-game.
            if (isHost) {
              const rawState = get().rawGameState;
              if (rawState) {
                const snapshot = serializeGameState(rawState, '__all__');
                channel.send({
                  type: 'broadcast',
                  event: 'msg',
                  payload: { type: 'game-state-update', gameState: snapshot },
                });
              }
            }
            break;
        }
      })
      .subscribe((status) => {
        if (status !== 'SUBSCRIBED') return;
        const { isHost: iAmHost, myPlayerId: mid, rawGameState } = get();
        if (!iAmHost && mid) {
          // Non-host asks host for the current authoritative state.
          channel.send({
            type: 'broadcast',
            event: 'msg',
            payload: { type: 'state-request', fromPlayerId: mid },
          });
        } else if (iAmHost && rawGameState) {
          // Host just reconnected — re-broadcast its state so anyone
          // who acted during the outage can reconcile.
          const snapshot = serializeGameState(rawGameState, '__all__');
          channel.send({
            type: 'broadcast',
            event: 'msg',
            payload: { type: 'game-state-update', gameState: snapshot },
          });
        }
      });

    set({ channel, myPlayerId });
  },

  unsubscribeRoom: () => {
    const { channel } = get();
    if (channel) channel.unsubscribe();
    set({ channel: null, room: null, players: [], gameState: null, rawGameState: null, isHost: false });
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

    // Store full state internally (host only)
    set({ rawGameState: rawState });

    set({ isHost: true });
    updateRoomStatus(room.id, 'playing');

    // Broadcast serialized state to each player
    const { channel } = get();
    if (!channel) return;

    // Broadcast game start with all hands included (each client reads their own)
    const serialized = serializeGameState(rawState, '__all__');
    get().sendMessage({ type: 'game-start', gameState: serialized });

    // Also update local gameState for host
    const hostSerialized = serializeGameState(rawState, myPlayerId);
    set({ gameState: hostSerialized });
  },

  handlePlayerAction: (_fromPlayerId, action) => {
    const rawState = get().rawGameState;
    if (!rawState) return;

    const { players, room } = get();
    const orderedPlayers = [...players].sort((a, b) => a.seat_index - b.seat_index);
    const currentPlayerId = orderedPlayers[rawState.currentPlayerIndex]?.player_id;

    if (_fromPlayerId !== currentPlayerId && action.type !== 'pong' && action.type !== 'skip-pong' && action.type !== 'hu') return;

    const newState = applyPvpAction(rawState, _fromPlayerId, action, orderedPlayers);
    set({ rawGameState: newState });

    // Broadcast updated state with all hands (each client reads their own)
    const serialized = serializeGameState(newState, '__all__');
    get().sendMessage({ type: 'game-state-update', gameState: serialized });

    // Update host view
    const hostSerialized = serializeGameState(newState, get().myPlayerId);
    set({ gameState: hostSerialized });

    if (newState.winner) {
      const winnerId = newState.winner;
      get().sendMessage({ type: 'game-over', winnerId });
      if (room) {
        const rankings = orderedPlayers.map((p, i) => ({
          playerId: p.player_id,
          declaredCount: newState.players[i]?.declaredSets?.length ?? 0,
          remainingCards: newState.players[i]?.hand?.length ?? 0,
        }));
        saveGameResult({ room_id: room.id, winner_id: winnerId, rankings, rounds_played: newState.currentRound });
        // Reset room status so "再来一局" can navigate back to room
        updateRoomStatus(room.id, 'waiting');
      }
    }
  },

  reset: () => {
    get().unsubscribeRoom();
    set({ room: null, players: [], myPlayerId: null, channel: null, gameState: null, rawGameState: null, isHost: false });
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
