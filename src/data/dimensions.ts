import { Dimension, DimensionMeta } from '@/types';

// ── OCEAN 配色（2026-07-30 老闆給的方案，取代原本的紫/藍/黃/綠/紅）──
// 每個維度三個角色：
//   colorHex  Main Accent      實色底 / 描邊 / 圖標 / 進度條
//   tintHex   Tile Background  格子底色（米金牌桌上要壓得住）
//   inkHex    Dark Text/Border 淺底上的文字與描邊（WCAG 對比度）
// 另外 onAccentHex = 壓在主色實底上的文字色，按實測對比度逐維挑：
//   teal 3.32 / navy 9.0 / lavender 4.75 配白；amber 2.85 / coral 3.18 配自家深棕
//   （這兩個是中間調，白字反而更低）。所以小字【不要】放在 amber/coral 實底上，
//   只有大字母壓實底，單詞一律放淺底 —— 見 FilingProgressCard。
// 兩條硬要求（同事）：神經質不用紅、宜人性不用綠。
export const DIMENSION_META: Record<Dimension, DimensionMeta> = {
  O: {
    key: 'O',
    name: '開放性',
    nameEn: 'Openness',
    colorHex: '#2A9D8F',
    tintHex: '#E6F4F1',
    inkHex: '#1D5A52',
    onAccentHex: '#ffffff',
    description: '對新體驗、創意和抽象思維的接納程度',
  },
  C: {
    key: 'C',
    name: '盡責性',
    nameEn: 'Conscientiousness',
    colorHex: '#2A4365',
    tintHex: '#EBF4FF',
    inkHex: '#1A2A40',
    onAccentHex: '#ffffff',
    description: '自律、條理性和目標導向的程度',
  },
  E: {
    key: 'E',
    name: '外向性',
    nameEn: 'Extraversion',
    colorHex: '#D97706',
    tintHex: '#FEF3C7',
    inkHex: '#78350F',
    onAccentHex: '#78350F',
    description: '社交活力、積極情緒和外向程度',
  },
  A: {
    key: 'A',
    name: '宜人性',
    nameEn: 'Agreeableness',
    colorHex: '#E07A5F',
    tintHex: '#FDF0ED',
    inkHex: '#7A2E22',
    onAccentHex: '#7A2E22',
    description: '合作、信任和體貼他人的傾向',
  },
  N: {
    key: 'N',
    // ⚠️ 2026-06 改用「神經質 / Neuroticism」計分（參考 Goldberg 1999 / Ehrhart et al. 2008）。
    // N 題正反向已對調，故此維度高分 = 情緒不穩、易焦慮緊張。
    name: '神經質',
    nameEn: 'Neuroticism',
    colorHex: '#7E6C8F',
    tintHex: '#F0EBF4',
    inkHex: '#3F334A',
    onAccentHex: '#ffffff',
    description: '情緒不穩、易焦慮緊張與情緒起伏的傾向',
  },
};
