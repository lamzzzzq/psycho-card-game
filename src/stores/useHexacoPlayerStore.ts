'use client';

// HEXACO PVP 玩家身份 store（usePlayerStore 的隔離副本，persist key 獨立）。

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { HexacoScores } from '@/types/hexaco-game';
import { PlayerInfo } from '@/types/hexaco-pvp';

interface HexacoPlayerStore {
  player: PlayerInfo | null;
  setPlayer: (player: PlayerInfo) => void;
  updateHexaco: (hexaco: HexacoScores) => void;
  clear: () => void;
}

// Clear old localStorage format on load
if (typeof window !== 'undefined') {
  try {
    const stored = localStorage.getItem('psycho-card-hexaco-player');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.state?.player?.nickname !== undefined) {
        localStorage.removeItem('psycho-card-hexaco-player');
      }
    }
  } catch {}
}

export const useHexacoPlayerStore = create<HexacoPlayerStore>()(
  persist(
    (set, get) => ({
      player: null,

      setPlayer: (player) => set({ player }),

      updateHexaco: (hexaco) => {
        const current = get().player;
        if (current) {
          set({ player: { ...current, hexaco } });
        }
      },

      clear: () => set({ player: null }),
    }),
    { name: 'psycho-card-hexaco-player' }
  )
);
