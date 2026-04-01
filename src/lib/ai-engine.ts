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

export interface AIDeclareDecision {
  shouldDeclare: boolean;
  dimension?: Dimension;
  cardIds?: number[];
  thinkingMs: number;
}

// Decide whether AI should DECLARE
export function makeAIDeclareDecision(
  player: Player,
  difficulty: AIDifficulty,
  context: AIContext
): AIDeclareDecision {
  const targets = getTargetCounts(player.bigFiveScores);
  const declaredDims = getDeclaredDimensions(player);

  // Count personality cards by dimension in hand
  const handByDim: Record<Dimension, GameCard[]> = { O: [], C: [], E: [], A: [], N: [] };
  for (const card of player.hand) {
    if (isPersonalityCard(card)) {
      handByDim[card.dimension].push(card);
    }
  }

  // Find dimensions that can be declared (have >= target cards, not already declared)
  const declarable: { dim: Dimension; cards: GameCard[]; surplus: number }[] = [];
  for (const d of DIMENSIONS) {
    if (declaredDims.has(d)) continue;
    const count = handByDim[d].length;
    if (count >= targets[d]) {
      declarable.push({ dim: d, cards: handByDim[d], surplus: count - targets[d] });
    }
  }

  if (declarable.length === 0) {
    return { shouldDeclare: false, thinkingMs: 200 };
  }

  switch (difficulty) {
    case 'easy': {
      // Easy AI: 60% chance to declare if possible, picks first available
      if (Math.random() < 0.6) {
        const pick = declarable[0];
        const cardIds = pick.cards.slice(0, targets[pick.dim]).map((c) => c.id);
        return {
          shouldDeclare: true,
          dimension: pick.dim,
          cardIds,
          thinkingMs: 500 + Math.random() * 500,
        };
      }
      return { shouldDeclare: false, thinkingMs: 300 };
    }

    case 'medium': {
      // Medium AI: always declare if exact match, prefer dimensions with no surplus
      const exact = declarable.filter((d) => d.surplus === 0);
      const pick = exact.length > 0 ? exact[0] : declarable[0];
      const cardIds = pick.cards.slice(0, targets[pick.dim]).map((c) => c.id);
      return {
        shouldDeclare: true,
        dimension: pick.dim,
        cardIds,
        thinkingMs: 800 + Math.random() * 600,
      };
    }

    case 'hard': {
      // Hard AI: strategic — declare dimensions where surplus is 0 first
      // If late game, declare even with surplus
      const isLateGame = context.currentRound > context.totalRounds * 0.6;
      const exact = declarable.filter((d) => d.surplus === 0);

      let pick;
      if (exact.length > 0) {
        // Prefer dimension with highest target (harder to re-collect if lost)
        exact.sort((a, b) => targets[b.dim] - targets[a.dim]);
        pick = exact[0];
      } else if (isLateGame && declarable.length > 0) {
        // Late game: declare even with surplus, pick smallest surplus
        declarable.sort((a, b) => a.surplus - b.surplus);
        pick = declarable[0];
      } else {
        return { shouldDeclare: false, thinkingMs: 400 };
      }

      const cardIds = pick.cards.slice(0, targets[pick.dim]).map((c) => c.id);
      return {
        shouldDeclare: true,
        dimension: pick.dim,
        cardIds,
        thinkingMs: 1200 + Math.random() * 800,
      };
    }
  }
}

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
  if (isDummyCard(card)) return -10; // Always discard dummy cards first
  const targets = getTargetCounts(player.bigFiveScores);
  const declaredDims = getDeclaredDimensions(player);
  // If this dimension is already declared, card is useless
  if (declaredDims.has(card.dimension)) return -5;
  // Higher target = more valuable to keep cards of this dimension
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

  // Count cards by dimension in hand (excluding drawn card which is part of cards)
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

    // Bonus if we're close to target for this dimension
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

  // Track opponent declare patterns
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
    const defensiveValue = opponentStrongDims.has(card.dimension) ? -0.3 : 0;

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

// AI claim (碰) decision — should AI claim a pending discard?
export interface AIClaimDecision {
  shouldClaim: boolean;
  dimension?: Dimension;
  handCardIds?: number[];
}

export function makeAIClaimDecision(
  player: Player,
  pendingCard: GameCard,
  difficulty: AIDifficulty
): AIClaimDecision {
  if (!isPersonalityCard(pendingCard)) {
    return { shouldClaim: false };
  }

  const targets = getTargetCounts(player.bigFiveScores);
  const declaredDims = getDeclaredDimensions(player);
  const pendingDim = pendingCard.dimension;

  // Can't claim for already-declared dimension
  if (declaredDims.has(pendingDim)) {
    return { shouldClaim: false };
  }

  // Count hand cards of this dimension
  const dimCards = player.hand.filter(
    (c) => isPersonalityCard(c) && c.dimension === pendingDim
  );
  const totalWithPending = dimCards.length + 1; // +1 for the pending card
  const needed = targets[pendingDim];

  if (totalWithPending < needed) {
    return { shouldClaim: false };
  }

  // Have enough — decide based on difficulty
  const handCardIds = dimCards.slice(0, needed - 1).map((c) => c.id);

  switch (difficulty) {
    case 'easy':
      // 50% chance to claim even if eligible
      if (Math.random() < 0.5) return { shouldClaim: false };
      return { shouldClaim: true, dimension: pendingDim, handCardIds };

    case 'medium':
      // Always claim if exact match (no surplus)
      return { shouldClaim: true, dimension: pendingDim, handCardIds };

    case 'hard':
      // Always claim — strategic advantage
      return { shouldClaim: true, dimension: pendingDim, handCardIds };
  }
}
