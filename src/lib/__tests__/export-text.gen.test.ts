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
import { RULES_T } from '@/lib/i18n/rules';
import { STATS_T } from '@/lib/i18n/stats';
import { LOBBY_T } from '@/lib/i18n/lobby';
import { TUTORIAL_T } from '@/lib/i18n/tutorial';

// 已迁出中心 STRINGS、改用独立页面模块的页面。这些不再算「未i18n硬编码」。
const MIGRATED_MODULES: { section: string; mod: { zh: unknown; en: unknown } }[] = [
  { section: 'rules', mod: RULES_T },
  { section: 'stats', mod: STATS_T },
  { section: 'lobby', mod: LOBBY_T },
  { section: 'tutorial', mod: TUTORIAL_T },
];
// 已迁移：第一波整页 + 第二波单机牌桌/共享组件（其文案现走中心 STRINGS.game，
// 已在上面的 i18n 行体现，故从「未i18n硬编码」清单剔除，避免重复/误报。）
const MIGRATED_FILES = new Set([
  'rules', 'stats', 'lobby', 'tutorial',
  'game(single)', 'GameLog.tsx', 'MockGameScene.tsx', 'Card.tsx', 'DrawPile.tsx', 'PsyOverlayPanel.tsx',
]);

type Flat = Record<string, string>;
interface Row { source: string; section: string; key: string; zh: string; en: string; note: string }

function flatten(obj: unknown, prefix: string, out: Flat) {
  if (obj === null || obj === undefined) return;
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
    return;
  }
  if (typeof obj === 'function') {
    out[prefix] = '⟨动态句·见代码⟩';
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

// 合并组：把运行时拼接的「碎片」整句合成一行，供同事按完整句子审校/翻译。
// parts 用扁平 key（section.subkey）；{…} 为运行时变量占位（翻译时须保留占位与空格）。
// 被合并的碎片行会从导出中移除，合并行插在该组首个碎片原位置。
// 安全：若某 part key 因重构不存在，会自动跳过；整组都缺则不产出该合并行。
interface MergeGroup { key: string; parts: string[]; zh: string; en: string }
const MERGE_GROUPS: MergeGroup[] = [
  // —— 多碎片整句（真正被拆散、单看读不懂的）——
  { key: 'assessment.progress', parts: ['assessment.progressPrefix', 'assessment.progressSuffix'],
    zh: '當前正在抽取 {維度} 維度的人格線索。', en: 'Currently drawing clues for the {dimension} dimension.' },
  { key: 'game.declaredLine', parts: ['game.declaredPrefix', 'game.declaredSuffix', 'game.remainingPrefix', 'game.cardsUnit'],
    zh: '申報 {N} 組 · 剩餘 {M} 張', en: 'Declared {N} sets · left {M} cards' },
  { key: 'game.toastSelfPong', parts: ['game.toastSelfPongPrefix', 'game.toastDoneSuffix'],
    zh: '自摸碰！{維度} 完成！', en: 'Self-draw Pong! {dimension} done!' },
  { key: 'game.toastPong', parts: ['game.toastPongPrefix', 'game.toastDoneSuffix'],
    zh: '碰！{維度} 完成！', en: 'Pong! {dimension} done!' },
  { key: 'game.logFullTitle', parts: ['game.logFullTitlePrefix', 'game.logFullTitleSuffix'],
    zh: '行動記錄 · 共 {N} 條', en: 'Action log · {N} total' },
  { key: 'game.logRound', parts: ['game.logRoundPrefix', 'game.logRoundSuffix'],
    zh: '第 {N} 輪', en: 'Round {N}' },
  { key: 'pvpLobby.fullAssess', parts: ['pvpLobby.fullAssessPrefix', 'pvpLobby.fullAssessSuffix'],
    zh: '完整測評（{N} 題）', en: 'Full Test ({N} Q)' },
  { key: 'pvpRoom.waitingPlayers', parts: ['pvpRoom.waitingPlayersPrefix', 'pvpRoom.waitingPlayersSuffix'],
    zh: '等待玩家（{N}/2）', en: 'Waiting for players ({N}/2)' },
  // —— 单碎片但需补全成整句（只显示前/后缀读不出全貌的）——
  { key: 'game.target', parts: ['game.targetPrefix'], zh: '目標 {N} 張', en: 'Target {N} cards' },
  { key: 'game.selected', parts: ['game.selectedPrefix'], zh: '已選 {N}', en: 'selected {N}' },
  { key: 'game.roundDesktop', parts: ['game.roundWord'], zh: '第 {N} / {M} 輪', en: 'Round {N} / {M}' },
  { key: 'game.roundMobile', parts: ['game.roundUnit'], zh: '第 {N}/{M} 輪', en: 'Round {N}/{M}' },
  { key: 'game.roomTitle', parts: ['game.roomTitlePrefix'], zh: '人格麻將 · 聯機房 {房間碼}', en: 'Personalities Mahjong · Room {code}' },
  { key: 'game.win', parts: ['game.winSuffix'], zh: '{玩家名} 贏了', en: '{name} wins' },
  { key: 'game.turn', parts: ['game.turnSuffix'], zh: '{玩家名} 中（對方回合進行中）', en: '{name}（EN 無後綴）' },
  { key: 'assessment.answered', parts: ['assessment.answeredSuffix'], zh: '{N} 已作答', en: '{N} answered' },
  { key: 'pvpLobby.stillInRoom', parts: ['pvpLobby.stillInRoomPrefix'], zh: '你還在房間 {房間碼} …', en: 'You are still in room {code} …' },
];

// 把碎片行合并成整句行；返回新的 rows（其余行原样保留、相对顺序不变）。
function applyMerges(rows: Row[]): Row[] {
  const idxOf = (k: string) => rows.findIndex((r) => r.key === k);
  const removeSet = new Set<string>();
  const mergedAt: { anchor: number; row: Row }[] = [];
  for (const g of MERGE_GROUPS) {
    const present = g.parts.filter((p) => idxOf(p) >= 0);
    if (present.length === 0) {
      // eslint-disable-next-line no-console
      console.warn(`⚠ 合并组 ${g.key} 的碎片 key 全部缺失（可能已重构），跳过`);
      continue;
    }
    present.forEach((p) => removeSet.add(p));
    const anchor = Math.min(...present.map(idxOf));
    mergedAt.push({
      anchor,
      row: {
        source: 'i18n', section: g.key.split('.')[0], key: `${g.key}（合并）`,
        zh: g.zh, en: g.en,
        note: `🧩 已合并整句：由 ${present.join(' + ')} 运行时拼接而成。{…} 为运行时变量，翻译时请保留占位符与前后空格。`,
      },
    });
  }
  const out: Row[] = [];
  rows.forEach((r, i) => {
    mergedAt.filter((m) => m.anchor === i).forEach((m) => out.push(m.row));
    if (!removeSet.has(r.key)) out.push(r);
  });
  return out;
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
  // 合并：碎片拼接句 → 整句行（只作用于中心 STRINGS 这批，此时 rows 仅含它们）
  const mergedRows = applyMerges(rows);
  rows.length = 0;
  rows.push(...mergedRows);
  for (const q of QUESTIONS) {
    rows.push({ source: 'i18n', section: 'cards', key: `card.${q.id}`, zh: q.text, en: q.textEn, note: '' });
  }
  for (const d of Object.values(DIMENSION_META)) {
    rows.push({ source: 'i18n', section: 'dimension', key: `dimension.${d.key}.name`, zh: d.name, en: d.nameEn, note: '' });
    rows.push({ source: 'i18n', section: 'dimension', key: `dimension.${d.key}.description`, zh: d.description, en: '', note: 'EN 暂缺，待补' });
  }

  // 已迁移页面：从独立模块按相同 key 路径 1:1 对齐（已含英文）。
  for (const { section, mod } of MIGRATED_MODULES) {
    const z: Flat = {};
    const e: Flat = {};
    flatten(mod.zh, '', z);
    flatten(mod.en, '', e);
    const mkeys = Array.from(new Set([...Object.keys(z), ...Object.keys(e)]));
    for (const key of mkeys) {
      rows.push({ source: 'i18n(页面模块)', section, key: `${section}.${key}`, zh: z[key] ?? '', en: e[key] ?? '', note: '' });
    }
  }

  // 硬编码（未走 i18n）字符串：逐页 agent 扫描结果。已迁移页面跳过。
  const litPath = resolve(process.cwd(), 'docs/_hardcoded-literals.json');
  const lits = JSON.parse(readFileSync(litPath, 'utf8')) as { file: string; zh: string; en: string }[];
  const seen = new Set<string>();
  let n = 0;
  for (const lit of lits) {
    if (MIGRATED_FILES.has(lit.file)) continue;
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
