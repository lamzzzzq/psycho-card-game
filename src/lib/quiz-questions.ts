// 局末概念小測的出題邏輯（從 KnowledgeQuiz.tsx 抽出，便於單測）。
// 規則（2026-09-09 起）：每局 4 題 = 前 3 題從知識卡池隨機（看定義→選術語，各配 3 個干擾項）
//   + 第 4 題固定為「維度題」，從當前人格模型（大五/HEXACO/SD4）的 4 題題庫裏隨機抽 1 題。
// 維度題選項【不打亂】——照 xlsx 原順序，老闆已刻意把正解位置打散。

import { KNOWLEDGE_CARDS, type KnowledgeCard } from '@/data/dummy-cards';
import { DIMENSION_QUIZ_QUESTIONS, type QuizModel } from '@/data/quiz-dimension-questions';

export const CARD_QUESTION_COUNT = 3; // 知識卡題；再加 1 道維度題 = 每局 4 題

/** 兩種題源（知識卡 / 維度題）歸一化成同一結構，渲染只走一套邏輯。 */
export type Choice = { en: string; zh: string };
export type Question = {
  lead: Choice;    // 小字提問句
  body: Choice;    // 正文（被描述的定義）
  options: Choice[];
  answerIndex: number;
  /** 題源，供測試與日後統計用；UI 目前不區分。 */
  source: 'card' | 'dimension';
};

export const CARD_LEAD: Choice = { en: 'Which concept does this describe?', zh: '這是哪個概念的描述？' };

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const asChoice = (c: KnowledgeCard): Choice => ({ en: c.term, zh: c.termZh });

export function buildQuestions(model: QuizModel): Question[] {
  const pool = shuffle(KNOWLEDGE_CARDS);
  const cardQuestions: Question[] = pool.slice(0, CARD_QUESTION_COUNT).map((card) => {
    const distractors = shuffle(pool.filter((c) => c !== card)).slice(0, 3);
    const shuffled = shuffle([card, ...distractors]);
    return {
      lead: CARD_LEAD,
      body: { en: card.definition, zh: card.definitionZh },
      options: shuffled.map(asChoice),
      answerIndex: shuffled.indexOf(card),
      source: 'card' as const,
    };
  });

  const bank = DIMENSION_QUIZ_QUESTIONS[model];
  const d = bank[Math.floor(Math.random() * bank.length)];
  const dimensionQuestion: Question = {
    lead: { en: d.lead, zh: d.leadZh },
    body: { en: d.body, zh: d.bodyZh },
    options: d.options.map((en, i) => ({ en, zh: d.optionsZh[i] })),
    answerIndex: d.answerIndex,
    source: 'dimension',
  };

  return [...cardQuestions, dimensionQuestion];
}
