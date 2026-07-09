// Lightmode「暖紙米白」token（复用配色评审定稿方向，A 方向：内容白·外框深）
export const T = {
  ink: '#3a3020',
  inkSoft: '#6b5a3f',
  muted: '#9a8a68',
  gold: '#c39a52',
  goldSoft: 'rgba(195,154,82,0.16)',
  cardLine: '#9a7448',
  cardLineSoft: 'rgba(154,116,72,0.7)',
  // 桌布（页面背景）
  page: 'linear-gradient(180deg,#f4edd9 0%,#ede5cd 46%,#e6ddc3 100%)',
  // 卡：外框(mid) + 内容(light)
  shell: ['#eaddc4', '#e3d5b8', '#dccdae'] as const,
  content: ['#fdf8f1', '#f8f1e4', '#f2ead9'] as const,
  serif: "'Songti SC','Noto Serif TC','Times New Roman',Georgia,serif",
};

// 五维度：英文名 + 糖果色（与游戏 DIMENSION_META 一致）
export const DIMS = [
  { k: 'O', en: 'Openness', color: '#c084fc' },
  { k: 'C', en: 'Conscientiousness', color: '#60a5fa' },
  { k: 'E', en: 'Extraversion', color: '#facc15' },
  { k: 'A', en: 'Agreeableness', color: '#4ade80' },
  { k: 'N', en: 'Neuroticism', color: '#f87171' },
] as const;

export type DimKey = (typeof DIMS)[number]['k'];
export const dimColor = (k: DimKey) => DIMS.find((d) => d.k === k)!.color;
export const dimName = (k: DimKey) => DIMS.find((d) => d.k === k)!.en;

// 视频用真实卡牌数据（textEn 卡面）
export const CARDS = {
  E1: { id: 1, dim: 'E' as DimKey, text: 'I am the life of the party.' },
  E11: { id: 11, dim: 'E' as DimKey, text: 'I feel comfortable around people.' },
  E6: { id: 6, dim: 'E' as DimKey, text: "I don't talk a lot." },
  C3: { id: 3, dim: 'C' as DimKey, text: 'I am always prepared.' },
  A7: { id: 7, dim: 'A' as DimKey, text: 'I am interested in people.' },
  O5: { id: 5, dim: 'O' as DimKey, text: 'I have a rich vocabulary.' },
  N4: { id: 4, dim: 'N' as DimKey, text: 'I get stressed out easily.' },
};
export const KNOWLEDGE = {
  term: "Erikson's Psychosocial Stages of Development",
  def: 'Eight lifelong developmental stages centered on unique psychosocial crises.',
};
