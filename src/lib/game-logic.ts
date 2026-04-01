import {
  GameState,
  GameSettings,
  Player,
  BigFiveScores,
  GameCard,
  PlayerId,
  GameAction,
  Dimension,
  DIMENSIONS,
  isPersonalityCard,
  isDummyCard,
  PersonalityCard,
} from '@/types';
import { AI_PERSONAS } from '@/data/ai-personas';
import { generateAIScores, calculateFinalScore, getTargetCounts } from './scoring';
import { createShuffledDeck, dealCardsVariable } from './card-engine';

function createPlayer(
  id: PlayerId,
  name: string,
  avatar: string,
  hand: GameCard[],
  isHuman: boolean,
  bigFiveScores: BigFiveScores
): Player {
  return {
    id, name, avatar, hand, isHuman, bigFiveScores,
    declaredSets: [],
    skipNextTurn: false,
    revealedHand: false,
  };
}

export function initializeGame(
  humanScores: BigFiveScores,
  settings: GameSettings
): GameState {
  const aiScoresList = AI_PERSONAS.map(() => generateAIScores());
  const allScores = [humanScores, ...aiScoresList];

  const deck = createShuffledDeck();
  const { hands, remaining } = dealCardsVariable(deck, allScores);

  const players: Player[] = [
    createPlayer('human', '你', '🧑', hands[0], true, humanScores),
    ...AI_PERSONAS.map((persona, i) =>
      createPlayer(persona.id as PlayerId, persona.name, persona.avatar, hands[i + 1], false, aiScoresList[i])
    ),
  ];

  return {
    phase: 'drawing',
    settings,
    players,
    drawPile: remaining,
    discardPile: [],
    currentPlayerIndex: 0,
    currentRound: 1,
    actionLog: [],
    drawnCard: null,
    pendingDiscard: null,
    discardedByIndex: -1,
    winner: null,
  };
}

export function hasWon(player: Player): boolean {
  const declaredDims = new Set(player.declaredSets.map((s) => s.dimension));
  return DIMENSIONS.every((d) => declaredDims.has(d));
}

export function getDeclaredDimensions(player: Player): Set<Dimension> {
  return new Set(player.declaredSets.map((s) => s.dimension));
}

// Hu (胡) — attempt to declare ALL remaining undeclared dimensions at once
export function attemptHu(state: GameState, playerIndex: number): GameState {
  const player = state.players[playerIndex];
  const targets = getTargetCounts(player.bigFiveScores);
  const declaredDims = getDeclaredDimensions(player);

  // Count personality cards by dimension in hand
  const handByDim: Record<Dimension, PersonalityCard[]> = { O: [], C: [], E: [], A: [], N: [] };
  for (const card of player.hand) {
    if (isPersonalityCard(card)) {
      handByDim[card.dimension].push(card);
    }
  }

  // Check ALL undeclared dimensions have enough cards
  const allSatisfied = DIMENSIONS.every((d) => {
    if (declaredDims.has(d)) return true;
    return handByDim[d].length >= targets[d];
  });

  if (allSatisfied) {
    // HU SUCCESS — declare all remaining dimensions
    const newDeclaredSets = [...player.declaredSets];
    const usedCardIds = new Set<number>();

    for (const d of DIMENSIONS) {
      if (declaredDims.has(d)) continue;
      const cards = handByDim[d].slice(0, targets[d]);
      newDeclaredSets.push({ dimension: d, cards, round: state.currentRound });
      cards.forEach((c) => usedCardIds.add(c.id));
    }

    const newHand = player.hand.filter((c) => !usedCardIds.has(c.id));
    const newPlayers = state.players.map((p, i) =>
      i === playerIndex ? { ...p, hand: newHand, declaredSets: newDeclaredSets } : p
    );

    const action: GameAction = {
      round: state.currentRound,
      playerId: player.id,
      type: 'hu-success',
      timestamp: Date.now(),
    };

    return {
      ...state,
      players: newPlayers,
      actionLog: [...state.actionLog, action],
      phase: 'game-over',
      winner: player.id,
    };
  } else {
    // HU FAIL — skip next turn + reveal hand
    const newPlayers = state.players.map((p, i) =>
      i === playerIndex ? { ...p, skipNextTurn: true, revealedHand: true } : p
    );

    const action: GameAction = {
      round: state.currentRound,
      playerId: player.id,
      type: 'hu-fail',
      timestamp: Date.now(),
    };

    return {
      ...state,
      players: newPlayers,
      actionLog: [...state.actionLog, action],
    };
  }
}

export function drawCard(state: GameState): GameState {
  let drawPile = state.drawPile;
  let discardPile = state.discardPile;

  if (drawPile.length === 0) {
    if (discardPile.length === 0) {
      // No cards left anywhere — force game over to prevent infinite loop
      return {
        ...state,
        phase: 'game-over',
        winner: determineWinner(state.players),
      };
    }
    drawPile = [...discardPile];
    for (let i = drawPile.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [drawPile[i], drawPile[j]] = [drawPile[j], drawPile[i]];
    }
    discardPile = [];
  }

  const [drawnCard, ...remaining] = drawPile;
  const action: GameAction = {
    round: state.currentRound,
    playerId: state.players[state.currentPlayerIndex].id,
    type: 'draw',
    timestamp: Date.now(),
  };

  return {
    ...state,
    drawPile: remaining,
    discardPile,
    drawnCard,
    phase: state.players[state.currentPlayerIndex].isHuman ? 'discarding' : 'ai-turn',
    actionLog: [...state.actionLog, action],
  };
}

export function discardCard(state: GameState, cardId: number): GameState {
  if (!state.drawnCard) return state;

  const playerIndex = state.currentPlayerIndex;
  const player = state.players[playerIndex];
  const drawnCard = state.drawnCard;

  const allCards = [...player.hand, drawnCard];
  const cardToDiscard = allCards.find((c) => c.id === cardId)!;
  const newHand = allCards.filter((c) => c.id !== cardId);

  const action: GameAction = {
    round: state.currentRound,
    playerId: player.id,
    type: 'discard',
    card: cardToDiscard,
    timestamp: Date.now(),
  };

  const newPlayers = state.players.map((p, i) =>
    i === playerIndex ? { ...p, hand: newHand } : p
  );

  // Personality card → claim window; dummy card → straight to discard pile
  if (isPersonalityCard(cardToDiscard)) {
    return {
      ...state,
      players: newPlayers,
      drawnCard: null,
      pendingDiscard: cardToDiscard,
      discardedByIndex: playerIndex,
      phase: 'claim-window',
      actionLog: [...state.actionLog, action],
    };
  }

  // Dummy card — no claim window
  const { nextPlayerIndex, nextRound, isGameOver } = advancePlayer(
    playerIndex,
    state.currentRound,
    state.settings.totalRounds
  );

  return {
    ...state,
    players: newPlayers,
    discardPile: [...state.discardPile, cardToDiscard],
    drawnCard: null,
    currentPlayerIndex: nextPlayerIndex,
    currentRound: nextRound,
    phase: isGameOver ? 'game-over' : 'drawing',
    actionLog: [...state.actionLog, action],
    winner: isGameOver ? determineWinner(newPlayers) : null,
  };
}

// Pong (碰) — claim a pending discard to complete a dimension
export function pongCard(
  state: GameState,
  pongerIndex: number,
  dimension: Dimension,
  handCardIds: number[]
): GameState {
  if (!state.pendingDiscard || state.phase !== 'claim-window') return state;

  const ponger = state.players[pongerIndex];
  const pendingCard = state.pendingDiscard;
  const targets = getTargetCounts(ponger.bigFiveScores);
  const targetCount = targets[dimension];

  if (getDeclaredDimensions(ponger).has(dimension)) return state;

  const selectedHandCards = ponger.hand.filter((c) => handCardIds.includes(c.id));
  const allPongCards = [...selectedHandCards, pendingCard];

  if (allPongCards.length < targetCount) return state;

  const allCorrect = allPongCards.every(
    (c) => isPersonalityCard(c) && c.dimension === dimension
  );

  const discardedByIndex = state.discardedByIndex;
  const { nextPlayerIndex, nextRound, isGameOver } = advancePlayer(
    discardedByIndex,
    state.currentRound,
    state.settings.totalRounds
  );

  if (allCorrect) {
    // PONG SUCCESS
    const declaredCards = allPongCards.filter(isPersonalityCard) as PersonalityCard[];
    const newHand = ponger.hand.filter((c) => !handCardIds.includes(c.id));
    const newDeclaredSets = [
      ...ponger.declaredSets,
      { dimension, cards: declaredCards, round: state.currentRound },
    ];

    const newPlayers = state.players.map((p, i) =>
      i === pongerIndex
        ? { ...p, hand: newHand, declaredSets: newDeclaredSets }
        : p
    );

    const action: GameAction = {
      round: state.currentRound,
      playerId: ponger.id,
      type: 'pong-success',
      dimension,
      cardCount: declaredCards.length,
      timestamp: Date.now(),
    };

    const updatedPonger = newPlayers[pongerIndex];
    if (hasWon(updatedPonger)) {
      return {
        ...state,
        players: newPlayers,
        pendingDiscard: null,
        discardedByIndex: -1,
        actionLog: [...state.actionLog, action],
        phase: 'game-over',
        winner: ponger.id,
      };
    }

    return {
      ...state,
      players: newPlayers,
      pendingDiscard: null,
      discardedByIndex: -1,
      currentPlayerIndex: nextPlayerIndex,
      currentRound: nextRound,
      phase: isGameOver ? 'game-over' : 'drawing',
      actionLog: [...state.actionLog, action],
      winner: isGameOver ? determineWinner(newPlayers) : null,
    };
  } else {
    // PONG FAIL — cards stay in hand, hand is revealed, skip next turn
    const newPlayers = state.players.map((p, i) =>
      i === pongerIndex
        ? { ...p, skipNextTurn: true, revealedHand: true }
        : p
    );

    const action: GameAction = {
      round: state.currentRound,
      playerId: ponger.id,
      type: 'pong-fail',
      dimension,
      cardCount: allPongCards.length,
      timestamp: Date.now(),
    };

    // Pending card goes to discard pile since pong failed
    return {
      ...state,
      players: newPlayers,
      discardPile: [...state.discardPile, pendingCard],
      pendingDiscard: null,
      discardedByIndex: -1,
      currentPlayerIndex: nextPlayerIndex,
      currentRound: nextRound,
      phase: isGameOver ? 'game-over' : 'drawing',
      actionLog: [...state.actionLog, action],
      winner: isGameOver ? determineWinner(newPlayers) : null,
    };
  }
}

// No one pongs — pending card goes to discard pile
export function skipPong(state: GameState): GameState {
  if (!state.pendingDiscard || state.phase !== 'claim-window') return state;

  const { nextPlayerIndex, nextRound, isGameOver } = advancePlayer(
    state.discardedByIndex,
    state.currentRound,
    state.settings.totalRounds
  );

  return {
    ...state,
    discardPile: [...state.discardPile, state.pendingDiscard],
    pendingDiscard: null,
    discardedByIndex: -1,
    currentPlayerIndex: nextPlayerIndex,
    currentRound: nextRound,
    phase: isGameOver ? 'game-over' : 'drawing',
    winner: isGameOver ? determineWinner(state.players) : null,
  };
}

function advancePlayer(
  currentIndex: number,
  currentRound: number,
  totalRounds: number
): { nextPlayerIndex: number; nextRound: number; isGameOver: boolean } {
  const nextPlayerIndex = (currentIndex + 1) % 4;
  const isRoundEnd = nextPlayerIndex === 0;
  const nextRound = isRoundEnd ? currentRound + 1 : currentRound;
  // totalRounds = 0 means unlimited
  const isGameOver = totalRounds > 0 && isRoundEnd && nextRound > totalRounds;
  return { nextPlayerIndex, nextRound, isGameOver };
}

function determineWinner(players: Player[]): PlayerId {
  const ranked = getRankings(players);
  return ranked[0].id;
}

export function getPlayerScore(player: Player): number {
  return calculateFinalScore(player.declaredSets.length, player.hand);
}

export function getRankings(players: Player[]): Player[] {
  return [...players].sort((a, b) => {
    const declDiff = b.declaredSets.length - a.declaredSets.length;
    if (declDiff !== 0) return declDiff;
    return a.hand.length - b.hand.length;
  });
}
