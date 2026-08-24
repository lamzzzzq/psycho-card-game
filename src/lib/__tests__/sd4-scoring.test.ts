import { describe, it, expect } from 'vitest';
import { SD4_QUESTIONS } from '@/data/sd4-questions';
import { SD4_DIMENSIONS, LikertScore } from '@/data/sd4-types';
import { calculateSd4Scores } from '@/lib/sd4-scoring';

// SD4 题库结构 + 计分不变量（题库由脚本自 SD4_20260804.xlsx 生成，这里锁住关键结构防手改）。
describe('SD4 题库结构', () => {
  it('共 28 题，id 连续 1..28', () => {
    expect(SD4_QUESTIONS.length).toBe(28);
    expect(SD4_QUESTIONS.map((q) => q.id)).toEqual(Array.from({ length: 28 }, (_, i) => i + 1));
  });

  it('四维各 7 题，按 xlsx 分块排列（M 1–7 / N 8–14 / P 15–21 / S 22–28）', () => {
    for (const d of SD4_DIMENSIONS) {
      expect(SD4_QUESTIONS.filter((q) => q.dimension === d).length).toBe(7);
    }
    expect(SD4_QUESTIONS.slice(0, 7).every((q) => q.dimension === 'M')).toBe(true);
    expect(SD4_QUESTIONS.slice(7, 14).every((q) => q.dimension === 'N')).toBe(true);
    expect(SD4_QUESTIONS.slice(14, 21).every((q) => q.dimension === 'P')).toBe(true);
    expect(SD4_QUESTIONS.slice(21, 28).every((q) => q.dimension === 'S')).toBe(true);
  });
});

describe('SD4 计分（全部正向，无反向）', () => {
  const answerAll = (score: LikertScore) =>
    Object.fromEntries(SD4_QUESTIONS.map((q) => [q.id, score])) as Record<number, LikertScore>;

  it('全答 3 → 四维均 3', () => {
    expect(calculateSd4Scores(answerAll(3), SD4_QUESTIONS)).toEqual({ M: 3, N: 3, P: 3, S: 3 });
  });

  it('全答 5 → 四维均 5（正向计分：不做 6-raw 反转）', () => {
    expect(calculateSd4Scores(answerAll(5), SD4_QUESTIONS)).toEqual({ M: 5, N: 5, P: 5, S: 5 });
  });

  it('各维取该维 7 题平均，保留两位', () => {
    // M 维 7 题答 [1,2,3,4,5,1,2] = 18/7 ≈ 2.57，其余维全 4
    const answers = answerAll(4);
    const mIds = SD4_QUESTIONS.filter((q) => q.dimension === 'M').map((q) => q.id);
    const pattern: LikertScore[] = [1, 2, 3, 4, 5, 1, 2];
    mIds.forEach((id, i) => { answers[id] = pattern[i]; });
    const scores = calculateSd4Scores(answers, SD4_QUESTIONS);
    expect(scores.M).toBe(Math.round((18 / 7) * 100) / 100);
    expect(scores.N).toBe(4);
    expect(scores.P).toBe(4);
    expect(scores.S).toBe(4);
  });
});
