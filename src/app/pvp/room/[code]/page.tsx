'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useAssessmentStore } from '@/stores/useAssessmentStore';
import { usePvpStore } from '@/stores/usePvpStore';
import { supabase } from '@/lib/supabase';
import { getRoomPlayers, kickPlayer, dissolveRoom, leaveRoom, updateRoomStatus } from '@/lib/room-api';
import { Room, RoomPlayer, RoomSettings } from '@/types/pvp';

export default function RoomWaitPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  const { player } = usePlayerStore();
  const { bigFiveScores } = useAssessmentStore();
  const {
    room, players, isHost,
    setRoom, setMyPlayerId, setPlayers,
    subscribeRoom, sendMessage, startGame, unsubscribeRoom,
  } = usePvpStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [settings, setSettings] = useState<RoomSettings>({ maxPlayers: 3, totalRounds: 5 });

  // Load room from DB on mount
  useEffect(() => {
    if (!player) { router.replace('/pvp'); return; }
    // Drop any stale gameState from a previous session. We're in the
    // pre-game waiting room — gameState should be null until host
    // starts this game, and leaving persisted non-null state behind
    // breaks the null→non-null edge detection used for the redirect.
    usePvpStore.setState({ gameState: null, rawGameState: null });

    async function loadRoom() {
      try {
        const { data: roomData, error: roomErr } = await supabase
          .from('rooms')
          .select('*')
          .eq('code', code)
          .single();

        if (roomErr || !roomData) { setError('房间不存在'); setLoading(false); return; }

        if (roomData.status === 'playing') {
          router.replace(`/pvp/game/${code}`);
          return;
        }

        const roomObj = roomData as Room;
        setRoom(roomObj);
        setSettings(roomObj.settings);
        setMyPlayerId(player!.id);

        const playerList = await getRoomPlayers(roomObj.id);
        setPlayers(playerList);

        const amHost = roomObj.host_id === player!.id;
        usePvpStore.setState({ isHost: amHost });

        subscribeRoom(code, player!.id);

        // Non-host: broadcast arrival so host's player list updates in real-time
        if (!amHost) {
          // Small delay to ensure channel subscription is ready
          setTimeout(() => {
            const myPlayer = playerList.find(p => p.player_id === player!.id);
            usePvpStore.getState().sendMessage({
              type: 'player-joined',
              player: {
                id: player!.id,
                studentId: player!.studentId,
                bigFive: player!.bigFive,
              },
              seatIndex: myPlayer?.seat_index ?? playerList.length - 1,
            });
          }, 300);
        }
      } catch (e: any) {
        setError(e.message ?? '加载失败');
      } finally {
        setLoading(false);
      }
    }

    loadRoom();
    return () => { /* unsubscribe handled on nav */ };
  }, [code, player]);

  // Sync BigFive to room channel when updated
  useEffect(() => {
    if (!bigFiveScores || !player) return;
    sendMessage({ type: 'big-five-updated', playerId: player.id, bigFive: bigFiveScores });
  }, [bigFiveScores]);

  // Listen for game-start redirect. Only trigger on a fresh null → non-null
  // transition so persisted state from a previous session can't bounce us
  // into a stale game URL.
  useEffect(() => {
    let prev = usePvpStore.getState().gameState;
    return usePvpStore.subscribe(state => {
      if (state.gameState && !prev) {
        router.replace(`/pvp/game/${code}`);
      }
      prev = state.gameState;
    });
  }, [code]);

  // Subscribe to DB changes for room status (game start redirect for non-host)
  useEffect(() => {
    if (!room) return;
    const sub = supabase
      .channel(`room-status-${room.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${room.id}`,
      }, (payload: any) => {
        if (payload.new?.status === 'playing') {
          router.replace(`/pvp/game/${code}`);
        }
      })
      .subscribe();

    return () => { sub.unsubscribe(); };
  }, [room?.id]);

  const handleSettingsChange = useCallback((newSettings: RoomSettings) => {
    setSettings(newSettings);
    sendMessage({ type: 'settings-changed', settings: newSettings });
    if (room) {
      supabase.from('rooms').update({ settings: newSettings }).eq('id', room.id);
    }
  }, [room, sendMessage]);

  const handleKick = useCallback(async (playerId: string) => {
    if (!room) return;
    await kickPlayer(room.id, playerId);
    sendMessage({ type: 'player-kicked', playerId });
    setPlayers(players.filter(p => p.player_id !== playerId));
  }, [room, players]);

  const handleDissolve = useCallback(async () => {
    if (!room) return;
    sendMessage({ type: 'room-dissolved' });
    await dissolveRoom(room.id);
    unsubscribeRoom();
    router.replace('/pvp');
  }, [room]);

  const handleLeave = useCallback(async () => {
    if (!player || !room) return;
    sendMessage({ type: 'player-left', playerId: player.id });
    try {
      await leaveRoom(room.id, player.id);
    } catch {
      // Even if DB delete fails, exit locally to avoid getting stuck.
    }
    unsubscribeRoom();
    router.replace('/pvp');
  }, [player, room]);

  const handleStart = useCallback(async () => {
    if (!room || players.length < 2) return;
    setStarting(true);
    try {
      startGame();
      router.replace(`/pvp/game/${code}`);
    } finally {
      setStarting(false);
    }
  }, [room, players, code]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-gray-400 animate-pulse">加载房间…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center flex-col gap-4">
        <p className="text-red-400">{error}</p>
        <button onClick={() => router.replace('/pvp')} className="text-purple-400 underline">返回大厅</button>
      </div>
    );
  }

  const maxPlayers = settings.maxPlayers;
  const canStart = isHost && players.length >= 2;

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-8">
      <div className="w-full max-w-lg space-y-5">

        {/* Room code */}
        <div className="text-center space-y-1">
          <p className="text-xs text-gray-500 uppercase tracking-widest">房间码</p>
          <div className="text-5xl font-black tracking-widest text-purple-400">{code}</div>
          <p className="text-xs text-gray-500">分享给朋友，一起加入</p>
        </div>

        {/* Player slots */}
        <div className="rounded-2xl bg-gray-900 border border-gray-800 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-400">玩家 {players.length}/{maxPlayers}</h2>
            {!isHost && (
              <button onClick={handleLeave} className="text-xs text-red-400 hover:text-red-300">
                离开房间
              </button>
            )}
          </div>

          <div className="space-y-2">
            {Array.from({ length: maxPlayers }).map((_, i) => {
              const p = players.find(pl => pl.seat_index === i);
              const isMe = p?.player_id === player?.id;
              const isRoomHost = p?.player_id === room?.host_id;

              return (
                <motion.div
                  key={i}
                  layout
                  className={`flex items-center gap-3 rounded-xl p-3 border ${
                    p
                      ? isMe
                        ? 'bg-purple-900/30 border-purple-700'
                        : 'bg-gray-800 border-gray-700'
                      : 'bg-gray-900 border-gray-800 border-dashed'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-bold text-gray-400">
                    {p ? '🧑' : i + 1}
                  </div>
                  {p ? (
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-sm font-medium truncate">
                            {p.student_id ?? '未知玩家'}
                          </span>
                          {isRoomHost && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded">房主</span>}
                          {isMe && <span className="text-xs bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">我</span>}
                        </div>
                        <div className="text-xs text-gray-500">
                          {p.big_five ? '已完成测评 ✓' : '未完成测评'}
                        </div>
                      </div>
                      {isHost && !isMe && (
                        <button
                          onClick={() => handleKick(p.player_id)}
                          className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded"
                        >
                          踢出
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-600 text-sm">等待加入…</span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Settings (host only) */}
        {isHost && (
          <div className="rounded-2xl bg-gray-900 border border-gray-800 p-4 space-y-3">
            <h2 className="text-sm font-semibold text-gray-400">房间设置</h2>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">最多玩家数</label>
              <div className="flex gap-2">
                {[3, 4].map(n => (
                  <button
                    key={n}
                    onClick={() => handleSettingsChange({ ...settings, maxPlayers: n })}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      settings.maxPlayers === n
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-400'
                    }`}
                  >
                    {n} 人
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">游戏轮数</label>
              <div className="flex gap-2">
                {[0, 3, 5, 10].map(n => (
                  <button
                    key={n}
                    onClick={() => handleSettingsChange({ ...settings, totalRounds: n })}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                      settings.totalRounds === n
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'bg-gray-800 border-gray-700 text-gray-400'
                    }`}
                  >
                    {n === 0 ? '∞' : n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Start / waiting */}
        <div className="space-y-2">
          {isHost ? (
            <button
              onClick={handleStart}
              disabled={!canStart || starting}
              className="w-full py-3.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-lg transition-colors"
            >
              {starting ? '启动中…' : canStart ? '开始游戏 🚀' : `等待玩家 (${players.length}/2)`}
            </button>
          ) : (
            <div className="text-center text-gray-500 text-sm py-3 animate-pulse">
              等待房主开始游戏…
            </div>
          )}

          {isHost && (
            <button
              onClick={handleDissolve}
              className="w-full py-2 rounded-xl border border-red-900 text-red-400 hover:bg-red-900/20 text-sm transition-colors"
            >
              解散房间
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
