import { Dimension, DimensionMeta } from '@/types/hexaco-game';

// ── HEXACO 遊戲桌配色（沿用 Big Five 牌桌的莫蘭迪米金體系，物理隔離的平行副本）──
// 對應關係（概念相近的維度沿用同一色，玩家跨模式視覺不混亂）：
//   O 開放性   → teal（同 Big Five O）
//   C 盡責性   → navy（同 Big Five C）
//   X 外向性   → amber（同 Big Five E 外向性；HEXACO 的 E 不是外向性！）
//   A 宜人性   → coral（同 Big Five A）
//   E 情緒性   → lavender（概念最接近 Big Five N 神經質）
//   H 誠實-謙遜 → moss（新第 6 色：低飽和苔綠，與其他五色同明度檔）
// 硬約束沿用：情緒性(≈神經質)不用紅；宜人性不用綠 —— H 用綠不衝突（A 仍是 coral）。
// onAccentHex 五維統一反白的老闆決策同樣沿用到六維。
export const HEXACO_GAME_META: Record<Dimension, DimensionMeta> = {
  H: {
    key: 'H',
    name: '誠實謙遜',
    nameEn: 'Honesty-Humility',
    colorHex: '#5F7A46',
    tintHex: '#EFF3E7',
    inkHex: '#374A27',
    onAccentHex: '#ffffff',
    description: '真誠、公平、謙遜，不願為個人利益而利用他人的傾向',
  },
  E: {
    key: 'E',
    name: '情緒性',
    nameEn: 'Emotionality',
    colorHex: '#7E6C8F',
    tintHex: '#F0EBF4',
    inkHex: '#3F334A',
    onAccentHex: '#ffffff',
    description: '恐懼、焦慮、情感依附、感性程度，以及對支持的需要',
  },
  X: {
    key: 'X',
    name: '外向性',
    nameEn: 'Extraversion',
    colorHex: '#D97706',
    tintHex: '#FEF3C7',
    inkHex: '#78350F',
    onAccentHex: '#ffffff',
    description: '社交自信、社交性、活力與熱情',
  },
  A: {
    key: 'A',
    name: '宜人性',
    nameEn: 'Agreeableness',
    colorHex: '#E07A5F',
    tintHex: '#FDF0ED',
    inkHex: '#7A2E22',
    onAccentHex: '#ffffff',
    description: '耐性、寬恕、溫和，面對衝突時願意妥協的程度',
  },
  C: {
    key: 'C',
    name: '盡責性',
    nameEn: 'Conscientiousness',
    colorHex: '#2A4365',
    tintHex: '#EBF4FF',
    inkHex: '#1A2A40',
    onAccentHex: '#ffffff',
    description: '組織能力、勤奮、細心與自律',
  },
  O: {
    key: 'O',
    name: '開放性',
    nameEn: 'Openness',
    colorHex: '#2A9D8F',
    tintHex: '#E6F4F1',
    inkHex: '#1D5A52',
    onAccentHex: '#ffffff',
    description: '好奇心、創造力、對藝術與美感的欣賞',
  },
};
