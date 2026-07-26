'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { HexacoScores, LikertScore } from '@/data/hexaco-types';
import { HEXACO_QUESTIONS } from '@/data/hexaco-questions';
import { calculateHexacoScores } from '@/lib/hexaco-scoring';
import { normalizeStudentId } from '@/lib/utils';

// HEXACO 測評狀態（獨立於大五 useAssessmentStore；HEXACO 不接遊戲引擎，只做「測評→報告」）。
// persist name 'psycho-card-hexaco'，與大五 'psycho-card-assessment' 分開存。
// studentId：分數歸屬（登入態同步進來），供 HexacoSync 換帳號時防串號。
interface HexacoState {
  studentId: string | null;
  answers: Record<number, LikertScore>;
  scores: HexacoScores | null;
  completedAt: string | null;

  setStudentId: (id: string) => void;
  setAnswer: (questionId: number, score: LikertScore) => void;
  calculateScores: () => HexacoScores;
  setRestoredScores: (scores: HexacoScores) => void;
  reset: () => void;
  getProgress: () => number;
  isComplete: () => boolean;
}

export const useHexacoStore = create<HexacoState>()(
  persist(
    (set, get) => ({
      studentId: null,
      answers: {},
      scores: null,
      completedAt: null,

      setStudentId: (id) => set({ studentId: normalizeStudentId(id) }),

      setAnswer: (questionId, score) =>
        set((s) => ({ answers: { ...s.answers, [questionId]: score } })),

      calculateScores: () => {
        const scores = calculateHexacoScores(get().answers, HEXACO_QUESTIONS);
        set({ scores, completedAt: new Date().toISOString() });
        return scores;
      },

      // 从服务端拉回的分数直接写入（不重算），供 HexacoSync 换设备恢复用。
      setRestoredScores: (scores) => set({ scores, completedAt: new Date().toISOString() }),

      reset: () => set({ answers: {}, scores: null, completedAt: null }),

      getProgress: () => Object.keys(get().answers).length,

      isComplete: () => Object.keys(get().answers).length === HEXACO_QUESTIONS.length,
    }),
    { name: 'psycho-card-hexaco' }
  )
);
