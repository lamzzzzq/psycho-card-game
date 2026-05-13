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

// First-come-first-served claim model: any non-discarder can pong/skip;
// race resolves naturally — once pongCard applies, phase leaves
// 'claim-window' and subsequent pong attempts return state unchanged.

// Penalty-freeze rule (pong-fail / hu-fail aftermath):
//
// After a failed pong, the offender (C) is frozen out of EVERY claim
// window — pong, hu, skip — until their own turn auto-skips them.
// Concretely with seat order A→B→C:
//
//   A discards → C pong-fails → claim window finalizes
//   ↓
//   B's turn: B draws + discards → claim window opens.
//             C must NOT participate (still penalized).
//             autoSkipPenalizedClaimers records C's skip silently.
//   ↓
//   C's turn: skipPenalizedPlayers auto-skips C, clears skipNextTurn.
//   ↓
//   A's turn: A acts again. C is now unfrozen.
//
// Without this auto-skip, B's claim window would block forever waiting
// on C, since C's UI hides the panel for penalized players.
function isFrozen(p: { skipNextTurn: boolean; frozenUntilDiscarderIndex?: number; hasLeft?: boolean }): boolean {
  // hasLeft permanently freezes the seat — the player quit, their turn
  // is dead-air and they cannot participate in any claim window.
  return !!p.hasLeft || p.skipNextTurn || typeof p.frozenUntilDiscarderIndex === 'number';
}

function autoSkipPenalizedClaimers(state: GameState): GameState {
  if (state.phase !== 'claim-window') return state;
  const newResponses = [...state.claimResponses];
  for (let i = 0; i < state.players.length; i++) {
    if (i === state.discardedByIndex) continue;
    const p = state.players[i];
    if (isFrozen(p) && !newResponses.includes(p.id)) {
      newResponses.push(p.id);
    }
  }
  if (newResponses.length === state.claimResponses.length) return state;
  const next: GameState = { ...state, claimResponses: newResponses };
  return allClaimersResponded(next) ? finalizeClaimWindow(next) : next;
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
//
// Safe to call from any 'drawing' state — it's the single source of truth
// for honoring skipNextTurn flags. drawCard/discardCard call this defensively
// as a deadlock guard (see bug #6 fix).
export function skipPenalizedPlayers(state: GameState): GameState {
  let current = state;
  for (let i = 0; i < current.players.length; i++) {
    if (current.phase !== 'drawing') return current;
    const p = current.players[current.currentPlayerIndex];
    // hasLeft: permanent seat skip. Their turn is dead-air; we advance
    // immediately, do NOT clear hasLeft (they're out for good).
    if (!p.skipNextTurn && !p.hasLeft) return current;

    const skipAction: GameAction = {
      round: current.currentRound,
      playerId: p.id,
      type: 'skip',
      timestamp: Date.now(),
    };
    // Only clear skipNextTurn here — reveals (from hu-fail/pong-fail) must
    // persist through the skip so other players actually see the penalty.
    // They're cleared when this player next draws for real.
    // Also lift any third party's pong-fail freeze that was pointing at
    // this player. The semantic is "frozen until X operates again"; if
    // X keeps getting penalized themselves, a literal-discard requirement
    // would deadlock the third party permanently. A skip counts as X
    // having taken their turn — release the freeze defensively.
    const skippedIdx = current.currentPlayerIndex;
    const newPlayers = current.players.map((pl, idx) => {
      let next = pl;
      if (idx === skippedIdx) next = { ...next, skipNextTurn: false };
      if (next.frozenUntilDiscarderIndex === skippedIdx) {
        next = { ...next, frozenUntilDiscarderIndex: undefined };
      }
      return next;
    });
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
  // Penalized players are frozen out of all claim actions (pong / hu /
  // skip) until their own turn auto-skips AND the original block-discarder
  // operates again. Defensive guard so direct calls from PVP can't bypass
  // the freeze.
  if (isFrozen(player)) return state;
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

    // Own-turn hu-fail: spec says penalty is 罚停一轮 (skip next turn),
    // current turn continues normally. Player still needs to discard
    // (if they had drawn) or draw+discard (if they hadn't). The skip-
    // next-turn flag is honored when the turn wraps back to this player,
    // via the defensive guard in drawCard + the usual skipPenalizedPlayers
    // calls from discardCard / finalizeClaimWindow.
    return {
      ...state,
      players: newPlayers,
      actionLog: [...state.actionLog, action],
    };
  }
}

export function drawCard(state: GameState): GameState {
  // NOTE: We intentionally do NOT auto-skip penalized current players
  // here. Per spec, own-turn hu-fail continues the current turn (penalty
  // is 罚停下一轮, not 罚停本轮). skipPenalizedPlayers is only called
  // after a turn advance (discardCard / finalizeClaimWindow / pongCard).

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
  const currentIdx = state.currentPlayerIndex;
  const action: GameAction = {
    round: state.currentRound,
    playerId: state.players[currentIdx].id,
    type: 'draw',
    card: drawnCard,
    timestamp: Date.now(),
  };

  // Clear penalty reveals only after the player has completed their skip
  // turn (skipNextTurn=false). This keeps reveals visible through own-turn
  // hu-fail + discard + full loop + skip turn, then clears on resume.
  // Also reset selfPongUsedThisTurn — drawing a card marks the start of
  // a fresh turn, so the once-per-turn self-pong gate is restored.
  const newPlayers = state.players.map((p, i) =>
    i === currentIdx && !p.skipNextTurn
      ? { ...p, revealedHand: false, revealedSelectedCards: undefined, selfPongUsedThisTurn: false }
      : i === currentIdx
      ? { ...p, selfPongUsedThisTurn: false }
      : p
  );

  return {
    ...state,
    players: newPlayers,
    drawPile: remaining,
    discardPile,
    drawnCard,
    phase: newPlayers[currentIdx].isHuman ? 'discarding' : 'ai-turn',
    actionLog: [...state.actionLog, action],
  };
}

export function discardCard(state: GameState, cardId: number): GameState {
  // After a successful pong, phase='discarding' with drawnCard=null — ponger
  // must discard directly from hand. Otherwise the normal path: drawnCard
  // is the just-drawn card, also discardable.
  const playerIndex = state.currentPlayerIndex;
  const player = state.players[playerIndex];
  const drawnCard = state.drawnCard;

  const allCards = drawnCard ? [...player.hand, drawnCard] : [...player.hand];
  const cardToDiscard = allCards.find((c) => c.id === cardId);
  if (!cardToDiscard) return state;
  const newHand = allCards.filter((c) => c.id !== cardId);

  const action: GameAction = {
    round: state.currentRound,
    playerId: player.id,
    type: 'discard',
    card: cardToDiscard,
    timestamp: Date.now(),
  };

  // Apply hand mutation + lift the pong-fail freeze for any player whose
  // frozenUntilDiscarderIndex marker matches THIS discarder. The freeze
  // semantic is "locked out until the player you failed against operates
  // again" — both personality and dummy discards count as operating.
  const newPlayers = state.players.map((p, i) => {
    const handPatched = i === playerIndex ? { ...p, hand: newHand } : p;
    return handPatched.frozenUntilDiscarderIndex === playerIndex
      ? { ...handPatched, frozenUntilDiscarderIndex: undefined }
      : handPatched;
  });

  // Personality card → claim window; dummy card → advance turn (no claim)
  if (isPersonalityCard(cardToDiscard)) {
    const claimState: GameState = {
      ...state,
      players: newPlayers,
      drawnCard: null,
      pendingDiscard: cardToDiscard,
      discardedByIndex: playerIndex,
      claimResponses: [],
      phase: 'claim-window',
      actionLog: [...state.actionLog, action],
    };
    // Frozen claimers (pong-fail / hu-fail offenders) auto-skip so the
    // window doesn't deadlock waiting on them.
    return autoSkipPenalizedClaimers(claimState);
  }

  const { nextPlayerIndex, nextRound, isGameOver } = advancePlayer(
    playerIndex,
    state.currentRound,
    state.settings.totalRounds,
    state.players.length
  );

  return skipPenalizedPlayers({
    ...state,
    players: newPlayers,
    discardPile: [...state.discardPile, cardToDiscard],
    drawnCard: null,
    currentPlayerIndex: nextPlayerIndex,
    currentRound: nextRound,
    phase: isGameOver ? 'game-over' : 'drawing',
    actionLog: [...state.actionLog, action],
    winner: isGameOver ? determineWinner(newPlayers) : null,
  });
}

// Pong (碰) — claim a pending discard to complete a dimension.
// First-come-first-served: any non-discarder may attempt pong; the race
// resolves naturally because a successful pong advances the phase out
// of 'claim-window'.
export function pongCard(
  state: GameState,
  pongerIndex: number,
  dimension: Dimension,
  handCardIds: number[]
): GameState {
  if (!state.pendingDiscard || state.phase !== 'claim-window') {
    console.warn('[pong-silent] #1 claim-window-closed', {
      pongerIndex,
      pongerId: state.players[pongerIndex]?.id,
      phase: state.phase,
      hasPendingDiscard: !!state.pendingDiscard,
      discardedByIndex: state.discardedByIndex,
      claimResponses: state.claimResponses,
    });
    return state;
  }
  if (pongerIndex === state.discardedByIndex) {
    console.warn('[pong-silent] #2 self-discard', {
      pongerIndex,
      pongerId: state.players[pongerIndex]?.id,
      discardedByIndex: state.discardedByIndex,
    });
    return state;
  }

  // Penalized players can't pong (matches hu-fail/pong-fail 罚停一轮 rule).
  if (isFrozen(state.players[pongerIndex])) {
    const p = state.players[pongerIndex];
    console.warn('[pong-silent] #3 frozen', {
      pongerIndex,
      pongerId: p.id,
      skipNextTurn: p.skipNextTurn,
      frozenUntilDiscarderIndex: p.frozenUntilDiscarderIndex,
    });
    return state;
  }

  const ponger = state.players[pongerIndex];
  const pendingCard = state.pendingDiscard;
  const targets = getTargetCounts(ponger.bigFiveScores);
  const targetCount = targets[dimension];

  if (getDeclaredDimensions(ponger).has(dimension)) {
    console.warn('[pong-silent] #4 dimension-already-declared', {
      pongerIndex,
      pongerId: ponger.id,
      dimension,
      declaredDimensions: Array.from(getDeclaredDimensions(ponger)),
    });
    return state;
  }

  const selectedHandCards = ponger.hand.filter((c) => handCardIds.includes(c.id));
  const allPongCards = [...selectedHandCards, pendingCard];

  // STRICT count enforcement: user must commit exactly `targetCount` cards
  // total (targetCount - 1 from hand + the pending discard). Selecting
  // fewer OR more is treated as a failed pong and incurs the penalty.
  // This locks in the contract the player declared: "I have exactly N
  // cards of this dimension."
  const exactCount = allPongCards.length === targetCount;
  const allCorrect =
    exactCount &&
    allPongCards.every(
      (c) => isPersonalityCard(c) && c.dimension === dimension
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

    // Pong steals the turn: ponger plays next. Per bug #7, ponger does
    // NOT draw a new card — they must immediately discard one from hand.
    // phase='discarding' + drawnCard=null signals this state.
    return skipPenalizedPlayers({
      ...state,
      players: newPlayers,
      pendingDiscard: null,
      discardedByIndex: -1,
      claimResponses: [],
      currentPlayerIndex: pongerIndex,
      phase: 'discarding',
      drawnCard: null,
      actionLog: [...state.actionLog, action],
      winner: null,
    });
  } else {
    // PONG FAIL — only the cards used in the failed bet are exposed
    // (NOT the full hand; full-hand reveal is reserved for hu-fail).
    // Ponger gets two penalty marks:
    //   1. skipNextTurn — auto-skip at their next own turn
    //   2. frozenUntilDiscarderIndex — locked out of every claim window
    //      until the original block-discarder operates again
    // Together they implement the symmetric model: 1 own-turn skip plus
    // a freeze that lasts the full A→B→C cycle, regardless of whether
    // the offender is the immediate downstream player or further out.
    const exposedCards = selectedHandCards;
    const blockDiscarderIndex = state.discardedByIndex;
    const newPlayers = state.players.map((p, i) =>
      i === pongerIndex
        ? {
            ...p,
            skipNextTurn: true,
            frozenUntilDiscarderIndex: blockDiscarderIndex,
            revealedSelectedCards: exposedCards,
          }
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

// Self-pong (自摸碰) — declare a dimension on your own turn from your
// own cards (hand + just-drawn). Triggered during your 'drawing' /
// 'discarding' phase. STRICT count: must commit exactly `targetCount`
// same-dimension cards. Wrong count or wrong dimension → pong-fail
// penalty (skipNextTurn + selected-card reveal).
//
// Distinct from pongCard:
//   - No discarder context (no frozenUntilDiscarderIndex on fail).
//   - All cards come from the ponger's own pool (hand + drawnCard).
//   - On success the ponger stays as currentPlayer in 'discarding' phase
//     (they still owe a discard, whether or not drawnCard was used).
export function selfPongCard(
  state: GameState,
  pongerIndex: number,
  dimension: Dimension,
  cardIds: number[]
): GameState {
  if (state.phase !== 'drawing' && state.phase !== 'discarding') return state;
  if (state.currentPlayerIndex !== pongerIndex) return state;

  const ponger = state.players[pongerIndex];
  if (isFrozen(ponger)) return state;
  if (getDeclaredDimensions(ponger).has(dimension)) return state;
  // One self-pong per turn. Cleared when the player draws on their
  // next turn (drawCard).
  if (ponger.selfPongUsedThisTurn) return state;

  const targets = getTargetCounts(ponger.bigFiveScores);
  const targetCount = targets[dimension];

  // Pool = current hand + the freshly-drawn card (if any).
  const pool: GameCard[] = [
    ...ponger.hand,
    ...(state.drawnCard ? [state.drawnCard] : []),
  ];
  const selected = pool.filter((c) => cardIds.includes(c.id));

  const exactCount = selected.length === targetCount;
  const allCorrect =
    exactCount &&
    selected.every(
      (c) => isPersonalityCard(c) && c.dimension === dimension
    );

  if (allCorrect) {
    const declaredCards = selected as PersonalityCard[];
    const drawnUsed = state.drawnCard && cardIds.includes(state.drawnCard.id);
    const newHand = ponger.hand.filter((c) => !cardIds.includes(c.id));
    const newDrawn = drawnUsed ? null : state.drawnCard;

    const newDeclaredSets = [
      ...ponger.declaredSets,
      { dimension, cards: declaredCards, round: state.currentRound },
    ];
    const newPlayers = state.players.map((p, i) =>
      i === pongerIndex
        ? { ...p, hand: newHand, declaredSets: newDeclaredSets, selfPongUsedThisTurn: true }
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
        drawnCard: newDrawn,
        actionLog: [...state.actionLog, action],
        phase: 'game-over',
        winner: ponger.id,
      };
    }

    // Stays in discarding — player still owes one discard.
    return {
      ...state,
      players: newPlayers,
      drawnCard: newDrawn,
      phase: 'discarding',
      actionLog: [...state.actionLog, action],
    };
  }

  // SELF-PONG FAIL — same penalty model as pong-fail minus the discarder
  // freeze (there's no other discarder to wait on).
  const exposedCards = selected;
  const newPlayers = state.players.map((p, i) =>
    i === pongerIndex
      ? {
          ...p,
          skipNextTurn: true,
          revealedSelectedCards: exposedCards,
        }
      : p
  );

  const action: GameAction = {
    round: state.currentRound,
    playerId: ponger.id,
    type: 'pong-fail',
    dimension,
    cardCount: selected.length,
    timestamp: Date.now(),
  };

  return {
    ...state,
    players: newPlayers,
    actionLog: [...state.actionLog, action],
  };
}

// A single claimer passes. Pending card only moves to discard pile after
// every eligible non-discarder has responded (skip / pong-fail / hu-fail).
// First-come-first-served — no priority gating.
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

// Mark a player as having quit. The seat stays in players[] (indexes
// must remain stable for currentPlayerIndex / discardedByIndex), but
// the player is treated as permanently frozen by isFrozen() —
// skipPenalizedPlayers will fast-forward their turn forever.
//
// Side-effects we have to handle here:
//   1. If the leaver was the current player, advance the turn and
//      run skipPenalizedPlayers so the next live player gets control.
//   2. If we're inside a claim-window, auto-pass for the leaver so
//      we don't deadlock waiting on their response.
//   3. If fewer than 2 active players remain, end the game now and
//      award the last-standing seat (or the highest-ranked active
//      player) the win.
export function markPlayerLeft(state: GameState, playerId: string): GameState {
  const idx = state.players.findIndex((p) => p.id === playerId);
  if (idx < 0) return state;
  if (state.players[idx].hasLeft) return state;
  if (state.phase === 'game-over') return state;

  const newPlayers = state.players.map((p, i) =>
    i === idx ? { ...p, hasLeft: true } : p
  );

  const activeCount = newPlayers.filter((p) => !p.hasLeft).length;

  // End the game if 0 or 1 active players left.
  if (activeCount <= 1) {
    const lastStanding = newPlayers.find((p) => !p.hasLeft);
    const winnerId = lastStanding
      ? lastStanding.id
      : getRankings(newPlayers)[0]?.id ?? null;
    return {
      ...state,
      players: newPlayers,
      phase: 'game-over',
      winner: winnerId,
      pendingDiscard: null,
      discardedByIndex: -1,
      claimResponses: [],
    };
  }

  let next: GameState = { ...state, players: newPlayers };

  // Inside a claim-window we have to record the leaver as having
  // implicitly passed so allClaimersResponded() can fire.
  if (next.phase === 'claim-window') {
    const leftId = newPlayers[idx].id;
    if (!next.claimResponses.includes(leftId) && next.discardedByIndex !== idx) {
      next = { ...next, claimResponses: [...next.claimResponses, leftId] };
    }
    next = autoSkipPenalizedClaimers(next);
    // If everyone else already responded, finalize.
    if (next.phase === 'claim-window' && allClaimersResponded(next)) {
      next = finalizeClaimWindow(next);
    }
  }

  // If we ended up handing control to the leaver (their own turn at
  // the moment they quit, or finalize-claim landed on them), force the
  // turn-skip machinery to step past them.
  if (
    next.phase === 'drawing' &&
    next.players[next.currentPlayerIndex].hasLeft
  ) {
    // Synthesize the same skip flow used by skipPenalizedPlayers.
    next = skipPenalizedPlayers(next);
  } else if (
    (next.phase === 'discarding' || next.phase === 'drawing') &&
    next.currentPlayerIndex === idx
  ) {
    // Mid-turn leave (e.g. they had drawn but not yet discarded). Move
    // on cleanly.
    const { nextPlayerIndex, nextRound, isGameOver } = advancePlayer(
      idx,
      next.currentRound,
      next.settings.totalRounds,
      next.players.length
    );
    next = {
      ...next,
      currentPlayerIndex: nextPlayerIndex,
      currentRound: nextRound,
      drawnCard: null,
      phase: isGameOver ? 'game-over' : 'drawing',
      winner: isGameOver ? getRankings(next.players)[0]?.id ?? null : next.winner,
    };
    if (next.phase === 'drawing') next = skipPenalizedPlayers(next);
  }

  return next;
}
