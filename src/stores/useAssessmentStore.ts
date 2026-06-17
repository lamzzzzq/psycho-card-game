'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BigFiveScores, Dimension, LikertScore } from '@/types';
import { QUESTIONS } from '@/data/questions';
import { calculateBigFiveScores } from '@/lib/scoring';

interface AssessmentState {
  studentId: string | null;
  answers: Record<number, LikertScore>;
  bigFiveScores: BigFiveScores | null;
  completedAt: string | null;
  // 正在重测：保留旧 bigFiveScores（报告不丢）直到新测评完成才覆盖。
  retaking: boolean;

  setStudentId: (id: string) => void;
  setAnswer: (questionId: number, score: LikertScore) => void;
  calculateScores: () => BigFiveScores;
  setManualScores: (scores: BigFiveScores) => void;
  startRetake: () => void;
  reset: () => void;
  getProgress: () => number;
  isComplete: () => boolean;
  getDimensionProgress: (d: Dimension) => number;
}

export const useAssessmentStore = create<AssessmentState>()(
  persist(
    (set, get) => ({
      studentId: null,
      answers: {},
      bigFiveScores: null,
      completedAt: null,
      retaking: false,

      setStudentId: (id) => set({ studentId: id.trim() }),

      setAnswer: (questionId, score) => {
        set((state) => ({
          answers: { ...state.answers, [questionId]: score },
        }));
      },

      calculateScores: () => {
        const scores = calculateBigFiveScores(get().answers, QUESTIONS);
        set({ bigFiveScores: scores, completedAt: new Date().toISOString(), retaking: false });
        return scores;
      },

      setManualScores: (scores) => {
        set({ bigFiveScores: scores, completedAt: new Date().toISOString(), retaking: false });
      },

      // 非破坏式重测：只清答案、进度归零、标记 retaking；保留旧分数(报告不丢)。
      // 新测评答完(calculateScores/setManualScores)才覆盖；中途放弃则旧分数仍在。
      startRetake: () => {
        set({ answers: {}, completedAt: null, retaking: true });
      },

      reset: () => {
        set({ answers: {}, bigFiveScores: null, completedAt: null, retaking: false });
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
