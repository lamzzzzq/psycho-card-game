'use client';

import { create } from 'zustand';
import { GameState, GameSettings, BigFiveScores, PlayerId, Player } from '@/types';
import { initializeGame, drawCard, discardCard, getPlayerScore, getRankings } from '@/lib/game-logic';
import { makeAIDecision } from '@/lib/ai-engine';
import { delay } from '@/lib/utils';

interface GameStore {
  game: GameState | null;

  // Setup
  initGame: (humanScores: BigFiveScores, settings: GameSettings) => void;

  // Turn actions
  playerDraw: () => void;
  playerDiscard: (cardId: number) => void;
  executeAITurn: () => Promise<void>;

  // Queries
  getCurrentPlayer: () => Player | null;
  getScore: (id: PlayerId) => number;
  getPlayerRankings: () => Player[];

  // Reset
  resetGame: () => void;
}

export const useGameStore = create<GameStore>()((set, get) => ({
  game: null,

  initGame: (humanScores, settings) => {
    set({ game: initializeGame(humanScores, settings) });
  },

  playerDraw: () => {
    const { game } = get();
    if (!game || game.phase !== 'drawing') return;
    set({ game: drawCard(game) });
  },

  playerDiscard: (cardId) => {
    const { game } = get();
    if (!game || game.phase !== 'discarding' || !game.drawnCard) return;
    const newState = discardCard(game, cardId);
    set({ game: newState });
  },

  executeAITurn: async () => {
    const { game } = get();
    if (!game) return;

    // Draw phase for AI
    const afterDraw = drawCard(game);
    set({ game: afterDraw });

    const currentPlayer = afterDraw.players[afterDraw.currentPlayerIndex];
    const drawnCard = afterDraw.drawnCard;
    if (!drawnCard) return;

    // AI decides what to discard
    const decision = makeAIDecision(currentPlayer, drawnCard, game.settings.aiDifficulty, {
      discardPile: afterDraw.discardPile,
      actionLog: afterDraw.actionLog,
      currentRound: afterDraw.currentRound,
      totalRounds: afterDraw.settings.totalRounds,
    });

    // Simulate thinking time
    await delay(decision.thinkingMs);

    // Execute discard — re-read latest state to avoid stale reference
    const latestGame = get().game;
    if (!latestGame || !latestGame.drawnCard) return;
    const afterDiscard = discardCard(latestGame, decision.cardToDiscard.id);
    set({ game: afterDiscard });
  },

  getCurrentPlayer: () => {
    const { game } = get();
    if (!game) return null;
    return game.players[game.currentPlayerIndex];
  },

  getScore: (id) => {
    const { game } = get();
    if (!game) return 0;
    const player = game.players.find((p) => p.id === id);
    if (!player) return 0;
    return getPlayerScore(player);
  },

  getPlayerRankings: () => {
    const { game } = get();
    if (!game) return [];
    return getRankings(game.players);
  },

  resetGame: () => {
    set({ game: null });
  },
}));
