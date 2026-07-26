'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { HexacoScores, LikertScore } from '@/data/hexaco-types';
import { HEXACO_QUESTIONS } from '@/data/hexaco-questions';
import { calculateHexacoScores } from '@/lib/hexaco-scoring';

// HEXACO 測評狀態（獨立於大五 useAssessmentStore；HEXACO 不接遊戲引擎，只做「測評→報告」）。
// persist name 'psycho-card-hexaco'，與大五 'psycho-card-assessment' 分開存。
interface HexacoState {
  answers: Record<number, LikertScore>;
  scores: HexacoScores | null;
  completedAt: string | null;

  setAnswer: (questionId: number, score: LikertScore) => void;
  calculateScores: () => HexacoScores;
  reset: () => void;
  getProgress: () => number;
  isComplete: () => boolean;
}

export const useHexacoStore = create<HexacoState>()(
  persist(
    (set, get) => ({
      answers: {},
      scores: null,
      completedAt: null,

      setAnswer: (questionId, score) =>
        set((s) => ({ answers: { ...s.answers, [questionId]: score } })),

      calculateScores: () => {
        const scores = calculateHexacoScores(get().answers, HEXACO_QUESTIONS);
        set({ scores, completedAt: new Date().toISOString() });
        return scores;
      },

      reset: () => set({ answers: {}, scores: null, completedAt: null }),

      getProgress: () => Object.keys(get().answers).length,

      isComplete: () => Object.keys(get().answers).length === HEXACO_QUESTIONS.length,
    }),
    { name: 'psycho-card-hexaco' }
  )
);
