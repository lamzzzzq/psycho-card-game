/**
 * 压测后、清理前：逐桌逐人核对线上 DB 里的对局记录是否与机器人终局状态一致。
 *
 *   npx tsx scripts/loadtest/verify-records.ts [report-xxx.json] [--prefix ZSMK]
 *   （不给路径就取 scripts/loadtest/out/ 里最新的 report-*.json）
 *
 * 核对项：
 *   每桌：存档在【该桌模型】的表里、没误写进别的模型表；session 的房号/胜者对；
 *         4 个参与者都在，申报组数/剩牌/名次/胜负/碰/食胡次数与房主终局一致；每人分数快照存在且学号对。
 *   每人：老师导出视图 class_data.students 的汇总（局数、各模型局数、胜场、申报、碰、食胡）与本人实际一致；
 *         没打完/没存档的桌，组员不应有任何对局记录。
 * 输出：verify-<stamp>.json（全部明细）+ users-verified-<stamp>.csv（每人一行：机器人记录 + DB 实际值 + 是否一致）。
 * 有任何不一致 → 退出码 1。
 */
import { execSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const REF = 'msyrowizejzgxedmnjne';
const OUT_DIR = path.join(__dirname, 'out');
const argv = process.argv.slice(2);
const opt = (n: string, d: string) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 ? argv[i + 1] : d;
};
const PREFIX = opt('prefix', 'ZSMK');
if (!/^[A-Z]{2,8}$/.test(PREFIX)) throw new Error('prefix 只允许 2-8 个大写字母');

const reportPath =
  argv.find((a) => a.endsWith('.json')) ??
  path.join(OUT_DIR, readdirSync(OUT_DIR).filter((f) => /^report-.*\.json$/.test(f)).sort().pop()!);
const stamp = path.basename(reportPath).replace(/^report-|\.json$/g, '');

function pat(): string {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN;
  const raw = execSync(`security find-generic-password -s 'Supabase CLI' -w`).toString().trim();
  return raw.startsWith('go-keyring-base64:') ? Buffer.from(raw.slice(18), 'base64').toString() : raw;
}
async function sql<T = Record<string, any>>(query: string): Promise<T[]> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${pat()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`query → ${res.status} ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

const MODELS = {
  'big-five': { sessions: 'game_sessions', participants: 'game_participants', snapshots: 'big_five_snapshots', snapFk: 'big_five_snapshot_id', gamesCol: 'games_big_five' },
  hexaco: { sessions: 'hexaco_game_sessions', participants: 'hexaco_game_participants', snapshots: 'hexaco_snapshots', snapFk: 'hexaco_snapshot_id', gamesCol: 'games_hexaco' },
  sd4: { sessions: 'sd4_game_sessions', participants: 'sd4_game_participants', snapshots: 'sd4_snapshots', snapFk: 'sd4_snapshot_id', gamesCol: 'games_sd4' },
} as const;
type ModelKey = keyof typeof MODELS;

type Final = { id: string; seat: number; declared: number; remaining: number; rank: number; isWinner: boolean; huS: number; huF: number; pS: number; pF: number };
type TableResult = { table: number; model: ModelKey; code?: string; outcome: string; saved?: boolean; sessionId?: string; players?: string[]; final?: Final[] };

async function main() {
  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  const tables: TableResult[] = report.tables;
  const users: Record<string, any>[] = JSON.parse(readFileSync(path.join(path.dirname(reportPath), `users-${stamp}.json`), 'utf8'));
  const re = `'^${PREFIX}[0-9]{5}$'`;

  // 一次性把三套表里压测学号的行都拉下来
  const db: Record<ModelKey, { sessions: Record<string, any>[]; parts: Record<string, any>[]; snaps: Record<string, any>[] }> = {} as any;
  for (const [k, m] of Object.entries(MODELS) as [ModelKey, (typeof MODELS)[ModelKey]][]) {
    const [parts, snaps] = await Promise.all([
      sql(`select p.*, s.room_code, s.winner_player_id, s.total_rounds, s.rounds_played
           from ${m.participants} p join ${m.sessions} s on s.id = p.session_id where p.student_id ~ ${re}`),
      sql(`select id, student_id from ${m.snapshots} where student_id ~ ${re}`),
    ]);
    const sessionIds = [...new Set(parts.map((p) => p.session_id))];
    const sessions = sessionIds.length
      ? await sql(`select * from ${m.sessions} where id in (${sessionIds.map((i) => `'${i}'`).join(',')})`)
      : [];
    db[k] = { sessions, parts, snaps };
  }
  const students = await sql(`select * from class_data.students where student_id ~ ${re}`);
  const studentById = new Map(students.map((s) => [s.student_id, s]));

  const problems: string[] = [];
  const tableChecks: Record<string, unknown>[] = [];

  for (const t of tables) {
    const issues: string[] = [];
    const m = MODELS[t.model];
    if (t.saved && t.sessionId) {
      const session = db[t.model].sessions.find((s) => s.id === t.sessionId);
      if (!session) issues.push(`在 ${m.sessions} 找不到 session ${t.sessionId}`);
      for (const other of Object.keys(MODELS) as ModelKey[]) {
        if (other !== t.model && db[other].sessions.some((s) => s.id === t.sessionId)) issues.push(`session 误写进了 ${MODELS[other].sessions}`);
      }
      if (session) {
        if (session.room_code !== t.code) issues.push(`房号不符 DB=${session.room_code} 实际=${t.code}`);
        const winner = t.final?.find((f) => f.isWinner)?.id ?? null;
        if ((session.winner_player_id ?? null) !== winner) issues.push(`胜者不符 DB=${session.winner_player_id} 实际=${winner}`);
      }
      const parts = db[t.model].parts.filter((p) => p.session_id === t.sessionId);
      if (parts.length !== (t.final?.length ?? 0)) issues.push(`参与者 ${parts.length} 行，应为 ${t.final?.length}`);
      for (const f of t.final ?? []) {
        const p = parts.find((x) => x.student_id === f.id);
        if (!p) {
          issues.push(`${f.id} 没有参与者记录`);
          continue;
        }
        const pairs: [string, unknown, unknown][] = [
          ['seat_index', p.seat_index, f.seat], ['declared_count', p.declared_count, f.declared], ['remaining_cards', p.remaining_cards, f.remaining],
          ['rank', p.rank, f.rank], ['is_winner', p.is_winner, f.isWinner], ['hu_success_count', p.hu_success_count, f.huS],
          ['hu_fail_count', p.hu_fail_count, f.huF], ['pong_success_count', p.pong_success_count, f.pS], ['pong_fail_count', p.pong_fail_count, f.pF],
        ];
        for (const [col, got, want] of pairs) if (got !== want) issues.push(`${f.id}.${col} DB=${got} 实际=${want}`);
        const snapId = p[m.snapFk];
        if (!snapId) issues.push(`${f.id} 没有分数快照 FK`);
        else {
          const snap = db[t.model].snaps.find((s) => s.id === snapId);
          if (!snap) issues.push(`${f.id} 快照 ${snapId} 不存在`);
          else if (snap.student_id !== f.id) issues.push(`${f.id} 快照学号不符 ${snap.student_id}`);
        }
      }
    } else {
      // 没存档的桌：组员不该有任何对局记录（否则是半写/串写）
      for (const id of t.players ?? []) {
        for (const k of Object.keys(MODELS) as ModelKey[]) {
          if (db[k].parts.some((p) => p.student_id === id)) issues.push(`未存档的桌，但 ${id} 在 ${MODELS[k].participants} 有记录`);
        }
      }
    }
    if (issues.length) problems.push(...issues.map((i) => `table ${t.table} (${t.model} ${t.code ?? '-'}): ${i}`));
    tableChecks.push({ table: t.table, model: t.model, code: t.code, outcome: t.outcome, saved: !!t.saved, ok: issues.length === 0, issues });
  }

  // 每人：老师导出视图里的汇总 = 本人实际
  const verifiedUsers = users.map((u) => {
    const t = tables.find((x) => x.table === u.table)!;
    const fin = t.final?.find((f) => f.id === u.student_id);
    const counted = !!(t.saved && fin);
    const interrupted = counted && !t.final!.some((f) => f.isWinner);
    const s = studentById.get(u.student_id);
    const want: Record<string, number> = {
      games_completed: counted && !interrupted ? 1 : 0,
      games_interrupted: interrupted ? 1 : 0,
      games_big_five: counted && t.model === 'big-five' ? 1 : 0,
      games_hexaco: counted && t.model === 'hexaco' ? 1 : 0,
      games_sd4: counted && t.model === 'sd4' ? 1 : 0,
      wins: counted && fin!.isWinner ? 1 : 0,
      declared_total: counted ? fin!.declared : 0,
      pong_success: counted ? fin!.pS : 0,
      pong_fail: counted ? fin!.pF : 0,
      hu_success: counted ? fin!.huS : 0,
      hu_fail: counted ? fin!.huF : 0,
    };
    const issues: string[] = [];
    if (!s) issues.push('老师导出视图里没有这个学号');
    else for (const [col, w] of Object.entries(want)) if (Number(s[col]) !== w) issues.push(`${col} 导出=${s[col]} 实际=${w}`);
    if (issues.length) problems.push(...issues.map((i) => `user ${u.student_id}: ${i}`));
    const { errors, ...rest } = u;
    return {
      ...rest,
      db_games_completed: s?.games_completed ?? null,
      db_games_model: s ? s[MODELS[t.model as ModelKey].gamesCol] : null,
      db_wins: s?.wins ?? null,
      db_declared_total: s?.declared_total ?? null,
      db_pong_success: s?.pong_success ?? null,
      db_hu_success: s?.hu_success ?? null,
      record_ok: issues.length === 0,
      record_issues: issues.join(' | '),
      errors: (errors as { where: string; msg: string }[]).map((e) => `${e.where}: ${e.msg}`).join(' | '),
    };
  });

  const summary = {
    report: path.basename(reportPath),
    tables: tables.length,
    tablesSaved: tables.filter((t) => t.saved).length,
    tablesRecordOk: tableChecks.filter((c) => c.ok).length,
    users: verifiedUsers.length,
    usersRecordOk: verifiedUsers.filter((u) => u.record_ok).length,
    dbRows: Object.fromEntries((Object.keys(MODELS) as ModelKey[]).map((k) => [k, { sessions: db[k].sessions.length, participants: db[k].parts.length, snapshots: db[k].snaps.length }])),
    problems: problems.length,
  };
  writeFileSync(path.join(OUT_DIR, `verify-${stamp}.json`), JSON.stringify({ summary, problems, tableChecks }, null, 2));
  const cols = Object.keys(verifiedUsers[0] ?? {});
  const esc = (v: unknown) => {
    const t = v == null ? '' : String(v);
    return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  writeFileSync(
    path.join(OUT_DIR, `users-verified-${stamp}.csv`),
    '﻿' + [cols.join(','), ...verifiedUsers.map((u) => cols.map((c) => esc((u as Record<string, unknown>)[c])).join(','))].join('\n') + '\n'
  );
  console.log(JSON.stringify(summary, null, 2));
  if (problems.length) {
    console.log(`⚠️ ${problems.length} 处不一致（前 30 条）：`);
    for (const p of problems.slice(0, 30)) console.log('  ' + p);
    process.exit(1);
  }
  console.log('✓ 全部对局记录与每人汇总都与实际一致');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
