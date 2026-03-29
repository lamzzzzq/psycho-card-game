import { Question } from '@/types';

/**
 * 60 道 Big Five 人格测评题目
 * 基于 IPIP (International Personality Item Pool) 方法论
 * 每个维度 12 题，6 正向 + 6 反向计分
 * 每个维度覆盖 6 个子面向 (facet)
 */
export const QUESTIONS: Question[] = [
  // ===== Openness 开放性 (O1-O12) =====
  { id: 1,  dimension: 'O', text: '我喜欢尝试新的事物和体验', reversed: false, facet: '冒险精神' },
  { id: 2,  dimension: 'O', text: '我对抽象的哲学问题很感兴趣', reversed: false, facet: '思辨能力' },
  { id: 3,  dimension: 'O', text: '我觉得艺术和美学对我很重要', reversed: false, facet: '审美感受' },
  { id: 4,  dimension: 'O', text: '我经常会有天马行空的想象', reversed: false, facet: '想象力' },
  { id: 5,  dimension: 'O', text: '我喜欢挑战传统观念和固有想法', reversed: false, facet: '求新意识' },
  { id: 6,  dimension: 'O', text: '我对不同文化和价值观持开放态度', reversed: false, facet: '包容性' },
  { id: 7,  dimension: 'O', text: '我不太喜欢接触陌生的事物', reversed: true, facet: '冒险精神' },
  { id: 8,  dimension: 'O', text: '我认为实用比创意更重要', reversed: true, facet: '想象力' },
  { id: 9,  dimension: 'O', text: '我更喜欢按照既定的方式做事', reversed: true, facet: '求新意识' },
  { id: 10, dimension: 'O', text: '我很少关注艺术或文学作品', reversed: true, facet: '审美感受' },
  { id: 11, dimension: 'O', text: '我对深奥的理论不感兴趣', reversed: true, facet: '思辨能力' },
  { id: 12, dimension: 'O', text: '我倾向于坚持自己熟悉的环境和习惯', reversed: true, facet: '包容性' },

  // ===== Conscientiousness 尽责性 (C1-C12) =====
  { id: 13, dimension: 'C', text: '我做事情之前总会制定详细的计划', reversed: false, facet: '计划性' },
  { id: 14, dimension: 'C', text: '我会认真完成我承诺过的每一件事', reversed: false, facet: '责任感' },
  { id: 15, dimension: 'C', text: '我的生活和工作空间总是整整齐齐的', reversed: false, facet: '条理性' },
  { id: 16, dimension: 'C', text: '我会为实现长远目标而坚持不懈地努力', reversed: false, facet: '成就动机' },
  { id: 17, dimension: 'C', text: '我能够抵制诱惑，专注于当前的任务', reversed: false, facet: '自律性' },
  { id: 18, dimension: 'C', text: '我做决定前会仔细权衡各种选择', reversed: false, facet: '审慎性' },
  { id: 19, dimension: 'C', text: '我经常拖延重要的事情', reversed: true, facet: '自律性' },
  { id: 20, dimension: 'C', text: '我有时候会忘记自己的承诺和义务', reversed: true, facet: '责任感' },
  { id: 21, dimension: 'C', text: '我的物品经常找不到放在哪里', reversed: true, facet: '条理性' },
  { id: 22, dimension: 'C', text: '我做事经常是想到什么就做什么，不太有规划', reversed: true, facet: '计划性' },
  { id: 23, dimension: 'C', text: '遇到困难时我容易半途而废', reversed: true, facet: '成就动机' },
  { id: 24, dimension: 'C', text: '我经常不假思索地做出决定', reversed: true, facet: '审慎性' },

  // ===== Extraversion 外向性 (E1-E12) =====
  { id: 25, dimension: 'E', text: '在社交场合中我感到精力充沛', reversed: false, facet: '社交活力' },
  { id: 26, dimension: 'E', text: '我喜欢成为众人关注的焦点', reversed: false, facet: '自信表达' },
  { id: 27, dimension: 'E', text: '我很容易和陌生人聊起来', reversed: false, facet: '社交能力' },
  { id: 28, dimension: 'E', text: '我喜欢参加热闹的聚会和活动', reversed: false, facet: '活动需求' },
  { id: 29, dimension: 'E', text: '我经常感到开心和充满活力', reversed: false, facet: '积极情绪' },
  { id: 30, dimension: 'E', text: '我喜欢带领别人，主导局面', reversed: false, facet: '支配性' },
  { id: 31, dimension: 'E', text: '在人多的环境中我会感到不自在', reversed: true, facet: '社交活力' },
  { id: 32, dimension: 'E', text: '我更喜欢安静地独处而不是社交', reversed: true, facet: '活动需求' },
  { id: 33, dimension: 'E', text: '我在群体中通常比较沉默', reversed: true, facet: '社交能力' },
  { id: 34, dimension: 'E', text: '我不太喜欢引起别人的注意', reversed: true, facet: '自信表达' },
  { id: 35, dimension: 'E', text: '我很少主动发起对话或活动', reversed: true, facet: '支配性' },
  { id: 36, dimension: 'E', text: '我的情绪通常比较平淡，不太容易兴奋', reversed: true, facet: '积极情绪' },

  // ===== Agreeableness 宜人性 (A1-A12) =====
  { id: 37, dimension: 'A', text: '我很容易信任别人', reversed: false, facet: '信任' },
  { id: 38, dimension: 'A', text: '我会主动帮助遇到困难的人', reversed: false, facet: '利他性' },
  { id: 39, dimension: 'A', text: '我在与人交往时总是坦诚相待', reversed: false, facet: '坦率性' },
  { id: 40, dimension: 'A', text: '看到别人受苦我会感到心疼', reversed: false, facet: '同理心' },
  { id: 41, dimension: 'A', text: '在发生冲突时我愿意妥协退让', reversed: false, facet: '顺从性' },
  { id: 42, dimension: 'A', text: '我对人总是很谦虚，不喜欢炫耀', reversed: false, facet: '谦逊性' },
  { id: 43, dimension: 'A', text: '我觉得大多数人都有自己的私心', reversed: true, facet: '信任' },
  { id: 44, dimension: 'A', text: '别人的问题不关我的事', reversed: true, facet: '利他性' },
  { id: 45, dimension: 'A', text: '我有时候会为了达到目的而隐瞒真相', reversed: true, facet: '坦率性' },
  { id: 46, dimension: 'A', text: '我认为人应该自己解决自己的问题', reversed: true, facet: '同理心' },
  { id: 47, dimension: 'A', text: '我在争论中很难让步', reversed: true, facet: '顺从性' },
  { id: 48, dimension: 'A', text: '我认为自己在很多方面比别人优秀', reversed: true, facet: '谦逊性' },

  // ===== Neuroticism 神经质 (N1-N12) =====
  { id: 49, dimension: 'N', text: '我经常感到焦虑和担忧', reversed: false, facet: '焦虑' },
  { id: 50, dimension: 'N', text: '我容易因为小事而生气或烦躁', reversed: false, facet: '愤怒' },
  { id: 51, dimension: 'N', text: '我时常感到悲伤或情绪低落', reversed: false, facet: '抑郁' },
  { id: 52, dimension: 'N', text: '我在社交场合中会感到不安和紧张', reversed: false, facet: '社交焦虑' },
  { id: 53, dimension: 'N', text: '我在压力下很难控制自己的冲动', reversed: false, facet: '冲动性' },
  { id: 54, dimension: 'N', text: '我觉得自己在面对困难时很脆弱', reversed: false, facet: '脆弱性' },
  { id: 55, dimension: 'N', text: '我很少感到紧张或不安', reversed: true, facet: '焦虑' },
  { id: 56, dimension: 'N', text: '我能够很好地控制自己的情绪', reversed: true, facet: '愤怒' },
  { id: 57, dimension: 'N', text: '我大部分时间都感到心情愉快', reversed: true, facet: '抑郁' },
  { id: 58, dimension: 'N', text: '在陌生人面前我也能保持自在', reversed: true, facet: '社交焦虑' },
  { id: 59, dimension: 'N', text: '我在压力下依然能冷静思考', reversed: true, facet: '冲动性' },
  { id: 60, dimension: 'N', text: '我在逆境中总能保持坚强', reversed: true, facet: '脆弱性' },
];
