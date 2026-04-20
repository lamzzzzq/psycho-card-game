'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useAssessmentStore } from '@/stores/useAssessmentStore';
import { usePvpStore } from '@/stores/usePvpStore';
import { supabase } from '@/lib/supabase';
import { getRoomPlayers, kickPlayer, dissolveRoom, leaveRoom } from '@/lib/room-api';
import { Room, RoomSettings } from '@/types/pvp';

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

  useEffect(() => {
    if (!player) { router.replace('/pvp'); return; }
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

        if (!amHost) {
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
  }, [code, player]);

  useEffect(() => {
    if (!bigFiveScores || !player) return;
    sendMessage({ type: 'big-five-updated', playerId: player.id, bigFive: bigFiveScores });
  }, [bigFiveScores]);

  useEffect(() => {
    let prev = usePvpStore.getState().gameState;
    return usePvpStore.subscribe(state => {
      if (state.gameState && !prev) {
        router.replace(`/pvp/game/${code}`);
      }
      prev = state.gameState;
    });
  }, [code]);

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
        <p className="psy-serif animate-pulse text-[var(--psy-muted)]">加载房间…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-[var(--psy-danger)]">{error}</p>
        <button onClick={() => router.replace('/pvp')} className="psy-btn psy-btn-ghost px-6 py-2 text-sm">
          返回大厅
        </button>
      </div>
    );
  }

  const maxPlayers = settings.maxPlayers;
  const canStart = isHost && players.length >= 2;

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl space-y-8"
      >
        <div className="psy-panel psy-etched relative space-y-3 rounded-[2rem] px-8 py-10 text-center">
          <p className="psy-eyebrow">ROOM CODE</p>
          <div className="psy-serif text-7xl font-medium tracking-[0.32em] text-[var(--psy-accent)] tabular-nums sm:text-8xl">
            {code}
          </div>
          <p className="text-sm text-[var(--psy-muted)]">分享给朋友，一起加入这局心理博弈。</p>
          <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-[radial-gradient(circle,rgba(200,155,93,0.18),transparent_68%)]" />
        </div>

        <section className="psy-panel psy-etched space-y-4 rounded-[1.6rem] p-6">
          <div className="flex items-center justify-between">
            <p className="psy-eyebrow text-[10px]">玩家 · {players.length} / {maxPlayers}</p>
            {!isHost && (
              <button
                onClick={handleLeave}
                className="text-xs text-[var(--psy-danger)] underline decoration-[rgba(220,106,79,0.32)] underline-offset-4 transition hover:opacity-80"
              >
                离开房间
              </button>
            )}
          </div>

          <div className="space-y-2">
            {Array.from({ length: maxPlayers }).map((_, i) => {
              const p = players.find((pl) => pl.seat_index === i);
              const isMe = p?.player_id === player?.id;
              const isRoomHost = p?.player_id === room?.host_id;
              const occupied = !!p;

              return (
                <motion.div
                  key={i}
                  layout
                  className="flex items-center gap-3 rounded-[1.2rem] border p-3"
                  style={{
                    borderColor: occupied
                      ? isMe
                        ? 'var(--psy-border-strong)'
                        : 'rgba(200,155,93,0.16)'
                      : 'rgba(200,155,93,0.10)',
                    background: occupied
                      ? isMe
                        ? 'var(--psy-accent-soft)'
                        : 'rgba(255,255,255,0.025)'
                      : 'transparent',
                    borderStyle: occupied ? 'solid' : 'dashed',
                  }}
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm"
                    style={{
                      borderColor: 'rgba(200,155,93,0.22)',
                      background: 'rgba(200,155,93,0.08)',
                      color: 'var(--psy-ink-soft)',
                    }}
                  >
                    {p ? '🧑' : i + 1}
                  </div>
                  {p ? (
                    <>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="psy-serif truncate text-sm text-[var(--psy-ink)]">
                            {p.student_id ?? '未知玩家'}
                          </span>
                          {isRoomHost && (
                            <span className="rounded-full border border-[rgba(200,155,93,0.32)] bg-[var(--psy-accent-soft)] px-2 py-0.5 text-[10px] text-[var(--psy-accent)]">
                              房主
                            </span>
                          )}
                          {isMe && (
                            <span className="rounded-full border border-[rgba(200,155,93,0.32)] bg-[var(--psy-accent-soft)] px-2 py-0.5 text-[10px] text-[var(--psy-accent)]">
                              我
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[var(--psy-muted)]">
                          {p.big_five ? '已完成测评 ✓' : '未完成测评'}
                        </div>
                      </div>
                      {isHost && !isMe && (
                        <button
                          onClick={() => handleKick(p.player_id)}
                          className="text-xs text-[var(--psy-danger)] underline decoration-[rgba(220,106,79,0.32)] underline-offset-4 transition hover:opacity-80"
                        >
                          踢出
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="text-sm text-[var(--psy-muted)]">等待加入…</span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </section>

        {isHost && (
          <section className="psy-panel psy-etched space-y-5 rounded-[1.6rem] p-6">
            <p className="psy-eyebrow text-[10px]">房间设置</p>

            <div className="space-y-2">
              <p className="text-xs text-[var(--psy-muted)]">最多玩家数</p>
              <div className="grid grid-cols-2 gap-2">
                {[3, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => handleSettingsChange({ ...settings, maxPlayers: n })}
                    className={`psy-tile psy-serif text-sm ${settings.maxPlayers === n ? 'is-active' : ''}`}
                  >
                    {n} 人
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-[var(--psy-muted)]">游戏轮数（0 = 无限）</p>
              <div className="grid grid-cols-4 gap-2">
                {[0, 3, 5, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => handleSettingsChange({ ...settings, totalRounds: n })}
                    className={`psy-tile psy-serif text-sm ${settings.totalRounds === n ? 'is-active' : ''}`}
                  >
                    {n === 0 ? '∞' : n}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        <div className="space-y-3">
          {isHost ? (
            <button
              onClick={handleStart}
              disabled={!canStart || starting}
              className="psy-btn psy-btn-accent psy-serif w-full py-4 text-lg font-semibold"
            >
              {starting ? '启动中…' : canStart ? '开始游戏' : `等待玩家（${players.length}/2）`}
            </button>
          ) : (
            <div className="psy-serif animate-pulse rounded-[1.4rem] border border-dashed border-[rgba(200,155,93,0.18)] bg-[rgba(255,255,255,0.02)] py-4 text-center text-sm text-[var(--psy-muted)]">
              等待房主开始游戏…
            </div>
          )}

          {isHost && (
            <button
              onClick={handleDissolve}
              className="psy-btn psy-btn-danger w-full py-2.5 text-sm"
            >
              解散房间
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
