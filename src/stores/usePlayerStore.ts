'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { BigFiveScores } from '@/types';
import { PlayerInfo } from '@/types/pvp';

interface PlayerStore {
  player: PlayerInfo | null;
  setPlayer: (player: PlayerInfo) => void;
  updateBigFive: (bigFive: BigFiveScores) => void;
  clear: () => void;
}

// Clear old localStorage format on load
if (typeof window !== 'undefined') {
  try {
    const stored = localStorage.getItem('psycho-card-player');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.state?.player?.nickname !== undefined) {
        localStorage.removeItem('psycho-card-player');
      }
    }
  } catch {}
}

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set, get) => ({
      player: null,

      setPlayer: (player) => set({ player }),

      updateBigFive: (bigFive) => {
        const current = get().player;
        if (current) {
          set({ player: { ...current, bigFive } });
        }
      },

      clear: () => set({ player: null }),
    }),
    { name: 'psycho-card-player' }
  )
);
