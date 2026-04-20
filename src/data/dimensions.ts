import { Dimension, DimensionMeta } from '@/types';

export const DIMENSION_META: Record<Dimension, DimensionMeta> = {
  O: {
    key: 'O',
    name: '开放性',
    nameEn: 'Openness',
    colorHex: '#c084fc',
    description: '对新体验、创意和抽象思维的接纳程度',
    highLabel: '富有想象力、求知欲强',
    lowLabel: '务实保守、偏好熟悉事物',
  },
  C: {
    key: 'C',
    name: '尽责性',
    nameEn: 'Conscientiousness',
    colorHex: '#60a5fa',
    description: '自律、条理性和目标导向的程度',
    highLabel: '有条理、自律、可靠',
    lowLabel: '随性灵活、不拘小节',
  },
  E: {
    key: 'E',
    name: '外向性',
    nameEn: 'Extraversion',
    colorHex: '#facc15',
    description: '社交活力、积极情绪和外向程度',
    highLabel: '热情外向、精力充沛',
    lowLabel: '安静内敛、独立自处',
  },
  A: {
    key: 'A',
    name: '宜人性',
    nameEn: 'Agreeableness',
    colorHex: '#4ade80',
    description: '合作、信任和体贴他人的倾向',
    highLabel: '友善体贴、乐于助人',
    lowLabel: '独立竞争、直言不讳',
  },
  N: {
    key: 'N',
    name: '神经质',
    nameEn: 'Neuroticism',
    colorHex: '#f87171',
    description: '情绪波动、焦虑和压力敏感程度',
    highLabel: '情感丰富、敏感细腻',
    lowLabel: '情绪稳定、冷静淡定',
  },
};
