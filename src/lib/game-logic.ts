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

export function initializeGame(
  humanScores: BigFiveScores,
  settings: GameSettings
): GameState {
  const aiScoresList = AI_PERSONAS.map(() => generateAIScores());
  const allScores = [humanScores, ...aiScoresList];

  const deck = createShuffledDeck();
  const { hands, remaining } = dealCardsVariable(deck, allScores);

  const players: Player[] = [
    {
      id: 'human',
      name: '你',
      avatar: '🧑',
      hand: hands[0],
      isHuman: true,
      bigFiveScores: humanScores,
      declaredSets: [],
      skipNextTurn: false,
    },
    ...AI_PERSONAS.map((persona, i) => ({
      id: persona.id as PlayerId,
      name: persona.name,
      avatar: persona.avatar,
      hand: hands[i + 1],
      isHuman: false,
      bigFiveScores: aiScoresList[i],
      declaredSets: [],
      skipNextTurn: false,
    })),
  ];

  return {
    phase: 'declaring',
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

// DECLARE cards for a dimension
export function declareCards(
  state: GameState,
  dimension: Dimension,
  cardIds: number[]
): GameState {
  const playerIndex = state.currentPlayerIndex;
  const player = state.players[playerIndex];
  const targets = getTargetCounts(player.bigFiveScores);
  const targetCount = targets[dimension];

  if (getDeclaredDimensions(player).has(dimension)) {
    return state;
  }

  const selectedCards = player.hand.filter((c) => cardIds.includes(c.id));

  if (selectedCards.length < targetCount) {
    return state;
  }

  const allCorrect = selectedCards.every(
    (c) => isPersonalityCard(c) && c.dimension === dimension
  );

  if (allCorrect) {
    const declaredCards = selectedCards.filter(isPersonalityCard) as PersonalityCard[];
    const newHand = player.hand.filter((c) => !cardIds.includes(c.id));
    const newDeclaredSets = [
      ...player.declaredSets,
      { dimension, cards: declaredCards, round: state.currentRound },
    ];

    const newPlayers = state.players.map((p, i) =>
      i === playerIndex
        ? { ...p, hand: newHand, declaredSets: newDeclaredSets }
        : p
    );

    const action: GameAction = {
      round: state.currentRound,
      playerId: player.id,
      type: 'declare-success',
      dimension,
      cardCount: declaredCards.length,
      timestamp: Date.now(),
    };

    const updatedPlayer = newPlayers[playerIndex];
    if (hasWon(updatedPlayer)) {
      return {
        ...state,
        players: newPlayers,
        actionLog: [...state.actionLog, action],
        phase: 'game-over',
        winner: player.id,
      };
    }

    return {
      ...state,
      players: newPlayers,
      actionLog: [...state.actionLog, action],
      phase: player.isHuman ? 'drawing' : 'ai-turn',
    };
  } else {
    const newHand = player.hand.filter((c) => !cardIds.includes(c.id));

    const newPlayers = state.players.map((p, i) =>
      i === playerIndex
        ? { ...p, hand: newHand, skipNextTurn: true }
        : p
    );

    const action: GameAction = {
      round: state.currentRound,
      playerId: player.id,
      type: 'declare-fail',
      dimension,
      cardCount: selectedCards.length,
      timestamp: Date.now(),
    };

    const { nextPlayerIndex, nextRound, isGameOver } = advancePlayer(
      playerIndex,
      state.currentRound,
      state.settings.totalRounds
    );

    return {
      ...state,
      players: newPlayers,
      discardPile: [...state.discardPile, ...selectedCards],
      actionLog: [...state.actionLog, action],
      currentPlayerIndex: nextPlayerIndex,
      currentRound: nextRound,
      phase: isGameOver ? 'game-over' : 'declaring',
      winner: isGameOver ? determineWinner(newPlayers) : null,
    };
  }
}

export function skipDeclare(state: GameState): GameState {
  const player = state.players[state.currentPlayerIndex];
  return {
    ...state,
    phase: player.isHuman ? 'drawing' : 'ai-turn',
  };
}

export function drawCard(state: GameState): GameState {
  let drawPile = state.drawPile;
  let discardPile = state.discardPile;

  if (drawPile.length === 0) {
    if (discardPile.length === 0) {
      const { nextPlayerIndex, nextRound, isGameOver } = advancePlayer(
        state.currentPlayerIndex,
        state.currentRound,
        state.settings.totalRounds
      );
      return {
        ...state,
        currentPlayerIndex: nextPlayerIndex,
        currentRound: nextRound,
        phase: isGameOver ? 'game-over' : 'declaring',
        winner: isGameOver ? determineWinner(state.players) : null,
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

// Modified: personality cards trigger claim window instead of going directly to discard pile
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

  // If personality card → enter claim window; dummy card → straight to discard pile
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
    phase: isGameOver ? 'game-over' : 'declaring',
    actionLog: [...state.actionLog, action],
    winner: isGameOver ? determineWinner(newPlayers) : null,
  };
}

// Claim (碰) a pending discard card to DECLARE a dimension
export function claimCard(
  state: GameState,
  claimerIndex: number,
  dimension: Dimension,
  handCardIds: number[]
): GameState {
  if (!state.pendingDiscard || state.phase !== 'claim-window') return state;

  const claimer = state.players[claimerIndex];
  const pendingCard = state.pendingDiscard;
  const targets = getTargetCounts(claimer.bigFiveScores);
  const targetCount = targets[dimension];

  if (getDeclaredDimensions(claimer).has(dimension)) return state;

  // All cards for declare = hand cards + the pending discard
  const selectedHandCards = claimer.hand.filter((c) => handCardIds.includes(c.id));
  const allDeclareCards = [...selectedHandCards, pendingCard];

  if (allDeclareCards.length < targetCount) return state;

  const allCorrect = allDeclareCards.every(
    (c) => isPersonalityCard(c) && c.dimension === dimension
  );

  const discardedByIndex = state.discardedByIndex;
  const { nextPlayerIndex, nextRound, isGameOver } = advancePlayer(
    discardedByIndex,
    state.currentRound,
    state.settings.totalRounds
  );

  if (allCorrect) {
    const declaredCards = allDeclareCards.filter(isPersonalityCard) as PersonalityCard[];
    const newHand = claimer.hand.filter((c) => !handCardIds.includes(c.id));
    const newDeclaredSets = [
      ...claimer.declaredSets,
      { dimension, cards: declaredCards, round: state.currentRound },
    ];

    const newPlayers = state.players.map((p, i) =>
      i === claimerIndex
        ? { ...p, hand: newHand, declaredSets: newDeclaredSets }
        : p
    );

    const action: GameAction = {
      round: state.currentRound,
      playerId: claimer.id,
      type: 'claim-success',
      dimension,
      cardCount: declaredCards.length,
      timestamp: Date.now(),
    };

    const updatedClaimer = newPlayers[claimerIndex];
    if (hasWon(updatedClaimer)) {
      return {
        ...state,
        players: newPlayers,
        pendingDiscard: null,
        discardedByIndex: -1,
        actionLog: [...state.actionLog, action],
        phase: 'game-over',
        winner: claimer.id,
      };
    }

    return {
      ...state,
      players: newPlayers,
      pendingDiscard: null,
      discardedByIndex: -1,
      currentPlayerIndex: nextPlayerIndex,
      currentRound: nextRound,
      phase: isGameOver ? 'game-over' : 'declaring',
      actionLog: [...state.actionLog, action],
      winner: isGameOver ? determineWinner(newPlayers) : null,
    };
  } else {
    // Claim failed — hand cards discarded + skip next turn (pending card also goes to discard)
    const newHand = claimer.hand.filter((c) => !handCardIds.includes(c.id));

    const newPlayers = state.players.map((p, i) =>
      i === claimerIndex
        ? { ...p, hand: newHand, skipNextTurn: true }
        : p
    );

    const action: GameAction = {
      round: state.currentRound,
      playerId: claimer.id,
      type: 'claim-fail',
      dimension,
      cardCount: allDeclareCards.length,
      timestamp: Date.now(),
    };

    return {
      ...state,
      players: newPlayers,
      discardPile: [...state.discardPile, pendingCard, ...selectedHandCards],
      pendingDiscard: null,
      discardedByIndex: -1,
      currentPlayerIndex: nextPlayerIndex,
      currentRound: nextRound,
      phase: isGameOver ? 'game-over' : 'declaring',
      actionLog: [...state.actionLog, action],
      winner: isGameOver ? determineWinner(newPlayers) : null,
    };
  }
}

// No one claims — pending card goes to discard pile, advance to next player
export function skipClaim(state: GameState): GameState {
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
    phase: isGameOver ? 'game-over' : 'declaring',
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
  const isGameOver = isRoundEnd && nextRound > totalRounds;
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
