'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BigFiveScores, Dimension, LikertScore } from '@/types';
import { QUESTIONS } from '@/data/questions';
import { calculateBigFiveScores } from '@/lib/scoring';

interface AssessmentState {
  answers: Record<number, LikertScore>;
  bigFiveScores: BigFiveScores | null;
  completedAt: string | null;

  setAnswer: (questionId: number, score: LikertScore) => void;
  calculateScores: () => BigFiveScores;
  setManualScores: (scores: BigFiveScores) => void;
  reset: () => void;
  getProgress: () => number;
  isComplete: () => boolean;
  getDimensionProgress: (d: Dimension) => number;
}

export const useAssessmentStore = create<AssessmentState>()(
  persist(
    (set, get) => ({
      answers: {},
      bigFiveScores: null,
      completedAt: null,

      setAnswer: (questionId, score) => {
        set((state) => ({
          answers: { ...state.answers, [questionId]: score },
        }));
      },

      calculateScores: () => {
        const scores = calculateBigFiveScores(get().answers, QUESTIONS);
        set({ bigFiveScores: scores, completedAt: new Date().toISOString() });
        return scores;
      },

      setManualScores: (scores) => {
        set({ bigFiveScores: scores, completedAt: new Date().toISOString() });
      },

      reset: () => {
        set({ answers: {}, bigFiveScores: null, completedAt: null });
      },

      getProgress: () => Object.keys(get().answers).length,

      isComplete: () => Object.keys(get().answers).length === QUESTIONS.length,

      getDimensionProgress: (d) => {
        const answered = Object.keys(get().answers).map(Number);
        const dimensionQuestions = QUESTIONS.filter((q) => q.dimension === d);
        return dimensionQuestions.filter((q) => answered.includes(q.id)).length;
      },
    }),
    { name: 'psycho-card-assessment' }
  )
);
