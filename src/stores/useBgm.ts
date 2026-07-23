'use client';

// 背景音乐开关（持久化，默认关）。默认关也满足浏览器 autoplay 政策——
// 需用户点一下才播放。音频文件放 public/audio/bgm.mp3（占位，待放正式音乐）。
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface BgmState {
  enabled: boolean;
  toggle: () => void;
  setEnabled: (v: boolean) => void;
}

export const useBgm = create<BgmState>()(
  persist(
    (set) => ({
      enabled: false,
      toggle: () => set((s) => ({ enabled: !s.enabled })),
      setEnabled: (v) => set({ enabled: v }),
    }),
    { name: 'pm-bgm' },
  ),
);
