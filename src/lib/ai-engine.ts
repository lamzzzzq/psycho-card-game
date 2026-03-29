import { GameCard, Player, GameAction, AIDifficulty, Dimension, DIMENSIONS } from '@/types';

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

function cardValue(card: GameCard, player: Player): number {
  return player.bigFiveScores[card.dimension];
}

// Easy AI: discard lowest value card
function easyAI(cards: GameCard[], player: Player): AIDecision {
  const sorted = [...cards].sort((a, b) => cardValue(a, player) - cardValue(b, player));
  return {
    cardToDiscard: sorted[0],
    thinkingMs: 500 + Math.random() * 500,
  };
}

// Medium AI: consider remaining cards and optimize expected value
function mediumAI(cards: GameCard[], player: Player, context: AIContext): AIDecision {
  const { discardPile } = context;

  // Count how many cards of each dimension are still in play
  const discardedByDim: Record<Dimension, number> = { O: 0, C: 0, E: 0, A: 0, N: 0 };
  for (const card of discardPile) {
    discardedByDim[card.dimension]++;
  }

  // For each card, calculate a "keep score" factoring in scarcity
  const keepScores = cards.map((card) => {
    const baseValue = cardValue(card, player);
    const totalInDim = 12;
    const discarded = discardedByDim[card.dimension];
    const remaining = totalInDim - discarded;
    // If few remaining in this dimension, keeping it is more valuable
    const scarcityBonus = remaining <= 3 ? 0.5 : 0;
    return { card, score: baseValue + scarcityBonus };
  });

  keepScores.sort((a, b) => a.score - b.score);

  return {
    cardToDiscard: keepScores[0].card,
    thinkingMs: 1000 + Math.random() * 800,
  };
}

// Hard AI: infer opponent scores from discard patterns + defensive play
function hardAI(cards: GameCard[], player: Player, context: AIContext): AIDecision {
  const { actionLog } = context;

  // Build opponent profile from their discards
  const opponentDiscards: Record<string, Record<Dimension, number>> = {};
  for (const action of actionLog) {
    if (action.type === 'discard' && action.card && action.playerId !== player.id) {
      if (!opponentDiscards[action.playerId]) {
        opponentDiscards[action.playerId] = { O: 0, C: 0, E: 0, A: 0, N: 0 };
      }
      opponentDiscards[action.playerId][action.card.dimension]++;
    }
  }

  // Infer: dimensions opponents discard most are likely their LOW-scoring dims
  // So their HIGH-scoring dims are the ones they rarely discard
  const opponentStrongDims = new Set<Dimension>();
  for (const pid of Object.keys(opponentDiscards)) {
    const discards = opponentDiscards[pid];
    const sorted = DIMENSIONS.slice().sort((a, b) => discards[a] - discards[b]);
    // Top 2 least-discarded dims are likely their strong dims
    opponentStrongDims.add(sorted[0]);
    opponentStrongDims.add(sorted[1]);
  }

  // Evaluate cards: base value + defensive consideration
  const keepScores = cards.map((card) => {
    const baseValue = cardValue(card, player);
    // Penalty for discarding cards that opponents might want
    const defensiveValue = opponentStrongDims.has(card.dimension) ? -0.3 : 0;
    // Prefer discarding cards that opponents DON'T need
    return { card, score: baseValue + defensiveValue };
  });

  // Sort ascending — discard lowest score
  keepScores.sort((a, b) => a.score - b.score);

  // Hard AI twist: sometimes discard a slightly better card to mislead opponents
  const shouldBluff = Math.random() < 0.15;
  const discardIndex = shouldBluff && keepScores.length > 1 ? 1 : 0;

  return {
    cardToDiscard: keepScores[discardIndex].card,
    thinkingMs: 1500 + Math.random() * 1000,
  };
}
