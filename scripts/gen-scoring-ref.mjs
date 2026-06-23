// 生成 IPIP-50 计分对照清单（供方法学核对）：docs/SCORING_REFERENCE.csv + .md
// 真相源：src/data/questions.ts(题目+正反向) + src/data/dimensions.ts(维度标签)。与游戏实际计分一致。
// 用法：node scripts/gen-scoring-ref.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const q = readFileSync(resolve(root, 'src/data/questions.ts'), 'utf8');
const items = [];
for (const m of q.matchAll(/\{ id: (\d+), dimension: '([OCEAN])', reversed: (true|false), text: '((?:[^'\\]|\\.)*)', textEn: '((?:[^'\\]|\\.)*)' \}/g)) {
  items.push({ id: +m[1], dim: m[2], reversed: m[3] === 'true', zh: m[4].replace(/\\'/g, "'"), en: m[5].replace(/\\'/g, "'") });
}
const d = readFileSync(resolve(root, 'src/data/dimensions.ts'), 'utf8');
const labels = {};
for (const m of d.matchAll(/key: '([OCEAN])',[\s\S]*?name: '([^']+)',\s*nameEn: '([^']+)'/g)) labels[m[1]] = { zh: m[2], en: m[3] };
const DIMS = ['O', 'C', 'E', 'A', 'N'];
items.sort((a, b) => a.id - b.id);

const esc = (s) => `"${String(s).replace(/"/g, '""')}"`;
let csv = '﻿' + ['id', 'Dimension', '維度', 'Keyed', 'Scoring', 'English item', '中文題面'].map(esc).join(',') + '\r\n';
for (const it of items) csv += [it.id, labels[it.dim].en, labels[it.dim].zh, it.reversed ? '− (reverse-keyed)' : '+ (positive)', it.reversed ? '6 − raw' : 'raw (as-is)', it.en, it.zh].map(esc).join(',') + '\r\n';
writeFileSync(resolve(root, 'docs/SCORING_REFERENCE.csv'), csv);

let md = '# IPIP-50 计分对照（代码真相源自动生成）\n\n';
md += '> 自动从 `src/data/questions.ts` + `src/data/dimensions.ts` 生成，与游戏实际计分**完全一致**。\n';
md += '> 生成命令：`node scripts/gen-scoring-ref.mjs`。\n\n';
md += '## 计分规则\n';
md += '- 每题原始作答 raw ∈ {1,2,3,4,5}（Likert：非常不同意→非常同意）。\n';
md += '- **正向题(+ keyed)**：得分 = raw。**反向题(− keyed)**：得分 = 6 − raw。\n';
md += '- 维度分 = 该维度 10 题（按上式处理后）的**均值**，保留 1 位小数。\n';
md += '- 该维度「目标张数」= round(维度分)，下限 1（游戏用，不影响分数本身）。\n\n';
md += '## 各维度 正/反向 一览（核对用）\n\n';
md += '| 维度 | Dimension | 正向题(+ raw) | 反向题(− 6−raw) |\n|---|---|---|---|\n';
for (const dd of DIMS) {
  const pos = items.filter((i) => i.dim === dd && !i.reversed).map((i) => i.id);
  const rev = items.filter((i) => i.dim === dd && i.reversed).map((i) => i.id);
  md += `| ${labels[dd].zh} | ${labels[dd].en} | ${pos.join(', ')} | ${rev.join(', ')} |\n`;
}
md += '\n> 注：N 维度按 **Neuroticism** 计分 —— 第 9、19 反向；4,14,24,29,34,39,44,49 正向（2 反 8 正，参 Goldberg 1999 / Ehrhart et al. 2008）。\n\n';
md += '## 全 50 题逐条\n\n| id | 维度 | Keyed | English item | 中文題面 |\n|---|---|---|---|---|\n';
for (const it of items) md += `| ${it.id} | ${labels[it.dim].en} | ${it.reversed ? '−' : '+'} | ${it.en} | ${it.zh} |\n`;
writeFileSync(resolve(root, 'docs/SCORING_REFERENCE.md'), md);
console.log('✓ docs/SCORING_REFERENCE.csv + .md ·', items.length, 'items');
