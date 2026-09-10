// 局末概念小測出題規則（2026-09-09）：4 題 = 3 題知識卡 + 第 4 題維度題。
// 題庫真相源＝老闆的 docs/Knowledge questions_20260910.xlsx（英文 3 個 sheet + 繁中 3 個 _C sheet）。
// 本檔管出題規則；題目文字與 xlsx 的逐字核對在 quiz-dimension-xlsx.test.ts。
import { describe, it, expect } from 'vitest';
import { buildQuestions, CARD_QUESTION_COUNT } from '@/lib/quiz-questions';
import { DIMENSION_QUIZ_QUESTIONS, type QuizModel } from '@/data/quiz-dimension-questions';

const MODELS: QuizModel[] = ['big-five', 'hexaco', 'sd4'];

// 逐題核對 xlsx F 欄「Correct Answer」，防止日後改動把正解索引改歪。
const EXPECTED_ANSWERS: Record<QuizModel, string[]> = {
  'big-five': ['Conscientiousness', 'Neuroticism', 'Extraversion', 'Agreeableness'],
  hexaco: ['Honesty–Humility', 'Emotionality', 'Agreeableness', 'Openness to Experience'],
  sd4: ['Psychopathy', 'Machiavellianism', 'Narcissism', 'Sadism'],
};

describe('維度題題庫', () => {
  it.each(MODELS)('%s 有 4 題，每題 4 個中英選項且正解索引在範圍內', (model) => {
    const bank = DIMENSION_QUIZ_QUESTIONS[model];
    expect(bank).toHaveLength(4);
    for (const q of bank) {
      expect(q.options).toHaveLength(4);
      expect(q.optionsZh).toHaveLength(4);
      expect(q.answerIndex).toBeGreaterThanOrEqual(0);
      expect(q.answerIndex).toBeLessThan(4);
      expect(new Set(q.options).size).toBe(4);   // 選項不重複
      expect(new Set(q.optionsZh).size).toBe(4);
      expect(q.lead && q.leadZh && q.body && q.bodyZh).toBeTruthy();
    }
  });

  it.each(MODELS)('%s 正解與 xlsx Correct Answer 一致', (model) => {
    const got = DIMENSION_QUIZ_QUESTIONS[model].map((q) => q.options[q.answerIndex]);
    expect(got).toEqual(EXPECTED_ANSWERS[model]);
  });
});

describe('buildQuestions', () => {
  it.each(MODELS)('%s：出 4 題，前 3 題來自知識卡、第 4 題來自維度題庫', (model) => {
    for (let run = 0; run < 30; run++) {
      const qs = buildQuestions(model);
      expect(qs).toHaveLength(CARD_QUESTION_COUNT + 1);
      expect(qs.slice(0, CARD_QUESTION_COUNT).every((q) => q.source === 'card')).toBe(true);

      const last = qs[CARD_QUESTION_COUNT];
      expect(last.source).toBe('dimension');
      const bank = DIMENSION_QUIZ_QUESTIONS[model];
      expect(bank.some((b) => b.body === last.body.en)).toBe(true);
      // 維度題選項順序照題庫原樣，不打亂
      const src = bank.find((b) => b.body === last.body.en)!;
      expect(last.options.map((o) => o.en)).toEqual(src.options);
      expect(last.answerIndex).toBe(src.answerIndex);
    }
  });

  it.each(MODELS)('%s：每題 4 個選項、正解在選項內、三題知識卡互不重複', (model) => {
    for (let run = 0; run < 30; run++) {
      const qs = buildQuestions(model);
      for (const q of qs) {
        expect(q.options).toHaveLength(4);
        expect(new Set(q.options.map((o) => o.en)).size).toBe(4); // 無重複干擾項
        expect(q.options[q.answerIndex]).toBeTruthy();
      }
      const cardBodies = qs.slice(0, CARD_QUESTION_COUNT).map((q) => q.body.en);
      expect(new Set(cardBodies).size).toBe(CARD_QUESTION_COUNT);
    }
  });

  it('4 題維度題都抽得到（隨機覆蓋）', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 300; i++) seen.add(buildQuestions('sd4')[CARD_QUESTION_COUNT].body.en);
    expect(seen.size).toBe(4);
  });
});
