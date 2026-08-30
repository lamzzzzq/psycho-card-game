import { Dimension, DimensionMeta } from '@/types/sd4-game';

// ── SD4 / Dark Tetrad 遊戲桌配色（沿用大五/HEXACO 牌桌的莫蘭迪米金體系，物理隔離的平行副本）──
// 主色沿用 SD4 報告頁 SD4_DIMENSION_META（src/data/sd4-dimensions.ts）已定的四色：
//   M 馬基維利主義 → navy #2A4365（同大五 C 深藍；tint/ink 沿用同色系）
//   N 自戀        → amber #D97706（同大五 E / HEXACO X 琥珀；tint/ink 沿用同色系）
//   P 病態人格     → rust #A6423A（鐵鏽紅，tint/ink 按 A coral 的明度檔新配）
//   S 虐待        → plum #5C4A72（暗李紫，tint/ink 按 HEXACO E lavender 的明度檔新配）
// 硬約束沿用：SD4 無「情緒性/神經質」維，紅色系不衝突。onAccentHex 統一反白（老闆決策沿用）。
export const SD4_GAME_META: Record<Dimension, DimensionMeta> = {
  M: {
    key: 'M',
    name: '馬基維利主義',
    nameEn: 'Machiavellianism',
    colorHex: '#2A4365',
    tintHex: '#EBF4FF',
    inkHex: '#1A2A40',
    onAccentHex: '#ffffff',
    description: '策略性算計、操控傾向，以及為達目的而長期布局的行事風格',
  },
  N: {
    key: 'N',
    name: '自戀',
    nameEn: 'Narcissism',
    colorHex: '#D97706',
    tintHex: '#FEF3C7',
    inkHex: '#78350F',
    onAccentHex: '#ffffff',
    description: '自我優越感、對讚賞與關注的渴望，以及愛表現的傾向',
  },
  P: {
    key: 'P',
    name: '病態人格',
    nameEn: 'Psychopathy',
    colorHex: '#A6423A',
    tintHex: '#F8ECEA',
    inkHex: '#5E241F',
    onAccentHex: '#ffffff',
    description: '衝動、尋求刺激、對抗規範，以及低恐懼的傾向',
  },
  S: {
    key: 'S',
    name: '虐待',
    nameEn: 'Sadism',
    colorHex: '#5C4A72',
    tintHex: '#EFEAF5',
    inkHex: '#332745',
    onAccentHex: '#ffffff',
    description: '從他人的痛苦或衝突場面中獲得樂趣的傾向',
  },
};
