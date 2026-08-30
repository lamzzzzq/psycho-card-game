/**
 * SD4 卡面專用的文字處理與字級模型（hexacoCardText.ts 的物理隔離副本）。**只被 Sd4Card 引用。**
 *
 * 為什麼沿用 HEXACO 那套而不是 Big Five 查表：SD4 題面長度介於兩者之間（中文最長 27、英文最長 74 字元），
 * 按實測字寬挑「放得下的最大一檔」對任意長度都穩，不需要重新標定查表。
 */

// ── 標點 ──────────────────────────────────────────────────────────────
// 題庫是中英混排維護的，英文題面裡混進了中文全形標點（最常見是彎引號 U+2019：I’m / don’t）。
// 卡面用中文字體排版，全形標點會佔滿一格、左右撐開明顯空隙，跟 Big Five 那批用 ASCII
// 直撇號的英文卡一眼就不一樣。渲染前一律換回 ASCII。
const EN_PUNCTUATION: Array<[RegExp, string]> = [
  [/[‘’‛＇]/g, "'"],
  [/[“”＂]/g, '"'],
  [/，|、/g, ', '],
  [/。/g, '. '],
  [/；/g, '; '],
  [/：/g, ': '],
  [/？/g, '? '],
  [/！/g, '! '],
  [/（/g, ' ('],
  [/）/g, ') '],
];

export function normalizeEnPunctuation(text: string): string {
  let out = text;
  for (const [pattern, replacement] of EN_PUNCTUATION) out = out.replace(pattern, replacement);
  return out.replace(/\s+/g, ' ').replace(/\s+([,.;:?!)\]])/g, '$1').trim();
}

/** 依語言取題面，去掉句尾句號（單獨佔一行太浪費），英文再統一標點。 */
export function resolveSd4Label(text: string, textEn: string | undefined, locale: 'zh' | 'en'): string {
  const raw = locale === 'en' ? (textEn ?? text) : text;
  const trimmed = raw.replace(/[。．.\s]+$/, '');
  return locale === 'en' ? normalizeEnPunctuation(trimmed) : trimmed;
}

// ── 字寬 ──────────────────────────────────────────────────────────────
/**
 * Noto Sans TC（600 字重）拉丁字形的前進寬度（em），canvas measureText 實測導出。
 * 純長度 × 平均字寬估不準 —— 同樣字數的句子實際行寬能差一成，而字級是靠估行數決定的，
 * 估錯一行就會溢出框外。字體換了才需要重測。
 */
const ADVANCE: Record<string, number> = {
  a: 0.591, b: 0.644, c: 0.527, d: 0.644, e: 0.581, f: 0.372, g: 0.597, h: 0.64,
  i: 0.304, j: 0.306, k: 0.604, l: 0.315, m: 0.964, n: 0.641, o: 0.626, p: 0.644,
  q: 0.644, r: 0.437, s: 0.495, t: 0.421, u: 0.637, v: 0.576, w: 0.863, x: 0.562,
  y: 0.574, z: 0.511,
  A: 0.641, B: 0.681, C: 0.656, D: 0.714, E: 0.615, F: 0.585, G: 0.717, H: 0.757,
  I: 0.33, J: 0.568, K: 0.686, L: 0.578, M: 0.853, N: 0.749, O: 0.77, P: 0.667,
  Q: 0.77, R: 0.682, S: 0.624, T: 0.625, U: 0.748, V: 0.619, W: 0.915, X: 0.627,
  Y: 0.58, Z: 0.613,
  '0': 0.59, '1': 0.59, '2': 0.59, '3': 0.59, '4': 0.59, '5': 0.59, '6': 0.59, '7': 0.59,
  '8': 0.59, '9': 0.59,
  ' ': 0.227, '.': 0.325, ',': 0.325, ';': 0.325, ':': 0.325, "'": 0.325, '"': 0.574, '!': 0.37,
  '?': 0.514, '(': 0.378, ')': 0.378, '-': 0.37, '–': 0.544, '—': 0.908, '/': 0.387, '&': 0.74,
  '%': 0.963,
};
const LATIN_FALLBACK = 0.62;
const CJK = /[⺀-鿿豈-﫿＀-￯]/;
const SPACE_EM = ADVANCE[' '];

function measureEm(text: string): number {
  let total = 0;
  for (const ch of text) total += ADVANCE[ch] ?? (CJK.test(ch) ? 1 : LATIN_FALLBACK);
  return total;
}

// ── 字級 ──────────────────────────────────────────────────────────────
/**
 * 底框文字面板的可用寬高（cqw = 卡寬的 1%）。與 Sd4Card 的 roomy 幾何對應：
 * 左右各留 7.5% → 寬 85；底框高 266 單位、上下內距共 16 → (266-16)/4 = 62.5。
 */
export const SD4_PANEL = { width: 85, height: 62.5 };

// 中文由 Intl.Segmenter 保證詞內不斷行，換行處會有零星留白，估算時加一成。
const ZH_WRAP_SLACK = 1.1;
// 估算誤差（kerning、字體回退）的安全邊際：寧可小一檔，也不能溢出框外。
const WIDTH_SAFETY = 0.99;
const HEIGHT_SAFETY = 0.99;

// 用固定階梯而不是連續縮放，是為了讓整頁的字級只出現幾種，不會參差。
const EN_STEPS = [9.4, 8.8, 8.2, 7.6, 7.1, 6.6, 6.1];
const ZH_STEPS = [9.5, 8.9, 8.3, 7.7, 7.2, 6.7];

function lineHeightFor(fontSize: number): number {
  if (fontSize >= 9) return 1.2;
  if (fontSize >= 8) return 1.17;
  return 1.14;
}

/** 英文：按實測字寬模擬貪心換行（詞內絕不斷開），回傳行數。maxEm = 一行放得下的寬度(em)。 */
function countEnLines(text: string, maxEm: number): number {
  const words = text.split(/\s+/).filter(Boolean);
  let lines = 1;
  let used = 0;
  for (const word of words) {
    const wordEm = measureEm(word);
    const next = used === 0 ? wordEm : used + SPACE_EM + wordEm;
    if (next > maxEm && used > 0) {
      lines += 1;
      used = wordEm;
    } else {
      used = next;
    }
  }
  return lines;
}

function longestWordEm(text: string): number {
  return Math.max(0, ...text.split(/\s+/).filter(Boolean).map(measureEm));
}

/** 題面必須完整呈現（不截斷、不省略號）：挑「放得下的最大一檔」字級。 */
export function getSd4TextLayout(label: string, locale: 'zh' | 'en') {
  const steps = locale === 'en' ? EN_STEPS : ZH_STEPS;
  const length = Array.from(label).length;
  const maxHeight = SD4_PANEL.height * HEIGHT_SAFETY;

  for (const fontSize of steps) {
    const lineHeight = lineHeightFor(fontSize);
    let lines: number;

    if (locale === 'en') {
      const maxEm = (SD4_PANEL.width / fontSize) * WIDTH_SAFETY;
      if (longestWordEm(label) > maxEm) continue; // 最長單詞塞不進一行 → 降檔，免得被硬切
      lines = countEnLines(label, maxEm);
    } else {
      lines = Math.ceil((length * ZH_WRAP_SLACK) / (SD4_PANEL.width / fontSize));
    }

    if (lines * fontSize * lineHeight <= maxHeight) {
      return { fontSize: `${fontSize}cqw`, lineHeight };
    }
  }

  const smallest = steps[steps.length - 1];
  return { fontSize: `${smallest}cqw`, lineHeight: lineHeightFor(smallest) };
}
