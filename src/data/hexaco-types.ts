// HEXACO 模型的類型（獨立於大五 Big Five 類型，避免污染遊戲引擎的 Dimension）。
// 6 維：H 誠實-謙遜 / E 情緒性 / X 外向性 / A 宜人性 / C 盡責性 / O 開放性。
// ⚠️ 字母鍵沿用 HEXACO 學術慣例：E = Emotionality（情緒性）、X = eXtraversion（外向性）。
//    與大五的 E(外向)/N(神經質) 不同，請勿混用。

export type HexacoDimension = 'H' | 'E' | 'X' | 'A' | 'C' | 'O';

// HEXACO 首字母順序
export const HEXACO_DIMENSIONS: HexacoDimension[] = ['H', 'E', 'X', 'A', 'C', 'O'];

export type LikertScore = 1 | 2 | 3 | 4 | 5;

export interface HexacoQuestion {
  id: number;
  dimension: HexacoDimension;
  reversed: boolean;
  text: string; // 繁中
  textEn: string; // 英文
}

// 每維平均分（1–5，一位小數）
export type HexacoScores = Record<HexacoDimension, number>;

export interface HexacoDimensionMeta {
  key: HexacoDimension;
  name: string; // 繁中
  nameEn: string;
  colorHex: string;
  description: string;
}
