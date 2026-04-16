'use client';

import { create } from 'zustand';
import { GameState, GameSettings, BigFiveScores, PlayerId, Player, Dimension } from '@/types';
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
    if (!game || game.phase === 'game-over') return;
    // Hu can be attempted:
    //  - on own turn (drawing / discarding)
    //  - during any claim-window where human is not the discarder ("跳着胡")
    if (game.phase === 'claim-window') {
      if (game.discardedByIndex === 0) return;
      const pid = game.players[0]?.id;
      if (pid && game.claimResponses.includes(pid)) return;
    } else if (game.currentPlayerIndex !== 0) {
      return;
    }
    set({ game: attemptHu(game, 0) });
  },

  playerDraw: () => {
    const { game } = get();
    if (!game || game.phase !== 'drawing') return;
    set({ game: drawCard(game) });
  },

  playerDiscard: (cardId) => {
    const { game } = get();
    // Both paths valid: normal turn (drawnCard set) and post-pong forced
    // discard (drawnCard=null, pick from hand). Bug #7.
    if (!game || game.phase !== 'discarding') return;
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
    // Human is always index 0
    set({ game: skipPong(game, 0) });
  },

  resolvePongWindow: async () => {
    const { game } = get();
    if (!game || game.phase !== 'claim-window' || !game.pendingDiscard) return;

    const pendingCard = game.pendingDiscard;
    const discardedBy = game.discardedByIndex;
    const playerCount = game.players.length;
    // Bug #5: only the downstream (next) player may pong.
    const downstreamIdx = (discardedBy + 1) % playerCount;

    for (let offset = 1; offset < playerCount; offset++) {
      const idx = (discardedBy + offset) % playerCount;
      const latestGame = get().game;
      if (!latestGame || latestGame.phase !== 'claim-window') return;

      const player = latestGame.players[idx];
      if (player.isHuman) continue;
      if (latestGame.claimResponses.includes(player.id)) continue;

      // Non-downstream AIs always pass (new rule). Downstream AI may pong
      // if the decision engine says so.
      const canPong = idx === downstreamIdx && !player.skipNextTurn;
      const decision = canPong
        ? makeAIPongDecision(player, pendingCard, latestGame.settings.aiDifficulty)
        : { shouldPong: false as const };

      await delay(400);
      const currentGame = get().game;
      if (!currentGame || currentGame.phase !== 'claim-window') return;

      if (decision.shouldPong && (decision as any).dimension && (decision as any).handCardIds) {
        set({ game: pongCard(currentGame, idx, (decision as any).dimension, (decision as any).handCardIds) });
        return;
      }
      set({ game: skipPong(currentGame, idx) });
    }
  },

  executeAITurn: async () => {
    const { game } = get();
    if (!game) return;

    const currentPlayer = game.players[game.currentPlayerIndex];

    // skipNextTurn now auto-resolves inside game-logic after every advance,
    // so by the time this runs the current player is always ready to play.

    // After a successful pong the ponger lands in phase='discarding' with
    // drawnCard=null (bug #7). Skip the hu/draw steps and pick a discard
    // directly from hand.
    if (game.phase === 'discarding' && !game.drawnCard) {
      const decision = makeAIDecision(currentPlayer, currentPlayer.hand[0], game.settings.aiDifficulty, {
        discardPile: game.discardPile,
        actionLog: game.actionLog,
        currentRound: game.currentRound,
        totalRounds: game.settings.totalRounds,
      });
      await delay(decision.thinkingMs);
      const latest = get().game;
      if (!latest || latest.phase !== 'discarding') return;
      // makeAIDecision's cardToDiscard may be the drawnCard stand-in —
      // pick any card from hand if it isn't actually in hand.
      const handIds = new Set(currentPlayer.hand.map((c) => c.id));
      const cardId = handIds.has(decision.cardToDiscard.id)
        ? decision.cardToDiscard.id
        : currentPlayer.hand[0]?.id;
      if (cardId == null) return;
      set({ game: discardCard(latest, cardId) });
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

    // Draw phase (only if we're still in 'drawing' — hu-fail may have
    // advanced the turn, and the defensive skip-guard may have skipped us)
    const latestForDraw = get().game;
    if (!latestForDraw || latestForDraw.phase !== 'drawing') return;
    if (latestForDraw.currentPlayerIndex !== game.currentPlayerIndex) return;

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
