'use client';

import { useEffect, useState } from 'react';
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

        // Aggregate per student
        const map = new Map<string, { played: number; wins: number }>();

        for (const r of results) {
          // Count participation from rankings
          if (Array.isArray(r.rankings)) {
            for (const p of r.rankings) {
              const entry = map.get(p.playerId) ?? { played: 0, wins: 0 };
              entry.played++;
              map.set(p.playerId, entry);
            }
          }
          // Count wins
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
        <div className="text-gray-400 animate-pulse">加载统计数据…</div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-8">
      <div className="w-full max-w-3xl space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-bold text-white">数据统计</h1>
          <p className="text-gray-400 text-sm">参与者出勤与对战记录</p>
        </div>

        {/* View toggle */}
        <div className="flex rounded-xl bg-gray-900 border border-gray-800 p-1">
          {(['summary', 'detail'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === v
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {v === 'summary' ? '汇总统计' : '对局明细'}
            </button>
          ))}
        </div>

        {view === 'summary' ? (
          <div className="rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden">
            <div className="grid grid-cols-4 gap-px bg-gray-800 text-xs font-semibold text-gray-400 uppercase tracking-wider">
              <div className="bg-gray-900 px-4 py-3">学号</div>
              <div className="bg-gray-900 px-4 py-3 text-center">参加场次</div>
              <div className="bg-gray-900 px-4 py-3 text-center">胜利场次</div>
              <div className="bg-gray-900 px-4 py-3 text-center">胜率</div>
            </div>
            {stats.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">暂无对局数据</div>
            ) : (
              stats.map((s, i) => (
                <div
                  key={s.studentId}
                  className={`grid grid-cols-4 gap-px bg-gray-800 ${i % 2 === 0 ? '' : ''}`}
                >
                  <div className="bg-gray-900 px-4 py-3 text-sm text-white font-mono">
                    {s.studentId}
                  </div>
                  <div className="bg-gray-900 px-4 py-3 text-sm text-gray-300 text-center">
                    {s.gamesPlayed}
                  </div>
                  <div className="bg-gray-900 px-4 py-3 text-sm text-center">
                    <span className={s.wins > 0 ? 'text-emerald-400 font-medium' : 'text-gray-500'}>
                      {s.wins}
                    </span>
                  </div>
                  <div className="bg-gray-900 px-4 py-3 text-sm text-center">
                    <span className={parseInt(s.winRate) >= 50 ? 'text-emerald-400' : 'text-gray-400'}>
                      {s.winRate}
                    </span>
                  </div>
                </div>
              ))
            )}
            {stats.length > 0 && (
              <div className="bg-gray-900 px-4 py-3 text-xs text-gray-500 border-t border-gray-800">
                共 {stats.length} 名参与者，{records.length} 场对局
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {records.length === 0 ? (
              <div className="rounded-2xl bg-gray-900 border border-gray-800 px-4 py-8 text-center text-gray-500">
                暂无对局记录
              </div>
            ) : (
              records.map(r => (
                <div key={r.id} className="rounded-xl bg-gray-900 border border-gray-800 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      {new Date(r.created_at).toLocaleString('zh-CN')}
                    </span>
                    <span className="text-xs text-gray-500">
                      {r.rounds_played} 轮
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(r.rankings) && r.rankings.map((p, i) => (
                      <div
                        key={p.playerId}
                        className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${
                          p.playerId === r.winner_id
                            ? 'bg-yellow-500/15 border border-yellow-500/30 text-yellow-300'
                            : 'bg-gray-800 text-gray-300'
                        }`}
                      >
                        {p.playerId === r.winner_id && <span>🏆</span>}
                        <span className="font-mono">{p.playerId}</span>
                        <span className="text-xs text-gray-500">
                          申报{p.declaredCount}组 剩{p.remainingCards}张
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
