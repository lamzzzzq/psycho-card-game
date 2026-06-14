import { Dimension, DimensionMeta } from '@/types';

export const DIMENSION_META: Record<Dimension, DimensionMeta> = {
  O: {
    key: 'O',
    name: '開放性',
    nameEn: 'Openness',
    colorHex: '#c084fc',
    description: '對新體驗、創意和抽象思維的接納程度',
    highLabel: '富有想象力、求知慾強',
    lowLabel: '務實保守、偏好熟悉事物',
  },
  C: {
    key: 'C',
    name: '盡責性',
    nameEn: 'Conscientiousness',
    colorHex: '#60a5fa',
    description: '自律、條理性和目標導向的程度',
    highLabel: '有條理、自律、可靠',
    lowLabel: '隨性靈活、不拘小節',
  },
  E: {
    key: 'E',
    name: '外向性',
    nameEn: 'Extraversion',
    colorHex: '#facc15',
    description: '社交活力、積極情緒和外向程度',
    highLabel: '熱情外向、精力充沛',
    lowLabel: '安靜內斂、獨立自處',
  },
  A: {
    key: 'A',
    name: '宜人性',
    nameEn: 'Agreeableness',
    colorHex: '#4ade80',
    description: '合作、信任和體貼他人的傾向',
    highLabel: '友善體貼、樂於助人',
    lowLabel: '獨立競爭、直言不諱',
  },
  N: {
    key: 'N',
    // ⚠️ IPIP-50 文件按「情緒穩定」方向 keying（放鬆/不憂鬱為正向計分），
    // 故此維度高分 = 情緒穩定冷靜，標籤改為「情緒穩定性 / Emotional Stability」。
    name: '情緒穩定性',
    nameEn: 'Emotional Stability',
    colorHex: '#f87171',
    description: '情緒平穩、抗壓和不易焦慮的程度',
    highLabel: '情緒穩定、冷靜淡定',
    lowLabel: '情感敏感、易受情緒波動',
  },
};
