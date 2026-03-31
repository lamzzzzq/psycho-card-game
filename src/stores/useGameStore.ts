'use client';

import { create } from 'zustand';
import { GameState, GameSettings, BigFiveScores, PlayerId, Player, Dimension, GameAction } from '@/types';
import {
  initializeGame,
  drawCard,
  discardCard,
  declareCards,
  skipDeclare,
  getPlayerScore,
  getRankings,
} from '@/lib/game-logic';
import { makeAIDecision, makeAIDeclareDecision } from '@/lib/ai-engine';
import { delay } from '@/lib/utils';

interface GameStore {
  game: GameState | null;

  // Setup
  initGame: (humanScores: BigFiveScores, settings: GameSettings) => void;

  // Turn actions
  playerDeclare: (dimension: Dimension, cardIds: number[]) => void;
  playerSkipDeclare: () => void;
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

  playerDeclare: (dimension, cardIds) => {
    const { game } = get();
    if (!game || game.phase !== 'declaring') return;
    const newState = declareCards(game, dimension, cardIds);
    set({ game: newState });
  },

  playerSkipDeclare: () => {
    const { game } = get();
    if (!game || game.phase !== 'declaring') return;
    set({ game: skipDeclare(game) });
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

    const currentPlayer = game.players[game.currentPlayerIndex];

    // Handle skip turn
    if (currentPlayer.skipNextTurn) {
      const skipAction: GameAction = {
        round: game.currentRound,
        playerId: currentPlayer.id,
        type: 'skip',
        timestamp: Date.now(),
      };
      const newPlayers = game.players.map((p, i) =>
        i === game.currentPlayerIndex ? { ...p, skipNextTurn: false } : p
      );
      const nextPlayerIndex = (game.currentPlayerIndex + 1) % 4;
      const isRoundEnd = nextPlayerIndex === 0;
      const nextRound = isRoundEnd ? game.currentRound + 1 : game.currentRound;
      const isGameOver = isRoundEnd && nextRound > game.settings.totalRounds;

      await delay(500);
      set({
        game: {
          ...game,
          players: newPlayers,
          currentPlayerIndex: nextPlayerIndex,
          currentRound: nextRound,
          phase: isGameOver ? 'game-over' : 'declaring',
          actionLog: [...game.actionLog, skipAction],
          winner: isGameOver ? getRankings(newPlayers)[0].id : null,
        },
      });
      return;
    }

    // DECLARE phase for AI
    if (game.phase === 'declaring') {
      const declareDecision = makeAIDeclareDecision(
        currentPlayer,
        game.settings.aiDifficulty,
        {
          discardPile: game.discardPile,
          actionLog: game.actionLog,
          currentRound: game.currentRound,
          totalRounds: game.settings.totalRounds,
        }
      );

      await delay(declareDecision.thinkingMs);

      let currentState = get().game;
      if (!currentState) return;

      if (declareDecision.shouldDeclare && declareDecision.dimension && declareDecision.cardIds) {
        const afterDeclare = declareCards(
          currentState,
          declareDecision.dimension,
          declareDecision.cardIds
        );
        set({ game: afterDeclare });

        // If game over after declare, stop
        if (afterDeclare.phase === 'game-over') return;
        // If declare failed (player index advanced), stop
        if (afterDeclare.currentPlayerIndex !== game.currentPlayerIndex) return;

        currentState = afterDeclare;
      } else {
        const afterSkip = skipDeclare(currentState);
        set({ game: afterSkip });
        currentState = afterSkip;
      }
    }

    // Draw phase for AI
    const latestForDraw = get().game;
    if (!latestForDraw || latestForDraw.phase === 'game-over') return;

    const afterDraw = drawCard(latestForDraw);
    set({ game: afterDraw });

    const drawnCard = afterDraw.drawnCard;
    if (!drawnCard) return;

    const playerAfterDraw = afterDraw.players[afterDraw.currentPlayerIndex];
    const decision = makeAIDecision(playerAfterDraw, drawnCard, afterDraw.settings.aiDifficulty, {
      discardPile: afterDraw.discardPile,
      actionLog: afterDraw.actionLog,
      currentRound: afterDraw.currentRound,
      totalRounds: afterDraw.settings.totalRounds,
    });

    await delay(decision.thinkingMs);

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
