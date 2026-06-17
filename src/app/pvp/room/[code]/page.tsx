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
import { useLocaleStore, STRINGS } from '@/lib/i18n';
import { useHydrated } from '@/stores/useHydration';

export default function RoomWaitPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;
  const hydrated = useHydrated();
  const localeRaw = useLocaleStore((s) => s.locale);
  const locale = hydrated ? localeRaw : 'zh';
  const t = STRINGS[locale].pvpRoom;

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
    // 不在這裏無條件清 gameState — 否則當 status 已經是 'playing'（玩家
    // 通過 navigation 短暫經過 room page 再跳 game page）時會清掉持久化
    // 的遊戲狀態，導致 game page 看到 gameState=null → 4 秒後誤判
    // 「房主似乎不在線」。改到 status === 'waiting' 分支下才清（再來
    // 一局的真實場景）。

    async function loadRoom() {
      try {
        const { data: roomData, error: roomErr } = await supabase
          .from('rooms')
          .select('*')
          .eq('code', code)
          .single();

        if (roomErr || !roomData) { setError(t.roomNotExist); setLoading(false); return; }

        if (roomData.status === 'playing') {
          // 遊戲進行中：保留 gameState（持久化的舊快照），讓 game page
          // 渲染時有兜底數據；之後 host 會通過 state-request 推最新狀態。
          router.replace(`/pvp/game/${code}`);
          return;
        }

        // status === 'waiting' — 此時才安全清舊 gameState 準備新一局。
        usePvpStore.setState({ gameState: null, rawGameState: null });

        const roomObj = roomData as Room;
        setRoom(roomObj);
        setSettings(roomObj.settings);
        setMyPlayerId(player!.id);

        const playerList = await getRoomPlayers(roomObj.id);
        // players 表的 SELECT 已被 RLS 锁（隐私）→ getRoomPlayers 的 join 拿不到
        // 自己这一行的 student_id/big_five（恒为 null），自己又收不到自己的 broadcast
        // (self:false)。用本地已知信息补上自己这一行，否则 host 开局会用 null/随机分数
        // 建局并存档（污染数据）。其他玩家信息靠 broadcast(player-joined/big-five-updated) 收齐。
        const patchedList = playerList.map((p) =>
          p.player_id === player!.id
            ? {
                ...p,
                student_id: player!.studentId,
                big_five: player!.bigFive ?? bigFiveScores ?? null,
                avatar: player!.avatar,
              }
            : p
        );
        setPlayers(patchedList);

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
                avatar: player!.avatar,
              },
              seatIndex: myPlayer?.seat_index ?? playerList.length - 1,
            });
          }, 300);
        }
      } catch (e: any) {
        setError(e.message ?? t.loadFailed);
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
        <p className="psy-serif animate-pulse text-[var(--psy-muted)]">{t.loadingRoom}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <p className="text-[var(--psy-danger)]">{error}</p>
        <button onClick={() => router.replace('/pvp')} className="psy-btn psy-btn-ghost px-6 py-2 text-sm">
          {t.backLobby}
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
          <p className="text-sm text-[var(--psy-muted)]">{t.shareHint}</p>
          <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-[radial-gradient(circle,rgba(200,155,93,0.18),transparent_68%)]" />
        </div>

        <section className="psy-panel psy-etched space-y-4 rounded-[1.6rem] p-6">
          <div className="flex items-center justify-between">
            <p className="psy-eyebrow text-[10px]">{t.playersLabel} · {players.length} / {maxPlayers}</p>
            {!isHost && (
              <button
                onClick={handleLeave}
                className="text-xs text-[var(--psy-danger)] underline decoration-[rgba(220,106,79,0.32)] underline-offset-4 transition hover:opacity-80"
              >
                {t.leaveRoom}
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
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-lg leading-none"
                    style={{
                      borderColor: 'rgba(200,155,93,0.22)',
                      background: 'rgba(200,155,93,0.08)',
                      color: 'var(--psy-ink-soft)',
                    }}
                  >
                    {p ? (p.avatar ?? '🧑') : i + 1}
                  </div>
                  {p ? (
                    <>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="psy-serif truncate text-sm text-[var(--psy-ink)]">
                            {p.student_id ?? p.player_id ?? t.unknownPlayer}
                          </span>
                          {isRoomHost && (
                            <span className="rounded-full border border-[rgba(200,155,93,0.32)] bg-[var(--psy-accent-soft)] px-2 py-0.5 text-[10px] text-[var(--psy-accent)]">
                              {t.host}
                            </span>
                          )}
                          {isMe && (
                            <span className="rounded-full border border-[rgba(200,155,93,0.32)] bg-[var(--psy-accent-soft)] px-2 py-0.5 text-[10px] text-[var(--psy-accent)]">
                              {t.me}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[var(--psy-muted)]">
                          {p.big_five ? t.assessedTrue : t.assessedFalse}
                        </div>
                      </div>
                      {isHost && !isMe && (
                        <button
                          onClick={() => handleKick(p.player_id)}
                          className="text-xs text-[var(--psy-danger)] underline decoration-[rgba(220,106,79,0.32)] underline-offset-4 transition hover:opacity-80"
                        >
                          {t.kick}
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="text-sm text-[var(--psy-muted)]">{t.waitingJoin}</span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </section>

        {isHost && (
          <section className="psy-panel psy-etched space-y-5 rounded-[1.6rem] p-6">
            <p className="psy-eyebrow text-[10px]">{t.roomSettings}</p>

            <div className="space-y-2">
              <p className="text-xs text-[var(--psy-muted)]">{t.maxPlayers}</p>
              <div className="grid grid-cols-3 gap-2">
                {[2, 3, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => handleSettingsChange({ ...settings, maxPlayers: n })}
                    className={`psy-tile psy-serif text-sm ${settings.maxPlayers === n ? 'is-active' : ''}`}
                  >
                    {n}{t.playerUnit}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-[var(--psy-muted)]">{t.rounds}</p>
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
              {starting ? t.starting : canStart ? t.startGame : `${t.waitingPlayersPrefix}${players.length}${t.waitingPlayersSuffix}`}
            </button>
          ) : (
            <div className="psy-serif animate-pulse rounded-[1.4rem] border border-dashed border-[rgba(200,155,93,0.18)] bg-[rgba(255,255,255,0.02)] py-4 text-center text-sm text-[var(--psy-muted)]">
              {t.waitingHost}
            </div>
          )}

          {isHost && (
            <button
              onClick={handleDissolve}
              className="psy-btn psy-btn-danger w-full py-2.5 text-sm"
            >
              {t.dissolveRoom}
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
