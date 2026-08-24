import { Sd4Dimension, Sd4DimensionMeta } from './sd4-types';

// SD4 四維元資料。名稱逐字照 SD4_20260804.xlsx（馬基維利主義/自戀/病態人格/虐待），
// 暱稱照 xlsx Remarks（Crafty/Special/Wild/Mean）。
// 配色沿用站內既有中性色系（同大五/HEXACO 報告用色風格）：
//   M=深藍（沿用 C 盡責深藍）、N=琥珀（沿用大五 E 琥珀）、P=鐵鏽紅、S=暗李紫。
// description 為簡短中性描述（非官方文案，待老闆審）。
export const SD4_DIMENSION_META: Record<Sd4Dimension, Sd4DimensionMeta> = {
  M: {
    key: 'M',
    name: '馬基維利主義',
    nameEn: 'Machiavellianism',
    nickname: 'Crafty',
    colorHex: '#2A4365',
    description: '策略性算計、操控傾向，以及為達目的而長期布局的行事風格',
  },
  N: {
    key: 'N',
    name: '自戀',
    nameEn: 'Narcissism',
    nickname: 'Special',
    colorHex: '#D97706',
    description: '自我優越感、對讚賞與關注的渴望，以及愛表現的傾向',
  },
  P: {
    key: 'P',
    name: '病態人格',
    nameEn: 'Psychopathy',
    nickname: 'Wild',
    colorHex: '#A6423A',
    description: '衝動、尋求刺激、對抗規範，以及低恐懼的傾向',
  },
  S: {
    key: 'S',
    name: '虐待',
    nameEn: 'Sadism',
    nickname: 'Mean',
    colorHex: '#5C4A72',
    description: '從他人的痛苦或衝突場面中獲得樂趣的傾向',
  },
};
