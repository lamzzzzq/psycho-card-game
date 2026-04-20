'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { usePlayerStore } from '@/stores/usePlayerStore';
import { useAssessmentStore } from '@/stores/useAssessmentStore';
import { useHydrated } from '@/stores/useHydration';
import { usePvpStore } from '@/stores/usePvpStore';
import { upsertPlayer, createRoom, joinRoom, leaveRoom, leaveAllRooms } from '@/lib/room-api';
import { supabase } from '@/lib/supabase';
import { PlayerInfo } from '@/types/pvp';
import { BigFiveScores, DIMENSIONS } from '@/types';
import { DIMENSION_META } from '@/data/dimensions';

type Tab = 'create' | 'join';

export default function PvpLobbyPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { player, setPlayer } = usePlayerStore();
  const { bigFiveScores, setManualScores } = useAssessmentStore();

  const [tab, setTab] = useState<Tab>('create');
  const [studentId, setStudentId] = useState(player?.studentId ?? '');
  const [studentIdConfirm, setStudentIdConfirm] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(3);
  const [totalRounds, setTotalRounds] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualScoresInput, setManualScoresInput] = useState<BigFiveScores>({ O: 3.0, C: 3.0, E: 3.0, A: 3.0, N: 3.0 });
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({ O: '3', C: '3', E: '3', A: '3', N: '3' });
  const [activeRoom, setActiveRoom] = useState<{ code: string; status: string; roomId: string } | null>(null);

  useEffect(() => {
    if (!player) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('room_players')
        .select('room_id, rooms!inner(id, code, status)')
        .eq('player_id', player.id);
      if (cancelled || error) return;
      const rows = (data ?? []) as unknown as Array<{
        rooms: { id: string; code: string; status: string } | { id: string; code: string; status: string }[] | null;
      }>;
      const pickRoom = (r: typeof rows[number]) => (Array.isArray(r.rooms) ? r.rooms[0] : r.rooms);
      const active = rows
        .map(pickRoom)
        .find((room) => room && (room.status === 'waiting' || room.status === 'playing'));
      if (!active) {
        usePvpStore.getState().reset();
        return;
      }
      if (active.status === 'waiting') {
        router.replace(`/pvp/room/${active.code}`);
        return;
      }
      setActiveRoom({ code: active.code, status: active.status, roomId: active.id });
    })();
    return () => {
      cancelled = true;
    };
  }, [player, router]);

  function resumeActiveRoom() {
    if (!activeRoom) return;
    router.replace(activeRoom.status === 'playing' ? `/pvp/game/${activeRoom.code}` : `/pvp/room/${activeRoom.code}`);
  }

  async function leaveActiveRoom() {
    if (!activeRoom || !player) return;
    try {
      await leaveRoom(activeRoom.roomId, player.id);
    } catch {
      // ignore; still clear local state so the user isn't trapped
    }
    usePvpStore.getState().reset();
    setActiveRoom(null);
  }

  if (!hydrated) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="psy-serif text-[var(--psy-muted)]">加载中…</p>
      </div>
    );
  }

  async function ensurePlayer() {
    const sid = studentId.trim();
    const info: PlayerInfo = { id: sid, studentId: sid, bigFive: bigFiveScores };
    await upsertPlayer(info);
    setPlayer(info);
    return info;
  }

  async function handleCreate() {
    if (!studentId.trim()) { setError('请输入学号'); return; }
    if (studentId.trim() !== studentIdConfirm.trim()) { setError('两次输入的学号不一致'); return; }
    setLoading(true);
    setError('');
    try {
      const info = await ensurePlayer();
      await leaveAllRooms(info.id);
      usePvpStore.getState().reset();
      const room = await createRoom(info.id, { maxPlayers, totalRounds });
      router.push(`/pvp/room/${room.code}`);
    } catch (e: any) {
      setError(e.message ?? '创建失败');
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin() {
    if (!studentId.trim()) { setError('请输入学号'); return; }
    if (studentId.trim() !== studentIdConfirm.trim()) { setError('两次输入的学号不一致'); return; }
    if (joinCode.length !== 4) { setError('请输入 4 位房间码'); return; }
    setLoading(true);
    setError('');
    try {
      const info = await ensurePlayer();
      await leaveAllRooms(info.id);
      usePvpStore.getState().reset();
      await joinRoom(joinCode, info.id);
      router.push(`/pvp/room/${joinCode}`);
    } catch (e: any) {
      setError(e.message ?? '加入失败');
    } finally {
      setLoading(false);
    }
  }

  const idMismatch = studentIdConfirm.length > 0 && studentIdConfirm !== studentId;

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl space-y-8"
      >
        <div className="space-y-3">
          <button
            onClick={() => router.push('/')}
            className="text-sm text-[var(--psy-muted)] underline decoration-[rgba(200,155,93,0.28)] underline-offset-4 transition hover:text-[var(--psy-ink-soft)]"
          >
            ← 返回首页
          </button>
          <p className="psy-eyebrow">DUEL CHAMBER</p>
          <h1 className="psy-serif text-5xl leading-none text-[var(--psy-ink)] sm:text-6xl">联机对战</h1>
          <p className="text-base leading-7 text-[var(--psy-ink-soft)]">
            创建房间或输入房间码加入，与真实玩家同桌博弈。
          </p>
        </div>

        {activeRoom && (
          <div
            className="rounded-[1.4rem] border p-5 space-y-3"
            style={{ borderColor: 'var(--psy-border-strong)', background: 'var(--psy-accent-soft)' }}
          >
            <div className="flex items-center gap-2 text-sm text-[var(--psy-ink)]">
              <span className="psy-eyebrow text-[10px] text-[var(--psy-accent)]">RESUME</span>
              <span>
                你还在房间{' '}
                <span className="psy-serif font-medium text-[var(--psy-accent)]">{activeRoom.code}</span> 中
                {activeRoom.status === 'playing' ? '（游戏进行中）' : '（等待中）'}
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={resumeActiveRoom} className="psy-btn psy-btn-accent flex-1 px-4 py-2 text-sm font-medium">
                返回房间
              </button>
              <button onClick={leaveActiveRoom} className="psy-btn psy-btn-ghost flex-1 px-4 py-2 text-sm">
                离开房间
              </button>
            </div>
          </div>
        )}

        <section className="psy-panel psy-etched space-y-4 rounded-[1.6rem] p-6">
          <p className="psy-eyebrow text-[10px]">玩家信息</p>
          <div className="space-y-3">
            <input
              className="psy-input"
              placeholder="请输入学号"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              maxLength={20}
            />
            <input
              className={`psy-input ${idMismatch ? 'is-error' : ''}`}
              placeholder="再次输入学号确认"
              value={studentIdConfirm}
              onChange={(e) => setStudentIdConfirm(e.target.value)}
              maxLength={20}
            />
            {idMismatch && (
              <p className="text-xs text-[var(--psy-danger)]">两次输入的学号不一致</p>
            )}
          </div>

          {bigFiveScores ? (
            <div className="psy-chip">
              <span className="text-[var(--psy-success)]">✓</span>
              <span>已完成人格测评</span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="psy-chip" style={{ borderColor: 'rgba(220,106,79,0.32)', background: 'var(--psy-danger-soft)', color: 'var(--psy-ink)' }}>
                未完成测评 · 将使用随机人格数据
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => router.push('/assessment')} className="psy-btn psy-btn-accent px-3 py-2 text-xs">
                  完整测评（60 题）
                </button>
                <button onClick={() => setShowManualInput(!showManualInput)} className="psy-btn psy-btn-ghost px-3 py-2 text-xs">
                  手动输入分数
                </button>
              </div>
              {showManualInput && (
                <div className="space-y-3 rounded-[1.2rem] border border-[rgba(200,155,93,0.16)] bg-[rgba(255,255,255,0.02)] p-4">
                  <p className="psy-eyebrow text-[10px]">Big Five 分数 · 1.0 – 5.0</p>
                  <div className="space-y-2">
                    {DIMENSIONS.map((d) => {
                      const meta = DIMENSION_META[d];
                      return (
                        <div key={d} className="flex items-center gap-3">
                          <span className="psy-serif w-14 shrink-0 text-xs" style={{ color: meta.colorHex }}>{meta.name}</span>
                          <input
                            type="number"
                            min="1"
                            max="5"
                            step="0.1"
                            value={rawInputs[d]}
                            onChange={(e) => {
                              const raw = e.target.value;
                              setRawInputs((prev) => ({ ...prev, [d]: raw }));
                              const val = parseFloat(raw);
                              if (!isNaN(val)) setManualScoresInput((prev) => ({ ...prev, [d]: val }));
                            }}
                            onBlur={() => {
                              const val = parseFloat(rawInputs[d]);
                              const clamped = isNaN(val) ? 3 : Math.min(5, Math.max(1, val));
                              setManualScoresInput((prev) => ({ ...prev, [d]: clamped }));
                              setRawInputs((prev) => ({ ...prev, [d]: String(clamped) }));
                            }}
                            className="psy-input w-16 px-2 py-1 text-center text-xs tabular-nums"
                          />
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.04)]">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${((manualScoresInput[d] - 1) / 4) * 100}%`, backgroundColor: meta.colorHex }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => {
                      setManualScores(manualScoresInput);
                      setShowManualInput(false);
                    }}
                    className="psy-btn psy-btn-accent w-full py-2 text-xs font-medium"
                  >
                    确认分数
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        <div className="grid grid-cols-2 gap-2 rounded-full border border-[rgba(200,155,93,0.18)] bg-[rgba(255,255,255,0.02)] p-1">
          {(['create', 'join'] as Tab[]).map((t) => {
            const active = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`psy-serif rounded-full px-4 py-2 text-sm transition ${
                  active
                    ? 'bg-[linear-gradient(180deg,rgba(64,46,27,0.92),rgba(27,22,17,0.96))] text-[var(--psy-ink)] shadow-[0_10px_24px_rgba(72,49,18,0.24)]'
                    : 'text-[var(--psy-muted)] hover:text-[var(--psy-ink-soft)]'
                }`}
              >
                {t === 'create' ? '创建房间' : '加入房间'}
              </button>
            );
          })}
        </div>

        {tab === 'create' ? (
          <section className="psy-panel psy-etched space-y-5 rounded-[1.6rem] p-6">
            <div className="space-y-2">
              <p className="psy-eyebrow text-[10px]">最多玩家数</p>
              <div className="grid grid-cols-2 gap-2">
                {[3, 4].map((n) => (
                  <button
                    key={n}
                    onClick={() => setMaxPlayers(n)}
                    className={`psy-tile psy-serif text-sm ${maxPlayers === n ? 'is-active' : ''}`}
                  >
                    {n} 人
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="psy-eyebrow text-[10px]">游戏轮数（0 = 无限）</p>
              <div className="grid grid-cols-4 gap-2">
                {[0, 3, 5, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => setTotalRounds(n)}
                    className={`psy-tile psy-serif text-sm ${totalRounds === n ? 'is-active' : ''}`}
                  >
                    {n === 0 ? '∞' : n}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={loading}
              className="psy-btn psy-btn-accent psy-serif w-full py-3 text-base font-semibold"
            >
              {loading ? '创建中…' : '创建房间'}
            </button>
          </section>
        ) : (
          <section className="psy-panel psy-etched space-y-5 rounded-[1.6rem] p-6">
            <div className="space-y-2">
              <p className="psy-eyebrow text-[10px]">4 位房间码</p>
              <input
                className="psy-input psy-serif text-center text-3xl font-medium tabular-nums tracking-[0.4em]"
                placeholder="0000"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
                maxLength={4}
                style={{ paddingTop: '0.85rem', paddingBottom: '0.85rem' }}
              />
            </div>
            <button
              onClick={handleJoin}
              disabled={loading}
              className="psy-btn psy-btn-accent psy-serif w-full py-3 text-base font-semibold"
            >
              {loading ? '加入中…' : '加入房间'}
            </button>
          </section>
        )}

        {error && <p className="text-center text-sm text-[var(--psy-danger)]">{error}</p>}
      </motion.div>
    </div>
  );
}
