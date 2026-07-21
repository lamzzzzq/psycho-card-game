'use client';

import { create } from 'zustand';
import { GameState, GameSettings, BigFiveScores, PlayerId, Player, Dimension } from '@/types';
import {
  initializeGame,
  drawCard,
  discardCard,
  attemptHu,
  pongCard,
  selfPongCard,
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
  playerSelfPong: (dimension: Dimension, cardIds: number[]) => void;
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

  playerSelfPong: (dimension, cardIds) => {
    const { game } = get();
    if (!game) return;
    // 只在 discarding（已抽牌/已碰牌）阶段自摸碰——drawing 阶段自摸会漏抽一次牌→掉牌。
    if (game.phase !== 'discarding') return;
    if (game.currentPlayerIndex !== 0) return;
    set({ game: selfPongCard(game, 0, dimension, cardIds) });
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

    // First-come-first-served: any AI non-discarder may pong. Iterate
    // downstream-first so deterministic tie-breaking favors the closest
    // player; pongCard advances the phase and breaks the loop early.
    for (let offset = 1; offset < playerCount; offset++) {
      const idx = (discardedBy + offset) % playerCount;
      const latestGame = get().game;
      if (!latestGame || latestGame.phase !== 'claim-window') return;
      // 窗口身份校验：delay 期间旧窗口可能已关、新窗口已开（人类极快碰→弃牌）。
      // 只查 phase 会把上一张弃牌算出的 decision 用到新窗口上 —— 必须同一张 pendingDiscard。
      if (latestGame.pendingDiscard?.id !== pendingCard.id) return;

      const player = latestGame.players[idx];
      if (player.isHuman) continue;
      if (latestGame.claimResponses.includes(player.id)) continue;

      const canPong = !player.skipNextTurn && !player.frozenUntilOwnDiscard;
      const decision = canPong
        ? makeAIPongDecision(player, pendingCard, latestGame.settings.aiDifficulty)
        : { shouldPong: false as const };

      await delay(400);
      const currentGame = get().game;
      if (!currentGame || currentGame.phase !== 'claim-window') return;
      if (currentGame.pendingDiscard?.id !== pendingCard.id) return;

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
      // 碰完即胡：碰成功后手牌恰好 = 剩余目标总和，这是 hand-only 检查唯一可能为真的时刻
      //（站立手牌恒 = 剩余目标总和 − 1）。不查的话 AI 会把能胡的局白白弃牌错过。
      const pongHu = makeAIHuDecision(currentPlayer, game.settings.aiDifficulty);
      if (pongHu.shouldHu) {
        await delay(pongHu.thinkingMs);
        const s = get().game;
        if (!s || s.phase !== 'discarding' || s.currentPlayerIndex !== game.currentPlayerIndex) return;
        const afterHu = attemptHu(s, s.currentPlayerIndex);
        set({ game: afterHu });
        if (afterHu.phase === 'game-over') return;
        // hu 失败（竞态才可能）→ 引擎让它留在 discarding，继续把欠的牌弃掉
      }
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

    // 兜底续跑：若上次 executeAITurn 在 draw 之后、discard 之前中断（异常/热重载），
    // 状态残留在 phase='ai-turn' + drawnCard —— 下面所有分支都会直接 return（含页面
    // 的隐藏兜底按钮），游戏永久停在「思考中」。这里接上 hu 检查 + discard 步骤。
    if (game.phase === 'ai-turn' && game.drawnCard) {
      const resumeHu = makeAIHuDecision(currentPlayer, game.settings.aiDifficulty, game.drawnCard);
      if (resumeHu.shouldHu) {
        const afterHu = attemptHu(game, game.currentPlayerIndex);
        set({ game: afterHu });
        if (afterHu.phase === 'game-over') return;
        if (!get().game?.drawnCard) return; // hu 失败已让位
      }
      const decision = makeAIDecision(currentPlayer, game.drawnCard, game.settings.aiDifficulty, {
        discardPile: game.discardPile,
        actionLog: game.actionLog,
        currentRound: game.currentRound,
        totalRounds: game.settings.totalRounds,
      });
      await delay(decision.thinkingMs);
      const latestResume = get().game;
      if (!latestResume || !latestResume.drawnCard) return;
      set({ game: discardCard(latestResume, decision.cardToDiscard.id) });
      return;
    }

    // AI Hu check（摸牌前）：站立手牌恒 = 剩余目标总和 − 1，这里几乎必假 ——
    // 真正的自摸胡点在下面摸牌之后。保留仅作为不变量被打破时的防御。
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

    // 自摸胡：把刚摸的 drawnCard 一起算（attemptHu 的 pool 本来就含 drawnCard）。
    // 摸牌前的 hand-only 检查数学上永假，这里才是 AI 唯一真实的胡点。
    const postDrawHu = makeAIHuDecision(playerAfterDraw, afterDraw.settings.aiDifficulty, drawnCard);
    if (postDrawHu.shouldHu) {
      await delay(postDrawHu.thinkingMs);
      const stateForHu = get().game;
      if (!stateForHu || stateForHu.drawnCard?.id !== drawnCard.id) return;
      const afterHu = attemptHu(stateForHu, stateForHu.currentPlayerIndex);
      set({ game: afterHu });
      if (afterHu.phase === 'game-over') return;
      if (!get().game?.drawnCard) return; // hu 失败（竞态才可能）已让位
    }

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
