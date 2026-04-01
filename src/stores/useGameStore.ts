'use client';

import { create } from 'zustand';
import { GameState, GameSettings, BigFiveScores, PlayerId, Player, Dimension, GameAction } from '@/types';
import {
  initializeGame,
  drawCard,
  discardCard,
  attemptHu,
  pongCard,
  skipPong,
  getPlayerScore,
  getRankings,
} from '@/lib/game-logic';
import { makeAIDecision, makeAIHuDecision, makeAIPongDecision } from '@/lib/ai-engine';
import { delay } from '@/lib/utils';

interface GameStore {
  game: GameState | null;

  initGame: (humanScores: BigFiveScores, settings: GameSettings) => void;

  // Turn actions
  playerHu: () => void;
  playerDraw: () => void;
  playerDiscard: (cardId: number) => void;
  playerPong: (dimension: Dimension, handCardIds: number[]) => void;
  playerSkipPong: () => void;
  resolvePongWindow: () => Promise<void>;
  executeAITurn: () => Promise<void>;

  // Queries
  getCurrentPlayer: () => Player | null;
  getScore: (id: PlayerId) => number;
  getPlayerRankings: () => Player[];

  resetGame: () => void;
}

export const useGameStore = create<GameStore>()((set, get) => ({
  game: null,

  initGame: (humanScores, settings) => {
    set({ game: initializeGame(humanScores, settings) });
  },

  playerHu: () => {
    const { game } = get();
    if (!game || game.phase === 'game-over' || game.phase === 'claim-window') return;
    // Human is always index 0, can only Hu on their own turn
    if (game.currentPlayerIndex !== 0) return;
    set({ game: attemptHu(game, 0) });
  },

  playerDraw: () => {
    const { game } = get();
    if (!game || game.phase !== 'drawing') return;
    set({ game: drawCard(game) });
  },

  playerDiscard: (cardId) => {
    const { game } = get();
    if (!game || game.phase !== 'discarding' || !game.drawnCard) return;
    set({ game: discardCard(game, cardId) });
  },

  playerPong: (dimension, handCardIds) => {
    const { game } = get();
    if (!game || game.phase !== 'claim-window') return;
    set({ game: pongCard(game, 0, dimension, handCardIds) });
  },

  playerSkipPong: () => {
    const { game } = get();
    if (!game || game.phase !== 'claim-window') return;
    set({ game: skipPong(game) });
  },

  resolvePongWindow: async () => {
    const { game } = get();
    if (!game || game.phase !== 'claim-window' || !game.pendingDiscard) return;

    const pendingCard = game.pendingDiscard;
    const discardedBy = game.discardedByIndex;

    for (let offset = 1; offset < 4; offset++) {
      const idx = (discardedBy + offset) % 4;
      const player = game.players[idx];

      if (player.isHuman || idx === discardedBy) continue;

      const decision = makeAIPongDecision(player, pendingCard, game.settings.aiDifficulty);

      if (decision.shouldPong && decision.dimension && decision.handCardIds) {
        await delay(500);
        const currentGame = get().game;
        if (!currentGame || currentGame.phase !== 'claim-window') return;
        set({ game: pongCard(currentGame, idx, decision.dimension, decision.handCardIds) });
        return;
      }
    }

    await delay(300);
    const latestGame = get().game;
    if (!latestGame || latestGame.phase !== 'claim-window') return;
    set({ game: skipPong(latestGame) });
  },

  executeAITurn: async () => {
    const { game } = get();
    if (!game) return;

    const currentPlayer = game.players[game.currentPlayerIndex];

    // Handle skip turn — also clear revealedHand
    if (currentPlayer.skipNextTurn) {
      const skipAction: GameAction = {
        round: game.currentRound,
        playerId: currentPlayer.id,
        type: 'skip',
        timestamp: Date.now(),
      };
      const newPlayers = game.players.map((p, i) =>
        i === game.currentPlayerIndex ? { ...p, skipNextTurn: false, revealedHand: false } : p
      );
      const nextPlayerIndex = (game.currentPlayerIndex + 1) % 4;
      const isRoundEnd = nextPlayerIndex === 0;
      const nextRound = isRoundEnd ? game.currentRound + 1 : game.currentRound;
      const isGameOver = game.settings.totalRounds > 0 && isRoundEnd && nextRound > game.settings.totalRounds;

      await delay(500);
      set({
        game: {
          ...game,
          players: newPlayers,
          currentPlayerIndex: nextPlayerIndex,
          currentRound: nextRound,
          phase: isGameOver ? 'game-over' : 'drawing',
          actionLog: [...game.actionLog, skipAction],
          winner: isGameOver ? getRankings(newPlayers)[0].id : null,
        },
      });
      return;
    }

    // AI Hu check
    const huDecision = makeAIHuDecision(currentPlayer, game.settings.aiDifficulty);
    if (huDecision.shouldHu) {
      await delay(huDecision.thinkingMs);
      const currentState = get().game;
      if (!currentState) return;
      const afterHu = attemptHu(currentState, currentState.currentPlayerIndex);
      set({ game: afterHu });
      if (afterHu.phase === 'game-over') return;
    }

    // Draw phase
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
