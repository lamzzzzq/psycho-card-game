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
    claimResponses: [],
    winner: null,
  };
}

// ── Claim-window helpers ─────────────────────────────────────────────────────
function getEligibleClaimers(state: GameState): number[] {
  return state.players.map((_, i) => i).filter((i) => i !== state.discardedByIndex);
}

function allClaimersResponded(state: GameState): boolean {
  if (state.discardedByIndex < 0) return false;
  const responded = new Set(state.claimResponses);
  return getEligibleClaimers(state).every((i) => responded.has(state.players[i].id));
}

function finalizeClaimWindow(state: GameState): GameState {
  if (!state.pendingDiscard) return state;
  const { nextPlayerIndex, nextRound, isGameOver } = advancePlayer(
    state.discardedByIndex,
    state.currentRound,
    state.settings.totalRounds,
    state.players.length
  );
  const advanced: GameState = {
    ...state,
    discardPile: [...state.discardPile, state.pendingDiscard],
    pendingDiscard: null,
    discardedByIndex: -1,
    claimResponses: [],
    currentPlayerIndex: nextPlayerIndex,
    currentRound: nextRound,
    phase: isGameOver ? 'game-over' : 'drawing',
    winner: isGameOver ? determineWinner(state.players) : state.winner,
  };
  return skipPenalizedPlayers(advanced);
}

// Auto-skip any penalized player (skipNextTurn=true) at the head of the turn
// queue. Clears the flag + revealedHand, logs a skip action, and recurses up
// to playerCount times (guard against all-penalized infinite loop).
export function skipPenalizedPlayers(state: GameState): GameState {
  let current = state;
  for (let i = 0; i < current.players.length; i++) {
    if (current.phase !== 'drawing') return current;
    const p = current.players[current.currentPlayerIndex];
    if (!p.skipNextTurn) return current;

    const skipAction: GameAction = {
      round: current.currentRound,
      playerId: p.id,
      type: 'skip',
      timestamp: Date.now(),
    };
    const newPlayers = current.players.map((pl, idx) =>
      idx === current.currentPlayerIndex
        ? { ...pl, skipNextTurn: false, revealedHand: false }
        : pl
    );
    const { nextPlayerIndex, nextRound, isGameOver } = advancePlayer(
      current.currentPlayerIndex,
      current.currentRound,
      current.settings.totalRounds,
      current.players.length
    );
    current = {
      ...current,
      players: newPlayers,
      currentPlayerIndex: nextPlayerIndex,
      currentRound: nextRound,
      phase: isGameOver ? 'game-over' : 'drawing',
      actionLog: [...current.actionLog, skipAction],
      winner: isGameOver ? determineWinner(newPlayers) : current.winner,
    };
  }
  return current;
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

    // If hu attempted during another player's claim-window, register response
    // and wait for remaining claimers before advancing.
    if (state.phase === 'claim-window' && state.pendingDiscard) {
      const playerId = state.players[playerIndex].id;
      const newResponses = state.claimResponses.includes(playerId)
        ? state.claimResponses
        : [...state.claimResponses, playerId];
      const nextState: GameState = {
        ...state,
        players: newPlayers,
        claimResponses: newResponses,
        actionLog: [...state.actionLog, action],
      };
      return allClaimersResponded(nextState) ? finalizeClaimWindow(nextState) : nextState;
    }

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

  // Personality card → claim window; dummy card → free extra draw (same player)
  if (isPersonalityCard(cardToDiscard)) {
    return {
      ...state,
      players: newPlayers,
      drawnCard: null,
      pendingDiscard: cardToDiscard,
      discardedByIndex: playerIndex,
      claimResponses: [],
      phase: 'claim-window',
      actionLog: [...state.actionLog, action],
    };
  }

  // Dummy card — no claim, no turn advance; player draws again
  return {
    ...state,
    players: newPlayers,
    discardPile: [...state.discardPile, cardToDiscard],
    drawnCard: null,
    phase: 'drawing',
    actionLog: [...state.actionLog, action],
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
    state.settings.totalRounds,
    state.players.length
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
        claimResponses: [],
        actionLog: [...state.actionLog, action],
        phase: 'game-over',
        winner: ponger.id,
      };
    }

    return skipPenalizedPlayers({
      ...state,
      players: newPlayers,
      pendingDiscard: null,
      discardedByIndex: -1,
      claimResponses: [],
      currentPlayerIndex: nextPlayerIndex,
      currentRound: nextRound,
      phase: isGameOver ? 'game-over' : 'drawing',
      actionLog: [...state.actionLog, action],
      winner: isGameOver ? determineWinner(newPlayers) : null,
    });
  } else {
    // PONG FAIL — cards stay in hand, hand is revealed, skip next turn.
    // Ponger is locked out of this claim window; wait for remaining claimers.
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

    const pongerId = state.players[pongerIndex].id;
    const newResponses = state.claimResponses.includes(pongerId)
      ? state.claimResponses
      : [...state.claimResponses, pongerId];

    const nextState: GameState = {
      ...state,
      players: newPlayers,
      claimResponses: newResponses,
      actionLog: [...state.actionLog, action],
    };

    return allClaimersResponded(nextState) ? finalizeClaimWindow(nextState) : nextState;
  }
}

// A single claimer passes. Pending card only moves to discard pile after
// every eligible non-discarder has responded (skip / pong-fail / hu-fail).
export function skipPong(state: GameState, playerIndex: number): GameState {
  if (!state.pendingDiscard || state.phase !== 'claim-window') return state;

  const playerId = state.players[playerIndex].id;
  if (state.claimResponses.includes(playerId)) return state;
  if (playerIndex === state.discardedByIndex) return state;

  const nextState: GameState = {
    ...state,
    claimResponses: [...state.claimResponses, playerId],
  };

  return allClaimersResponded(nextState) ? finalizeClaimWindow(nextState) : nextState;
}

function advancePlayer(
  currentIndex: number,
  currentRound: number,
  totalRounds: number,
  playerCount: number = 4
): { nextPlayerIndex: number; nextRound: number; isGameOver: boolean } {
  const nextPlayerIndex = (currentIndex + 1) % playerCount;
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
