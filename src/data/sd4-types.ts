// SD4（Short Dark Tetrad 暗黑四特質）模型的類型（獨立於大五/HEXACO，互不引用）。
// 4 維：M 馬基維利主義 / N 自戀 / P 病態人格 / S 虐待。
// ⚠️ SD4 全部正向計分（xlsx 明示「全部正向計分，無反向計分」），題目結構不帶 reversed。

export type Sd4Dimension = 'M' | 'N' | 'P' | 'S';

// xlsx 題序即此順序：馬基維利主義 → 自戀 → 病態人格 → 虐待
export const SD4_DIMENSIONS: Sd4Dimension[] = ['M', 'N', 'P', 'S'];

export type LikertScore = 1 | 2 | 3 | 4 | 5;

export interface Sd4Question {
  id: number;
  dimension: Sd4Dimension;
  text: string; // 繁中（張益慈等，2021）
  textEn: string; // 英文（Paulhus et al., 2021）
}

// 每維平均分（1–5）
export type Sd4Scores = Record<Sd4Dimension, number>;

export interface Sd4DimensionMeta {
  key: Sd4Dimension;
  name: string; // 繁中
  nameEn: string;
  nickname: string; // 原量表暱稱（Crafty/Special/Wild/Mean，xlsx Remarks）
  colorHex: string;
  description: string;
}
