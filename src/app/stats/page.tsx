'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';

// 一行 = 一人一局（game_participants 關聯 game_sessions）。
// 真相源 schema：supabase/migrations/0001_game_records.sql。
interface SessionMeta {
  room_code: string | null;
  mode: string;
  started_at: string | null;
  ended_at: string | null;
  rounds_played: number | null;
  winner_player_id: string | null;
}
interface ParticipantRow {
  id: string;
  session_id: string;
  student_id: string | null;
  is_ai: boolean;
  declared_count: number;
  remaining_cards: number;
  final_score: number;
  rank: number;
  is_winner: boolean;
  hu_success_count: number;
  hu_fail_count: number;
  pong_success_count: number;
  pong_fail_count: number;
  game_sessions: SessionMeta | null;
}

interface StudentAgg {
  studentId: string;
  games: number;
  wins: number;
  avgScore: string;
  avgDeclared: string;
  bestRank: number;
}

// 注意：分数列（O/C/E/A/N）已移出公开 CSV（隐私）。分数在 big_five_snapshots（已锁表），
// 老师从 Supabase 后台经 game_participants.big_five_snapshot_id join 获取。
const CSV_HEADERS = [
  '學號', '房間', '結束時間', '模式', '輪數',
  '申報組數', '剩餘手牌', '最終得分', '名次', '是否獲勝', '是否中斷局',
  '胡成功', '胡失敗', '碰成功', '碰失敗',
];

function csvEscape(v: unknown): string {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function rowToCsv(r: ParticipantRow): string {
  const s = r.game_sessions;
  const interrupted = s ? s.winner_player_id == null : false;
  return [
    r.student_id ?? (r.is_ai ? 'AI' : ''),
    s?.room_code ?? '',
    s?.ended_at ? new Date(s.ended_at).toLocaleString('zh-CN') : '',
    s?.mode ?? '',
    s?.rounds_played ?? '',
    r.declared_count, r.remaining_cards, r.final_score, r.rank,
    r.is_winner ? '是' : '', interrupted ? '是' : '',
    r.hu_success_count, r.hu_fail_count, r.pong_success_count, r.pong_fail_count,
  ].map(csvEscape).join(',');
}

export default function StatsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ParticipantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [view, setView] = useState<'summary' | 'detail'>('summary');

  useEffect(() => {
    async function fetchData() {
      try {
        const { data, error } = await supabase
          .from('game_participants')
          .select(
            'id, session_id, student_id, is_ai, declared_count, remaining_cards, final_score, rank, is_winner, hu_success_count, hu_fail_count, pong_success_count, pong_fail_count, game_sessions ( room_code, mode, started_at, ended_at, rounds_played, winner_player_id )'
          )
          .order('session_id', { ascending: false });
        if (error) throw error;
        // supabase 嵌套返回 game_sessions 爲對象
        setRows((data ?? []) as unknown as ParticipantRow[]);
      } catch (e) {
        console.error('Failed to fetch stats:', e);
        setErrMsg(
          '讀取數據失敗。請確認 Supabase 已執行 supabase/migrations/0001_game_records.sql 建好 3 張表。'
        );
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // 真人行（排除 AI）
  const humanRows = useMemo(() => rows.filter((r) => !r.is_ai && r.student_id), [rows]);

  const sessionCount = useMemo(() => new Set(rows.map((r) => r.session_id)).size, [rows]);

  const summary: StudentAgg[] = useMemo(() => {
    const map = new Map<string, { games: number; wins: number; scoreSum: number; declSum: number; bestRank: number }>();
    for (const r of humanRows) {
      const sid = r.student_id as string;
      const e = map.get(sid) ?? { games: 0, wins: 0, scoreSum: 0, declSum: 0, bestRank: 99 };
      e.games++;
      if (r.is_winner) e.wins++;
      e.scoreSum += r.final_score;
      e.declSum += r.declared_count;
      e.bestRank = Math.min(e.bestRank, r.rank);
      map.set(sid, e);
    }
    return Array.from(map.entries())
      .map(([studentId, e]) => ({
        studentId,
        games: e.games,
        wins: e.wins,
        avgScore: (e.scoreSum / e.games).toFixed(1),
        avgDeclared: (e.declSum / e.games).toFixed(1),
        bestRank: e.bestRank,
      }))
      .sort((a, b) => b.games - a.games || b.wins - a.wins);
  }, [humanRows]);

  // 明細按局分組
  const bySession = useMemo(() => {
    const m = new Map<string, ParticipantRow[]>();
    for (const r of rows) {
      const arr = m.get(r.session_id) ?? [];
      arr.push(r);
      m.set(r.session_id, arr);
    }
    return Array.from(m.values()).sort(
      (a, b) =>
        new Date(b[0].game_sessions?.ended_at ?? 0).getTime() -
        new Date(a[0].game_sessions?.ended_at ?? 0).getTime()
    );
  }, [rows]);

  function downloadCsv() {
    const lines = [CSV_HEADERS.join(','), ...humanRows.map(rowToCsv)];
    // ﻿ BOM 讓 Excel 正確識別 UTF-8 中文
    const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `psycho-card-data-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="psy-serif animate-pulse text-[var(--psy-muted)]">加載統計數據…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-10">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-5xl space-y-8">
        <div className="space-y-3">
          <button
            onClick={() => router.push('/')}
            className="text-sm text-[var(--psy-muted)] underline decoration-[rgba(200,155,93,0.28)] underline-offset-4 transition hover:text-[var(--psy-ink-soft)]"
          >
            ← 返回首頁
          </button>
          <p className="psy-eyebrow">DECK ARCHIVES</p>
          <h1 className="psy-serif text-5xl leading-none text-[var(--psy-ink)] sm:text-6xl">數據統計</h1>
          <p className="text-base leading-7 text-[var(--psy-ink-soft)]">參與者出勤與對戰記錄的歸檔卷宗。</p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="psy-chip">{summary.length} 名參與者</span>
            <span className="psy-chip">{sessionCount} 場對局</span>
            <button
              onClick={downloadCsv}
              disabled={humanRows.length === 0}
              className="psy-serif ml-auto rounded-full border border-[var(--psy-border-strong)] bg-[var(--psy-accent-soft)] px-4 py-1.5 text-sm text-[var(--psy-accent)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ⬇ 導出 CSV（{humanRows.length} 行）
            </button>
          </div>
        </div>

        {errMsg && (
          <div className="rounded-[1.4rem] border border-[var(--psy-danger,#b4543a)] bg-[rgba(180,84,58,0.08)] px-6 py-4 text-sm text-[var(--psy-ink-soft)]">
            ⚠️ {errMsg}
          </div>
        )}

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
                  {v === 'summary' ? '彙總統計' : '對局明細'}
                </button>
              );
            })}
          </div>

          {view === 'summary' ? (
            summary.length === 0 ? (
              <div className="rounded-[1.4rem] border border-[rgba(200,155,93,0.14)] bg-[rgba(255,255,255,0.02)] px-6 py-12 text-center text-sm text-[var(--psy-muted)]">
                暫無對局數據
              </div>
            ) : (
              <div className="overflow-hidden rounded-[1.4rem] border border-[rgba(200,155,93,0.18)]">
                <div className="psy-eyebrow grid grid-cols-[1.4fr_0.8fr_0.8fr_0.9fr_0.8fr] gap-px border-b border-[rgba(200,155,93,0.18)] bg-[rgba(200,155,93,0.05)] px-3 py-3 text-[10px] sm:px-5">
                  <div>學號</div>
                  <div className="text-center">場次</div>
                  <div className="text-center">勝場</div>
                  <div className="text-center">均申報</div>
                  <div className="text-center">最佳名次</div>
                </div>
                {summary.map((s, i) => (
                  <div
                    key={s.studentId}
                    className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.9fr_0.8fr] items-center gap-px border-t border-[rgba(200,155,93,0.08)] px-3 py-3 text-sm transition hover:bg-[rgba(200,155,93,0.04)] sm:px-5"
                    style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}
                  >
                    <div className="font-mono text-[var(--psy-ink)] tabular-nums">{s.studentId}</div>
                    <div className="text-center font-mono text-[var(--psy-ink-soft)] tabular-nums">{s.games}</div>
                    <div className="text-center font-mono tabular-nums">
                      <span className={s.wins > 0 ? 'font-medium text-[var(--psy-success)]' : 'text-[var(--psy-muted)]'}>{s.wins}</span>
                    </div>
                    <div className="text-center font-mono text-[var(--psy-ink-soft)] tabular-nums">{s.avgDeclared}</div>
                    <div className="text-center font-mono text-[var(--psy-ink-soft)] tabular-nums">#{s.bestRank}</div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="space-y-3">
              {bySession.length === 0 ? (
                <div className="rounded-[1.4rem] border border-[rgba(200,155,93,0.14)] bg-[rgba(255,255,255,0.02)] px-6 py-12 text-center text-sm text-[var(--psy-muted)]">
                  暫無對局記錄
                </div>
              ) : (
                bySession.map((parts) => {
                  const s = parts[0].game_sessions;
                  const interrupted = s ? s.winner_player_id == null : false;
                  const ranked = [...parts].sort((a, b) => a.rank - b.rank);
                  return (
                    <div key={parts[0].session_id} className="space-y-3 rounded-[1.4rem] border border-[rgba(200,155,93,0.16)] bg-[rgba(255,255,255,0.02)] p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[var(--psy-muted)]">
                          {s?.ended_at ? new Date(s.ended_at).toLocaleString('zh-CN') : '—'}
                          {s?.room_code ? ` · 房間 ${s.room_code}` : ''}
                        </span>
                        <span className="psy-eyebrow text-[10px] text-[var(--psy-muted)]">
                          {s?.rounds_played ?? '?'} 輪{interrupted ? ' · 中斷局' : ''}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {ranked.map((p) => (
                          <div
                            key={p.id}
                            className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm"
                            style={{
                              borderColor: p.is_winner ? 'var(--psy-border-strong)' : 'rgba(200,155,93,0.18)',
                              background: p.is_winner ? 'var(--psy-accent-soft)' : 'rgba(255,255,255,0.025)',
                              color: p.is_winner ? 'var(--psy-accent)' : 'var(--psy-ink-soft)',
                            }}
                          >
                            {p.is_winner && <span>🏆</span>}
                            <span className="font-mono tabular-nums">{p.is_ai ? 'AI' : p.student_id}</span>
                            <span className="text-xs text-[var(--psy-muted)]">
                              #{p.rank} · 申報{p.declared_count}組 · 剩{p.remaining_cards}張
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
