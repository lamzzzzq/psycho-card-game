'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

interface PlayerStat {
  studentId: string;
  gamesPlayed: number;
  wins: number;
  winRate: string;
}

interface GameRecord {
  id: string;
  room_id: string;
  winner_id: string;
  rankings: { playerId: string; declaredCount: number; remainingCards: number }[];
  rounds_played: number;
  created_at: string;
}

export default function StatsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [records, setRecords] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'summary' | 'detail'>('summary');

  useEffect(() => {
    async function fetchStats() {
      try {
        const { data, error } = await supabase
          .from('game_results')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        const results = (data ?? []) as GameRecord[];
        setRecords(results);

        const map = new Map<string, { played: number; wins: number }>();
        for (const r of results) {
          if (Array.isArray(r.rankings)) {
            for (const p of r.rankings) {
              const entry = map.get(p.playerId) ?? { played: 0, wins: 0 };
              entry.played++;
              map.set(p.playerId, entry);
            }
          }
          if (r.winner_id) {
            const entry = map.get(r.winner_id) ?? { played: 0, wins: 0 };
            entry.wins++;
            map.set(r.winner_id, entry);
          }
        }

        const statsList: PlayerStat[] = Array.from(map.entries())
          .map(([studentId, { played, wins }]) => ({
            studentId,
            gamesPlayed: played,
            wins,
            winRate: played > 0 ? `${Math.round((wins / played) * 100)}%` : '0%',
          }))
          .sort((a, b) => b.gamesPlayed - a.gamesPlayed);

        setStats(statsList);
      } catch (e) {
        console.error('Failed to fetch stats:', e);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="psy-serif animate-pulse text-[var(--psy-muted)]">加载统计数据…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl space-y-8"
      >
        <div className="space-y-3">
          <button
            onClick={() => router.push('/')}
            className="text-sm text-[var(--psy-muted)] underline decoration-[rgba(200,155,93,0.28)] underline-offset-4 transition hover:text-[var(--psy-ink-soft)]"
          >
            ← 返回首页
          </button>
          <p className="psy-eyebrow">DECK ARCHIVES</p>
          <h1 className="psy-serif text-5xl leading-none text-[var(--psy-ink)] sm:text-6xl">数据统计</h1>
          <p className="text-base leading-7 text-[var(--psy-ink-soft)]">参与者出勤与对战记录的归档卷宗。</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="psy-chip">{stats.length} 名参与者</span>
            <span className="psy-chip">{records.length} 场对局</span>
          </div>
        </div>

        <div className="psy-panel psy-etched space-y-6 rounded-[2rem] p-6 sm:p-8">
          <div className="grid grid-cols-2 gap-2 rounded-full border border-[rgba(200,155,93,0.18)] bg-[rgba(255,255,255,0.02)] p-1">
            {(['summary', 'detail'] as const).map((v) => {
              const active = view === v;
              return (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`psy-serif rounded-full px-4 py-2 text-sm transition ${
                    active
                      ? 'bg-[linear-gradient(180deg,rgba(64,46,27,0.92),rgba(27,22,17,0.96))] text-[var(--psy-ink)] shadow-[0_10px_24px_rgba(72,49,18,0.24)]'
                      : 'text-[var(--psy-muted)] hover:text-[var(--psy-ink-soft)]'
                  }`}
                >
                  {v === 'summary' ? '汇总统计' : '对局明细'}
                </button>
              );
            })}
          </div>

          {view === 'summary' ? (
            stats.length === 0 ? (
              <div className="rounded-[1.4rem] border border-[rgba(200,155,93,0.14)] bg-[rgba(255,255,255,0.02)] px-6 py-12 text-center text-sm text-[var(--psy-muted)]">
                暂无对局数据
              </div>
            ) : (
              <div className="overflow-hidden rounded-[1.4rem] border border-[rgba(200,155,93,0.18)]">
                <div className="psy-eyebrow grid grid-cols-[1.4fr_0.9fr_0.9fr_0.9fr] gap-px border-b border-[rgba(200,155,93,0.18)] bg-[rgba(200,155,93,0.05)] px-3 py-3 text-[10px] sm:grid-cols-[1.5fr_1fr_1fr_1fr] sm:px-5">
                  <div>学号</div>
                  <div className="text-center">
                    <span className="sm:hidden">场次</span>
                    <span className="hidden sm:inline">参加场次</span>
                  </div>
                  <div className="text-center">
                    <span className="sm:hidden">胜场</span>
                    <span className="hidden sm:inline">胜利场次</span>
                  </div>
                  <div className="text-center">胜率</div>
                </div>
                {stats.map((s, i) => (
                  <div
                    key={s.studentId}
                    className="grid grid-cols-[1.4fr_0.9fr_0.9fr_0.9fr] items-center gap-px border-t border-[rgba(200,155,93,0.08)] px-3 py-3 text-sm transition hover:bg-[rgba(200,155,93,0.04)] sm:grid-cols-[1.5fr_1fr_1fr_1fr] sm:px-5"
                    style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}
                  >
                    <div className="font-mono text-[var(--psy-ink)] tabular-nums">{s.studentId}</div>
                    <div className="text-center font-mono text-[var(--psy-ink-soft)] tabular-nums">{s.gamesPlayed}</div>
                    <div className="text-center font-mono tabular-nums">
                      <span className={s.wins > 0 ? 'font-medium text-[var(--psy-success)]' : 'text-[var(--psy-muted)]'}>
                        {s.wins}
                      </span>
                    </div>
                    <div className="text-center font-mono tabular-nums">
                      <span className={parseInt(s.winRate) >= 50 ? 'text-[var(--psy-success)]' : 'text-[var(--psy-ink-soft)]'}>
                        {s.winRate}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-3">
              {records.length === 0 ? (
                <div className="rounded-[1.4rem] border border-[rgba(200,155,93,0.14)] bg-[rgba(255,255,255,0.02)] px-6 py-12 text-center text-sm text-[var(--psy-muted)]">
                  暂无对局记录
                </div>
              ) : (
                records.map((r) => (
                  <div
                    key={r.id}
                    className="space-y-3 rounded-[1.4rem] border border-[rgba(200,155,93,0.16)] bg-[rgba(255,255,255,0.02)] p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--psy-muted)]">
                        {new Date(r.created_at).toLocaleString('zh-CN')}
                      </span>
                      <span className="psy-eyebrow text-[10px] text-[var(--psy-muted)]">{r.rounds_played} 轮</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(r.rankings) &&
                        r.rankings.map((p) => {
                          const isWinner = p.playerId === r.winner_id;
                          return (
                            <div
                              key={p.playerId}
                              className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm"
                              style={{
                                borderColor: isWinner ? 'var(--psy-border-strong)' : 'rgba(200,155,93,0.18)',
                                background: isWinner ? 'var(--psy-accent-soft)' : 'rgba(255,255,255,0.025)',
                                color: isWinner ? 'var(--psy-accent)' : 'var(--psy-ink-soft)',
                              }}
                            >
                              {isWinner && <span>🏆</span>}
                              <span className="font-mono tabular-nums">{p.playerId}</span>
                              <span className="text-xs text-[var(--psy-muted)]">
                                申报{p.declaredCount}组 · 剩{p.remainingCards}张
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
