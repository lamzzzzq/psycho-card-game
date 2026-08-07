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
  // 正在重测：保留旧 scores（报告不丢）直到新测评完成才覆盖。同大五 useAssessmentStore。
  retaking: boolean;

  setStudentId: (id: string) => void;
  setAnswer: (questionId: number, score: LikertScore) => void;
  calculateScores: () => HexacoScores;
  setManualScores: (scores: HexacoScores) => void;
  setRestoredScores: (scores: HexacoScores) => void;
  startRetake: () => void;
  cancelRetake: () => void;
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
      retaking: false,

      setStudentId: (id) => set({ studentId: normalizeStudentId(id) }),

      setAnswer: (questionId, score) =>
        set((s) => ({ answers: { ...s.answers, [questionId]: score } })),

      calculateScores: () => {
        const scores = calculateHexacoScores(get().answers, HEXACO_QUESTIONS);
        set({ scores, completedAt: new Date().toISOString(), retaking: false });
        return scores;
      },

      // 手動填分（跳過測評），同大五 setManualScores：直接覆蓋分數並結束重測態。
      setManualScores: (scores) => set({ scores, completedAt: new Date().toISOString(), retaking: false }),

      // 从服务端拉回的分数直接写入（不重算），供 HexacoSync 换设备恢复用。
      setRestoredScores: (scores) => set({ scores, completedAt: new Date().toISOString(), retaking: false }),

      // 非破坏式重测：只清答案 + 标记 retaking，保留旧 scores（报告不丢）。
      // 新测评答完（calculateScores）才覆盖；中途放弃（cancelRetake）旧分数仍在。
      startRetake: () => set({ answers: {}, completedAt: null, retaking: true }),

      // 未答完就离开 → 作废本次重测：清 retaking + 半截答案，保留旧 scores。
      cancelRetake: () => set({ retaking: false, answers: {} }),

      reset: () => set({ answers: {}, scores: null, completedAt: null, retaking: false }),

      getProgress: () => Object.keys(get().answers).length,

      isComplete: () => Object.keys(get().answers).length === HEXACO_QUESTIONS.length,
    }),
    { name: 'psycho-card-hexaco' }
  )
);
