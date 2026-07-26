import { HexacoDimension, HexacoDimensionMeta } from './hexaco-types';

// HEXACO 六維元資料。名稱/描述取自 The HEXACO Model_20260723 科普文件（台灣中文版）。
export const HEXACO_DIMENSION_META: Record<HexacoDimension, HexacoDimensionMeta> = {
  H: {
    key: 'H',
    name: '誠實－謙遜',
    nameEn: 'Honesty-Humility',
    colorHex: '#2dd4bf',
    description: '真誠、公平、謙遜，以及不願為個人利益而利用他人的傾向',
  },
  E: {
    key: 'E',
    name: '情緒性',
    nameEn: 'Emotionality',
    colorHex: '#f87171',
    description: '恐懼、焦慮、情感依附、感性程度，以及對支持的需要',
  },
  X: {
    key: 'X',
    name: '外向性',
    nameEn: 'Extraversion',
    colorHex: '#facc15',
    description: '社交自信、社交性、活力與熱情',
  },
  A: {
    key: 'A',
    name: '宜人性',
    nameEn: 'Agreeableness',
    colorHex: '#4ade80',
    description: '耐性、寬恕、溫和，以及面對衝突時願意妥協的程度',
  },
  C: {
    key: 'C',
    name: '盡責性',
    nameEn: 'Conscientiousness',
    colorHex: '#60a5fa',
    description: '組織能力、勤奮、細心與自律',
  },
  O: {
    key: 'O',
    name: '開放性',
    nameEn: 'Openness',
    colorHex: '#c084fc',
    description: '好奇心、創造力、對藝術與美感的欣賞，以及對新穎觀念的興趣',
  },
};
