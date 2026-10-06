/**
 * 课堂数据一键导出 Excel（按学号）。数据源 = migration 0030 的 class_data.* 视图。
 *
 *   npx tsx scripts/export-class-data.ts                       # 全部数据
 *   npx tsx scripts/export-class-data.ts --since 2026-10-15    # 只看某天起（明细表过滤；汇总表只留这段时间有活动的学号）
 *   npx tsx scripts/export-class-data.ts --out ~/Desktop/x.xlsx
 *
 * 鉴权：Supabase 管理 token（钥匙串 "Supabase CLI"，或环境变量 SUPABASE_ACCESS_TOKEN）。
 * ⚠️ 导出文件含学号↔人格分数，属隐私数据，别外传/别进 git。
 */
import { execSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import ExcelJS from 'exceljs';

const REF = 'msyrowizejzgxedmnjne';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
}

function pat(): string {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN;
  const raw = execSync(`security find-generic-password -s 'Supabase CLI' -w`).toString().trim();
  return raw.startsWith('go-keyring-base64:') ? Buffer.from(raw.slice(18), 'base64').toString() : raw;
}

async function sql<T = Record<string, unknown>>(query: string): Promise<T[]> {
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${pat()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`query → ${res.status} ${text.slice(0, 300)}`);
  return JSON.parse(text);
}

const since = arg('since');
if (since && !/^\d{4}-\d{2}-\d{2}$/.test(since)) throw new Error('--since 格式 YYYY-MM-DD');
// 按香港时间零点切（::date 会按 UTC，等于 HKT 早上 8 点）
const sinceWhere = (col: string) => (since ? `WHERE ${col} >= '${since} 00:00+08'::timestamptz` : '');
const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const out = (arg('out') ?? path.join(os.homedir(), 'Desktop', `人格麻將_課堂數據_${stamp}${since ? `_since${since}` : ''}.xlsx`))
  .replace(/^~/, os.homedir());

// 时间统一转香港时间（老师看的是本地时间）。写成真日期单元格（能按时间排序/筛选）：
// Excel 日期无时区，先把 UTC 平移 +8h 再按「本地值」写入。
const HK_OFFSET_MS = 8 * 60 * 60 * 1000;
const hk = (v: unknown) => (v ? new Date(new Date(String(v)).getTime() + HK_OFFSET_MS) : '');
const hkText = (d: Date) => new Date(d.getTime() + HK_OFFSET_MS).toISOString().slice(0, 16).replace('T', ' ');
const num = (v: unknown) => (v === null || v === undefined || v === '' ? '' : Number(v));

type Col = { key: string; header: string; width?: number; fmt?: (v: unknown) => unknown };

function addSheet(wb: ExcelJS.Workbook, name: string, cols: Col[], rows: Record<string, unknown>[]) {
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', xSplit: 1, ySplit: 1 }] });
  ws.columns = cols.map((c) => ({ header: c.header, key: c.key, width: c.width ?? Math.max(10, c.header.length * 2 + 2) }));
  cols.forEach((c, i) => {
    if (c.fmt === hk) ws.getColumn(i + 1).numFmt = 'yyyy-mm-dd hh:mm';
  });
  for (const r of rows) {
    const o: Record<string, unknown> = {};
    for (const c of cols) o[c.key] = c.fmt ? c.fmt(r[c.key]) : r[c.key] ?? '';
    ws.addRow(o);
  }
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2E4C8' } };
  if (rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cols.length } };
}

const MODEL_NAME: Record<string, string> = { 'big-five': '五大', hexaco: 'HEXACO', sd4: 'SD4' };
const QCOUNT: Record<string, number> = { 'big-five': 50, hexaco: 60, sd4: 28 };
const SCORE_KEYS: Record<string, string[]> = {
  'big-five': ['O', 'C', 'E', 'A', 'N'],
  hexaco: ['H', 'E', 'X', 'A', 'C', 'O'],
  sd4: ['M', 'N', 'P', 'S'],
};

async function main() {
  const [games, quizzes, assessments, studentsAll] = await Promise.all([
    sql(`SELECT * FROM class_data.games ${sinceWhere('ended_at')} ORDER BY ended_at, session_id, rank`),
    sql(`SELECT * FROM class_data.quizzes ${sinceWhere('submitted_at')} ORDER BY submitted_at`),
    sql(`SELECT * FROM class_data.assessments ${sinceWhere('submitted_at')} ORDER BY model, student_id, submitted_at`),
    sql(`SELECT * FROM class_data.students ORDER BY student_id`),
  ]);

  // --since：汇总表只留这段时间内有测评/对局/小测的学号（汇总数字本身仍是全期累计，表头已注明）
  const active = new Set([...games, ...quizzes, ...assessments].map((r) => String(r.student_id)));
  const students = since ? studentsAll.filter((s) => active.has(String(s.student_id))) : studentsAll;

  const wb = new ExcelJS.Workbook();

  // ── 说明 ──
  const readme = wb.addWorksheet('說明');
  readme.columns = [{ width: 110 }];
  [
    `人格麻將 課堂數據導出　${hkText(new Date())}（香港時間）${since ? `　｜ 範圍：${since} 起` : '　｜ 範圍：全部'}`,
    '',
    '【學生匯總】一個學號一行。人格分數取「最新一次」測評；對局只計聯機(PVP)局，單機局不記錄。',
    since ? '　　⚠️ 匯總表只列出此期間有活動的學號，但數字是全期累計；要看此期間的數字請用明細表篩選。' : '',
    '　　完成局 = 有勝負結果（含其他人都退出、剩一人躺贏）；中斷局 = 房主中途退出。申報組數 = 該局碰/歸檔成功的組數（得分依據）。',
    '　　碰成功/失敗、食胡成功/失敗 = 累計次數；平均名次 1 = 第一名。小測正確率 = 答對題數 ÷ 作答題數。',
    '【測評_五大 / 測評_HEXACO / 測評_SD4】每次測評一行，含逐題作答（Q1…）。來源 manual = 手動填分，無逐題答案。',
    '【對局明細】一人一局一行。【小測明細】每答完一輪 4 題一行；第 4 題固定為人格維度題。',
    '',
    '⚠️ 本檔含學號與人格分數，屬個人隱私資料，請勿外傳。',
  ]
    .filter((l) => l !== '')
    .forEach((l) => readme.addRow([l]));

  // ── 学生汇总 ──
  addSheet(wb, '學生匯總', [
    { key: 'student_id', header: '學號', width: 14 },
    { key: 'bf_o', header: '五大 O', fmt: num }, { key: 'bf_c', header: '五大 C', fmt: num },
    { key: 'bf_e', header: '五大 E', fmt: num }, { key: 'bf_a', header: '五大 A', fmt: num },
    { key: 'bf_n', header: '五大 N', fmt: num },
    { key: 'bf_latest_at', header: '五大最新測評時間', width: 20, fmt: hk }, { key: 'bf_attempts', header: '五大測評次數' },
    { key: 'hx_h', header: 'HEXACO H', fmt: num }, { key: 'hx_e', header: 'HEXACO E', fmt: num },
    { key: 'hx_x', header: 'HEXACO X', fmt: num }, { key: 'hx_a', header: 'HEXACO A', fmt: num },
    { key: 'hx_c', header: 'HEXACO C', fmt: num }, { key: 'hx_o', header: 'HEXACO O', fmt: num },
    { key: 'hx_latest_at', header: 'HEXACO最新測評時間', width: 20, fmt: hk }, { key: 'hx_attempts', header: 'HEXACO測評次數' },
    { key: 'sd4_m', header: 'SD4 M', fmt: num }, { key: 'sd4_n', header: 'SD4 N', fmt: num },
    { key: 'sd4_p', header: 'SD4 P', fmt: num }, { key: 'sd4_s', header: 'SD4 S', fmt: num },
    { key: 'sd4_latest_at', header: 'SD4最新測評時間', width: 20, fmt: hk }, { key: 'sd4_attempts', header: 'SD4測評次數' },
    { key: 'games_completed', header: '完成局數' }, { key: 'games_interrupted', header: '中斷局數' },
    { key: 'games_big_five', header: '五大局數' }, { key: 'games_hexaco', header: 'HEXACO局數' }, { key: 'games_sd4', header: 'SD4局數' },
    { key: 'wins', header: '勝場' }, { key: 'declared_total', header: '申報組數合計' },
    { key: 'declared_avg', header: '每局平均申報組數', fmt: num }, { key: 'rank_avg', header: '平均名次', fmt: num },
    { key: 'pong_success', header: '碰成功' }, { key: 'pong_fail', header: '碰失敗' },
    { key: 'hu_success', header: '食胡成功' }, { key: 'hu_fail', header: '食胡失敗' },
    { key: 'quiz_attempts', header: '小測次數' }, { key: 'quiz_correct_rate', header: '小測正確率', fmt: num },
    { key: 'last_active_at', header: '最後活動時間', width: 20, fmt: hk },
  ], students);

  // ── 测评明细（每模型一张，逐题展开）──
  for (const model of ['big-five', 'hexaco', 'sd4']) {
    const rows = assessments
      .filter((a) => a.model === model)
      .map((a) => {
        const scores = (a.scores ?? {}) as Record<string, unknown>;
        const answers = (a.answers ?? {}) as Record<string, unknown>;
        const o: Record<string, unknown> = { ...a };
        for (const k of SCORE_KEYS[model]) o[`s_${k}`] = scores[k];
        for (let i = 1; i <= QCOUNT[model]; i++) o[`q${i}`] = answers[String(i)];
        return o;
      });
    addSheet(wb, `測評_${MODEL_NAME[model]}`, [
      { key: 'student_id', header: '學號', width: 14 },
      { key: 'attempt_no', header: '第幾次' },
      { key: 'source', header: '來源' },
      { key: 'submitted_at', header: '提交時間', width: 20, fmt: hk },
      { key: 'answered_count', header: '作答題數' },
      ...SCORE_KEYS[model].map((k) => ({ key: `s_${k}`, header: `分數 ${k}`, fmt: num })),
      ...Array.from({ length: QCOUNT[model] }, (_, i) => ({ key: `q${i + 1}`, header: `Q${i + 1}`, width: 6, fmt: num })),
    ], rows);
  }

  // ── 对局明细 ──
  addSheet(wb, '對局明細', [
    { key: 'student_id', header: '學號', width: 14 },
    { key: 'model', header: '模型', fmt: (v) => MODEL_NAME[String(v)] ?? v },
    { key: 'room_code', header: '房號' },
    { key: 'started_at', header: '開始', width: 20, fmt: hk },
    { key: 'ended_at', header: '結束', width: 20, fmt: hk },
    { key: 'players_in_game', header: '人數' },
    { key: 'total_rounds', header: '設定輪數' }, { key: 'rounds_played', header: '實際輪數' },
    { key: 'interrupted', header: '中斷局', fmt: (v) => (v ? '是' : '') },
    { key: 'declared_count', header: '申報組數' }, { key: 'remaining_cards', header: '剩餘手牌' },
    { key: 'rank', header: '名次' }, { key: 'is_winner', header: '勝出', fmt: (v) => (v ? '🏆' : '') },
    { key: 'pong_success_count', header: '碰成功' }, { key: 'pong_fail_count', header: '碰失敗' },
    { key: 'hu_success_count', header: '食胡成功' }, { key: 'hu_fail_count', header: '食胡失敗' },
    { key: 'session_id', header: '對局 ID', width: 38 },
  ], games);

  // ── 小测明细 ──
  const quizRows = quizzes.map((q) => {
    const items = (q.items ?? []) as { correct?: boolean; question?: string; picked?: string; answer?: string }[];
    const o: Record<string, unknown> = { ...q };
    items.forEach((it, i) => {
      o[`c${i + 1}`] = it.correct ? '✓' : '✗';
      o[`t${i + 1}`] = it.correct ? it.answer : `${it.picked}（正解：${it.answer}）`;
    });
    return o;
  });
  addSheet(wb, '小測明細', [
    { key: 'student_id', header: '學號', width: 14 },
    { key: 'model', header: '模型', fmt: (v) => MODEL_NAME[String(v)] ?? v },
    { key: 'mode', header: '模式', fmt: (v) => (v === 'pvp' ? '聯機' : '單機') },
    { key: 'room_code', header: '房號' },
    { key: 'attempt', header: '第幾次' },
    { key: 'score', header: '答對' }, { key: 'total', header: '題數' },
    { key: 'submitted_at', header: '提交時間', width: 20, fmt: hk },
    ...[1, 2, 3, 4].flatMap((i) => [
      { key: `c${i}`, header: `第${i}題${i === 4 ? '(維度)' : ''}`, width: 9 },
      { key: `t${i}`, header: `第${i}題作答`, width: 26 },
    ]),
  ], quizRows);

  await wb.xlsx.writeFile(out);
  console.log(`✓ ${out}`);
  console.log(`  學生 ${students.length} ｜ 測評 ${assessments.length} ｜ 對局行 ${games.length} ｜ 小測 ${quizzes.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
