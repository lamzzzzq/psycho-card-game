import {
  GameCard,
  Player,
  GameAction,
  AIDifficulty,
  Dimension,
  DIMENSIONS,
  isPersonalityCard,
  isDummyCard,
} from '@/types';
import { getTargetCounts } from './scoring';
import { getDeclaredDimensions } from './game-logic';

interface AIContext {
  discardPile: GameCard[];
  actionLog: GameAction[];
  currentRound: number;
  totalRounds: number;
}

interface AIDecision {
  cardToDiscard: GameCard;
  thinkingMs: number;
}

// AI Hu decision — should AI attempt to Hu (win)?
export interface AIHuDecision {
  shouldHu: boolean;
  thinkingMs: number;
}

// extraCard = 刚摸到的牌（自摸胡时与 hand 分开存）。站立手牌数恒 = 剩余目标总和 − 1
// （开局 sum−1，抽+弃净 0，碰 −N 同时目标 −N），所以不带 extraCard 的检查只在
// 碰成功后（手牌恰好 = 剩余目标总和）可能为真 —— 摸牌后的检查必须把 drawnCard 传进来。
export function makeAIHuDecision(
  player: Player,
  difficulty: AIDifficulty,
  extraCard?: GameCard | null
): AIHuDecision {
  const targets = getTargetCounts(player.bigFiveScores);
  const declaredDims = getDeclaredDimensions(player);

  const handByDim: Record<Dimension, number> = { O: 0, C: 0, E: 0, A: 0, N: 0 };
  for (const card of [...player.hand, ...(extraCard ? [extraCard] : [])]) {
    if (isPersonalityCard(card)) {
      handByDim[card.dimension]++;
    }
  }

  const allSatisfied = DIMENSIONS.every((d) => {
    if (declaredDims.has(d)) return true;
    return handByDim[d] >= targets[d];
  });

  if (!allSatisfied) {
    return { shouldHu: false, thinkingMs: 200 };
  }

  // All dimensions satisfied — decide based on difficulty
  switch (difficulty) {
    case 'easy':
      // 70% chance to Hu
      return { shouldHu: Math.random() < 0.7, thinkingMs: 500 };
    case 'medium':
    case 'hard':
      // Always Hu if possible
      return { shouldHu: true, thinkingMs: 300 };
  }
}

// AI Pong decision — should AI pong a pending discard?
export interface AIPongDecision {
  shouldPong: boolean;
  dimension?: Dimension;
  handCardIds?: number[];
}

export function makeAIPongDecision(
  player: Player,
  pendingCard: GameCard,
  difficulty: AIDifficulty
): AIPongDecision {
  if (!isPersonalityCard(pendingCard)) {
    return { shouldPong: false };
  }

  const targets = getTargetCounts(player.bigFiveScores);
  const declaredDims = getDeclaredDimensions(player);
  const pendingDim = pendingCard.dimension;

  if (declaredDims.has(pendingDim)) {
    return { shouldPong: false };
  }

  const dimCards = player.hand.filter(
    (c) => isPersonalityCard(c) && c.dimension === pendingDim
  );
  const totalWithPending = dimCards.length + 1;
  const needed = targets[pendingDim];

  if (totalWithPending < needed) {
    return { shouldPong: false };
  }

  const handCardIds = dimCards.slice(0, needed - 1).map((c) => c.id);

  switch (difficulty) {
    case 'easy':
      if (Math.random() < 0.5) return { shouldPong: false };
      return { shouldPong: true, dimension: pendingDim, handCardIds };
    case 'medium':
      return { shouldPong: true, dimension: pendingDim, handCardIds };
    case 'hard':
      return { shouldPong: true, dimension: pendingDim, handCardIds };
  }
}

// AI discard decision
export function makeAIDecision(
  player: Player,
  drawnCard: GameCard,
  difficulty: AIDifficulty,
  context: AIContext
): AIDecision {
  const allCards = [...player.hand, drawnCard];

  switch (difficulty) {
    case 'easy':
      return easyAI(allCards, player);
    case 'medium':
      return mediumAI(allCards, player, context);
    case 'hard':
      return hardAI(allCards, player, context);
  }
}

function cardKeepValue(card: GameCard, player: Player): number {
  if (isDummyCard(card)) return -10;
  const targets = getTargetCounts(player.bigFiveScores);
  const declaredDims = getDeclaredDimensions(player);
  if (declaredDims.has(card.dimension)) return -5;
  return targets[card.dimension];
}

function easyAI(cards: GameCard[], player: Player): AIDecision {
  const sorted = [...cards].sort((a, b) => cardKeepValue(a, player) - cardKeepValue(b, player));
  return {
    cardToDiscard: sorted[0],
    thinkingMs: 500 + Math.random() * 500,
  };
}

function mediumAI(cards: GameCard[], player: Player, context: AIContext): AIDecision {
  const targets = getTargetCounts(player.bigFiveScores);
  const declaredDims = getDeclaredDimensions(player);

  const handByDim: Record<Dimension, number> = { O: 0, C: 0, E: 0, A: 0, N: 0 };
  for (const card of cards) {
    if (isPersonalityCard(card) && !declaredDims.has(card.dimension)) {
      handByDim[card.dimension]++;
    }
  }

  const keepScores = cards.map((card) => {
    const baseValue = cardKeepValue(card, player);
    if (isDummyCard(card)) return { card, score: baseValue };
    if (declaredDims.has(card.dimension)) return { card, score: -5 };

    const needed = targets[card.dimension];
    const have = handByDim[card.dimension];
    const progressBonus = have >= needed ? -1 : (have / needed) * 2;
    return { card, score: baseValue + progressBonus };
  });

  keepScores.sort((a, b) => a.score - b.score);
  return {
    cardToDiscard: keepScores[0].card,
    thinkingMs: 1000 + Math.random() * 800,
  };
}

function hardAI(cards: GameCard[], player: Player, context: AIContext): AIDecision {
  const { actionLog } = context;
  const targets = getTargetCounts(player.bigFiveScores);
  const declaredDims = getDeclaredDimensions(player);

  const handByDim: Record<Dimension, number> = { O: 0, C: 0, E: 0, A: 0, N: 0 };
  for (const card of cards) {
    if (isPersonalityCard(card) && !declaredDims.has(card.dimension)) {
      handByDim[card.dimension]++;
    }
  }

  const opponentDiscards: Record<string, Record<Dimension, number>> = {};
  for (const action of actionLog) {
    if (action.type === 'discard' && action.card && action.playerId !== player.id) {
      if (!opponentDiscards[action.playerId]) {
        opponentDiscards[action.playerId] = { O: 0, C: 0, E: 0, A: 0, N: 0 };
      }
      if (isPersonalityCard(action.card)) {
        opponentDiscards[action.playerId][action.card.dimension]++;
      }
    }
  }

  const opponentStrongDims = new Set<Dimension>();
  for (const pid of Object.keys(opponentDiscards)) {
    const discards = opponentDiscards[pid];
    const sorted = DIMENSIONS.slice().sort((a, b) => discards[a] - discards[b]);
    opponentStrongDims.add(sorted[0]);
    opponentStrongDims.add(sorted[1]);
  }

  const keepScores = cards.map((card) => {
    if (isDummyCard(card)) return { card, score: -10 };
    if (declaredDims.has(card.dimension)) return { card, score: -5 };

    const needed = targets[card.dimension];
    const have = handByDim[card.dimension];
    const progressBonus = have >= needed ? -0.5 : (have / needed) * 3;
    // 防守 = 对手在收集的维度更值得【留住】（keep 分调高），压低会变成优先喂牌
    const defensiveValue = opponentStrongDims.has(card.dimension) ? 0.5 : 0;

    return { card, score: needed + progressBonus + defensiveValue };
  });

  keepScores.sort((a, b) => a.score - b.score);

  const shouldBluff = Math.random() < 0.15;
  const discardIndex = shouldBluff && keepScores.length > 1 ? 1 : 0;

  return {
    cardToDiscard: keepScores[discardIndex].card,
    thinkingMs: 1500 + Math.random() * 1000,
  };
}
