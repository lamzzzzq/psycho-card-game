'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Sd4Scores, LikertScore } from '@/data/sd4-types';
import { SD4_QUESTIONS } from '@/data/sd4-questions';
import { calculateSd4Scores } from '@/lib/sd4-scoring';
import { normalizeStudentId } from '@/lib/utils';

// SD4 測評狀態（獨立於大五/HEXACO 的 store；SD4 不接遊戲引擎，只做「測評→報告」）。
// persist name 'psycho-card-sd4'，與 'psycho-card-assessment' / 'psycho-card-hexaco' 分開存。
// studentId：分數歸屬（登入態同步進來），供 Sd4Sync 換帳號時防串號。
// SD4 無對局門禁 → 無手動填分（setManualScores），其餘接口對齊 useHexacoStore。
interface Sd4State {
  studentId: string | null;
  answers: Record<number, LikertScore>;
  scores: Sd4Scores | null;
  completedAt: string | null;
  // 正在重测：保留旧 scores（报告不丢）直到新测评完成才覆盖。同 HEXACO。
  retaking: boolean;

  setStudentId: (id: string) => void;
  setAnswer: (questionId: number, score: LikertScore) => void;
  calculateScores: () => Sd4Scores;
  setRestoredScores: (scores: Sd4Scores) => void;
  startRetake: () => void;
  cancelRetake: () => void;
  reset: () => void;
  getProgress: () => number;
  isComplete: () => boolean;
}

export const useSd4Store = create<Sd4State>()(
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
        const scores = calculateSd4Scores(get().answers, SD4_QUESTIONS);
        set({ scores, completedAt: new Date().toISOString(), retaking: false });
        return scores;
      },

      // 从服务端拉回的分数直接写入（不重算），供 Sd4Sync 换设备恢复用。
      setRestoredScores: (scores) => set({ scores, completedAt: new Date().toISOString(), retaking: false }),

      // 非破坏式重测：只清答案 + 标记 retaking，保留旧 scores（报告不丢）。
      startRetake: () => set({ answers: {}, completedAt: null, retaking: true }),

      // 未答完就离开 → 作废本次重测：清 retaking + 半截答案，保留旧 scores。
      cancelRetake: () => set({ retaking: false, answers: {} }),

      reset: () => set({ answers: {}, scores: null, completedAt: null, retaking: false }),

      getProgress: () => Object.keys(get().answers).length,

      isComplete: () => Object.keys(get().answers).length === SD4_QUESTIONS.length,
    }),
    { name: 'psycho-card-sd4' }
  )
);
