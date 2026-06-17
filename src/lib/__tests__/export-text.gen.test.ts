// 文本导出（借 vitest 跑 TS + 解析 @/ 别名）：
//   npx vitest run src/lib/__tests__/export-text.gen.test.ts
// 产出 docs/i18n-review.csv —— 每页中英文 1:1 对应，供同事 review。
// 两个来源：
//   1) i18n   —— STRINGS.zh / STRINGS.en 按相同 key 路径严格对齐（+ 卡牌 + 维度）。
//   2) 未i18n —— 各页面硬编码字符串（docs/_hardcoded-literals.json，agent 逐页扫得），
//               这些目前多为繁中、无英文，en 空 = 待翻译。
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { test } from 'vitest';
import { STRINGS } from '@/lib/i18n';
import { QUESTIONS } from '@/data/questions';
import { DIMENSION_META } from '@/data/dimensions';

type Flat = Record<string, string>;
interface Row { source: string; section: string; key: string; zh: string; en: string; note: string }

function flatten(obj: unknown, prefix: string, out: Flat) {
  if (obj === null || obj === undefined) return;
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
    return;
  }
  if (typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      flatten(v, prefix ? `${prefix}.${k}` : k, out);
    }
    return;
  }
  out[prefix] = String(obj);
}

function csvCell(v: string): string {
  return `"${v.replace(/"/g, '""')}"`;
}

// 碎片 key 备注：很多文案是「前缀/后缀/单位」在运行时与数字或其它词拼成整句。
// 单看一个词无法翻译/审校，这里给出完整拼接模板 + 示例，便于交付同事。
const NOTES: Record<string, string> = {
  'game.declaredPrefix': '拼接计分行「申報 N 組 · 剩餘 M 張」(EN: Declared N sets · left M cards)。例：申報 3 組 · 剩餘 5 張',
  'game.declaredSuffix': '同上行的「組」(sets)，紧跟数字：申報 N [組]',
  'game.remainingPrefix': '同上行的「剩餘」(left)：· 剩餘 M 張',
  'game.cardsUnit': '牌张数量单位「張」(cards)，紧跟数字，多处复用：剩餘 5 [張] / 目標 4 [張]',
  'game.roundWord': '桌面端回合显示「第 N / M 輪」(EN: Round N / M)，roundWord=輪/Round',
  'game.roundUnit': '移动端回合显示「第 N/M 輪」(EN: Round N/M)，roundUnit=輪/Round',
  'game.targetPrefix': '拼接「目標 N 張」(EN: Target N cards)，与 cardsUnit 连用',
  'game.selectedPrefix': '拼接「已選 N」(EN: selected N)，紧跟已选数量',
  'game.progressPrefix': '拼接「當前正在抽取 {維度} 維度的人格線索。」前半句',
  'game.progressSuffix': '拼接「當前正在抽取 {維度} 維度的人格線索。」后半句',
  'game.winSuffix': '拼接「{玩家名} 贏了」(EN: {name} wins) 的后缀',
  'game.turnSuffix': '拼接「{玩家名} 的回合中」的后缀（EN 为空）',
  'game.answeredSuffix': '拼接「N 已作答」(EN: N answered)',
  'game.roomTitlePrefix': '拼接「人格麻將 · 聯機房 {房間碼}」前缀',
  'assessment.fullAssessPrefix': '拼接「完整測評（N 題）」前缀',
  'assessment.fullAssessSuffix': '拼接「完整測評（N 題）」后缀',
  'pvpRoom.waitingPlayersPrefix': '拼接「等待玩家（N/2）」前缀',
  'pvpRoom.waitingPlayersSuffix': '拼接「等待玩家（N/2）」后缀',
  'pvpLobby.stillInRoomPrefix': '拼接「你還在房間 {房間碼} …」前缀',
};
const FRAGMENT_RE = /(Prefix|Suffix|Unit|Word)$/;
function noteFor(key: string): string {
  if (NOTES[key]) return NOTES[key];
  const last = key.split('.').pop() ?? '';
  if (FRAGMENT_RE.test(last)) return '⚠ 片段：运行时与数字/其它词拼接成整句，勿单独翻译';
  return '';
}

// 噪音过滤：纯 emoji / 标点 / 箭头 / 模板碎片，无实际可读词。
const hasCJK = (s: string) => /[一-鿿]/.test(s);
const hasLatinWord = (s: string) => /[A-Za-z]{3,}/.test(s);
function isMeaningful(zh: string, en: string): boolean {
  const z = zh.trim();
  const e = en.trim();
  if (!z && !e) return false;
  // 去掉模板占位后看是否还有实义字符
  const zStripped = z.replace(/\$\{[^}]*\}|\{[^}]*\}/g, '').trim();
  if (hasCJK(zStripped)) return true;
  if (hasLatinWord(zStripped)) return true;
  if (hasLatinWord(e)) return true; // 纯英文 UI 词（DRAW / Your Turn / Psyche 等）
  return false; // 纯符号/emoji/标点
}

test('export bilingual text to docs/i18n-review.csv', () => {
  const zhFlat: Flat = {};
  const enFlat: Flat = {};
  flatten(STRINGS.zh, '', zhFlat);
  flatten(STRINGS.en, '', enFlat);

  const rows: Row[] = [];
  const keys = Array.from(new Set([...Object.keys(zhFlat), ...Object.keys(enFlat)]));
  for (const key of keys) {
    rows.push({ source: 'i18n', section: key.split(/[.[]/)[0], key, zh: zhFlat[key] ?? '', en: enFlat[key] ?? '', note: noteFor(key) });
  }
  for (const q of QUESTIONS) {
    rows.push({ source: 'i18n', section: 'cards', key: `card.${q.id}`, zh: q.text, en: q.textEn, note: '' });
  }
  for (const d of Object.values(DIMENSION_META)) {
    rows.push({ source: 'i18n', section: 'dimension', key: `dimension.${d.key}.name`, zh: d.name, en: d.nameEn, note: '' });
    rows.push({ source: 'i18n', section: 'dimension', key: `dimension.${d.key}.description`, zh: d.description, en: '', note: 'EN 暂缺，待补' });
  }

  // 硬编码（未走 i18n）字符串：逐页 agent 扫描结果。
  const litPath = resolve(process.cwd(), 'docs/_hardcoded-literals.json');
  const lits = JSON.parse(readFileSync(litPath, 'utf8')) as { file: string; zh: string; en: string }[];
  const seen = new Set<string>();
  let n = 0;
  for (const lit of lits) {
    if (!isMeaningful(lit.zh, lit.en)) continue;
    const dedupKey = `${lit.file}|${lit.zh}|${lit.en}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    const note = lit.zh.includes('${') || lit.zh.includes('{') ? '含 {…} 变量占位，翻译时保留占位' : '';
    rows.push({ source: '未i18n(硬编码)', section: lit.file, key: `literal.${++n}`, zh: lit.zh, en: lit.en, note });
  }

  const header = ['来源', '区块/页面', 'key', '中文', 'English', '备注'];
  const lines = [header.map(csvCell).join(',')];
  for (const r of rows) {
    lines.push([r.source, r.section, r.key, r.zh, r.en, r.note].map(csvCell).join(','));
  }

  const csv = '﻿' + lines.join('\r\n') + '\r\n';
  writeFileSync(resolve(process.cwd(), 'docs/i18n-review.csv'), csv, 'utf8');
  // eslint-disable-next-line no-console
  console.log(`✓ wrote ${rows.length} rows -> docs/i18n-review.csv`);
});
