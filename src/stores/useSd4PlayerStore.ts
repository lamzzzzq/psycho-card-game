'use client';

// SD4 PVP 玩家身份 store（usePlayerStore 的隔離副本，persist key 獨立）。

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Sd4Scores } from '@/types/sd4-game';
import { PlayerInfo } from '@/types/sd4-pvp';

interface Sd4PlayerStore {
  player: PlayerInfo | null;
  setPlayer: (player: PlayerInfo) => void;
  updateSd4: (sd4: Sd4Scores) => void;
  clear: () => void;
}

// Clear old localStorage format on load
if (typeof window !== 'undefined') {
  try {
    const stored = localStorage.getItem('psycho-card-sd4-player');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.state?.player?.nickname !== undefined) {
        localStorage.removeItem('psycho-card-sd4-player');
      }
    }
  } catch {}
}

export const useSd4PlayerStore = create<Sd4PlayerStore>()(
  persist(
    (set, get) => ({
      player: null,

      setPlayer: (player) => set({ player }),

      updateSd4: (sd4) => {
        const current = get().player;
        if (current) {
          set({ player: { ...current, sd4 } });
        }
      },

      clear: () => set({ player: null }),
    }),
    { name: 'psycho-card-sd4-player' }
  )
);
