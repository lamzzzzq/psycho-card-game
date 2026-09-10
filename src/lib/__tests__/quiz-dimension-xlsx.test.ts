// 維度題 ↔ 老闆 xlsx 逐字核對（2026-09-10）。
// 直接讀 `docs/Knowledge questions_20260910.xlsx`，把六個 sheet 的每一題跟
// `src/data/quiz-dimension-questions.ts` 逐欄比對：提問句、描述、四個選項、正解，中英兩種語言都核。
// 老闆日後更新 xlsx：不用改程式，直接指定新檔跑一次——
//   QUIZ_XLSX="docs/Knowledge questions_2026xxxx.xlsx" npx vitest run quiz-dimension-xlsx
// 紅的就是遊戲裏跟 xlsx 不一致的地方（訊息會寫明 sheet / 第幾行 / 哪一欄）；確認新版後再把下面的預設路徑換成新檔。
//
// 允許的差異只有三種機械處理（見 quiz-dimension-questions.ts 檔頭）：
//   去選項 "A. " 前綴；去描述首尾引號（“ ” " 「 」）；描述內換行併成一個空格。
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { describe, it, expect } from 'vitest';
import { DIMENSION_QUIZ_QUESTIONS, type QuizModel } from '@/data/quiz-dimension-questions';

const XLSX = path.resolve(process.cwd(), process.env.QUIZ_XLSX ?? 'docs/Knowledge questions_20260910.xlsx');

const SHEETS: Record<QuizModel, { en: string; zh: string }> = {
  'big-five': { en: 'Big five', zh: 'Big five_C' },
  hexaco: { en: 'HEXACO', zh: 'HEXACO_C' },
  sd4: { en: 'SD4', zh: 'SD4_C' },
};

// ── 最小 xlsx 讀取器：xlsx 就是 zip 包 XML，用系統 unzip 取檔、正則取值（不為一個測試引第三方庫）──
const unzip = (entry: string) => execFileSync('unzip', ['-p', XLSX, entry], { encoding: 'utf8', maxBuffer: 64 << 20 });
const decode = (s: string) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&amp;/g, '&');
const texts = (xml: string) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decode(m[1])).join('');

function readSheets(): Map<string, string[][]> {
  const shared = [...unzip('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => texts(m[1]));
  const rels = new Map([...unzip('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b[^>]*>/g)].map((m) => [
    /Id="([^"]+)"/.exec(m[0])![1],
    /Target="([^"]+)"/.exec(m[0])![1].replace(/^\/?(xl\/)?/, 'xl/'),
  ]));
  const out = new Map<string, string[][]>();
  for (const [tag] of unzip('xl/workbook.xml').matchAll(/<sheet\b[^>]*\/>/g)) {
    const name = decode(/name="([^"]+)"/.exec(tag)![1]);
    const file = rels.get(/r:id="([^"]+)"/.exec(tag)![1])!;
    const rows: string[][] = [];
    for (const [, body] of unzip(file).matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
      const row: string[] = [];
      for (const cell of body.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = cell[1];
        const inner = cell[2] ?? '';
        const ref = /r="([A-Z]+)\d+"/.exec(attrs)![1];
        const col = [...ref].reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
        const v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
        const type = /\bt="([^"]+)"/.exec(attrs)?.[1];
        row[col] = type === 's' ? shared[Number(v)] : type === 'inlineStr' ? texts(inner) : decode(v ?? '');
      }
      if (row.some((c) => c && c.trim())) rows.push(Array.from(row, (c) => c ?? ''));
    }
    out.set(name, rows);
  }
  return out;
}

// ── 三種允許的機械處理 ──
const stripOption = (s: string) => s.trim().replace(/^[A-D]\.\s*/, '');
const stripQuotes = (s: string) => s.trim().replace(/^[“"「]+/, '').replace(/[”"」]+$/, '').trim();
/** Question 格 = 提問句 + 空行 + 描述 */
function splitQuestion(cell: string) {
  const [lead, ...rest] = cell.split(/\r?\n\s*\r?\n/);
  return { lead: lead.trim(), body: stripQuotes(rest.join('\n').replace(/\s*\r?\n\s*/g, ' ')) };
}

const sheets = readSheets();
const MODELS = Object.keys(SHEETS) as QuizModel[];

describe('維度題 ↔ docs/Knowledge questions_20260910.xlsx 逐字一致', () => {
  it('六個 sheet 都在', () => {
    for (const m of MODELS) {
      expect(sheets.has(SHEETS[m].en), `缺 sheet「${SHEETS[m].en}」`).toBe(true);
      expect(sheets.has(SHEETS[m].zh), `缺 sheet「${SHEETS[m].zh}」`).toBe(true);
    }
  });

  for (const m of MODELS) {
    for (const lang of ['en', 'zh'] as const) {
      const sheet = SHEETS[m][lang];
      it(`${sheet}：題數、提問句、描述、選項、正解`, () => {
        const [, ...data] = sheets.get(sheet)!; // 第 1 行是表頭
        const bank = DIMENSION_QUIZ_QUESTIONS[m];
        expect(data.length, `${sheet} 題數`).toBe(bank.length);
        data.forEach((row, i) => {
          const at = `${sheet} 第 ${i + 2} 行`;
          const q = bank[i];
          const { lead, body } = splitQuestion(row[0]);
          const options = row.slice(1, 5).map(stripOption);
          const answer = stripOption(row[5]);
          const got = lang === 'en'
            ? { lead: q.lead, body: q.body, options: q.options }
            : { lead: q.leadZh, body: q.bodyZh, options: q.optionsZh };
          expect(got.lead, `${at} 提問句`).toBe(lead);
          expect(got.body, `${at} 描述`).toBe(body);
          expect(got.options, `${at} 選項（含順序）`).toEqual(options);
          expect(got.options[q.answerIndex], `${at} 正解`).toBe(answer);
        });
      });
    }
  }
});
