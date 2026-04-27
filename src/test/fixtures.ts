/**
 * Shared test fixtures.
 *
 * Use these factory functions to construct domain objects in tests.
 * Each factory takes an optional `overrides` argument so you can tweak
 * just the field you care about, without rebuilding everything.
 *
 * Example:
 *   const player = makePlayer({ id: 'human', hand: [makeCard('O')] });
 */

import type {
  BigFiveScores,
  GameState,
  Player,
  PlayerId,
  PersonalityCard,
  DummyCard,
  Dimension,
  GameSettings,
} from '@/types';

let cardIdCounter = 1;

export function resetCardIds() {
  cardIdCounter = 1;
}

export function makeBigFive(overrides: Partial<BigFiveScores> = {}): BigFiveScores {
  return { O: 3, C: 3, E: 3, A: 3, N: 3, ...overrides };
}

export function makeCard(
  dimension: Dimension,
  overrides: Partial<PersonalityCard> = {}
): PersonalityCard {
  return {
    id: cardIdCounter++,
    dimension,
    text: `test-${dimension}-card`,
    facet: 'test-facet',
    ...overrides,
  };
}

export function makeDummy(overrides: Partial<DummyCard> = {}): DummyCard {
  return {
    id: cardIdCounter++,
    text: 'dummy',
    isDummy: true,
    ...overrides,
  };
}

export function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: 'human' as PlayerId,
    name: 'TestPlayer',
    avatar: '🧪',
    hand: [],
    isHuman: true,
    bigFiveScores: makeBigFive(),
    declaredSets: [],
    skipNextTurn: false,
    revealedHand: false,
    ...overrides,
  };
}

export function makeSettings(overrides: Partial<GameSettings> = {}): GameSettings {
  return { totalRounds: 0, aiDifficulty: 'easy', ...overrides };
}

export function makeGameState(overrides: Partial<GameState> = {}): GameState {
  return {
    phase: 'drawing',
    settings: makeSettings(),
    players: [
      makePlayer({ id: 'human' }),
      makePlayer({ id: 'ai-1', isHuman: false }),
      makePlayer({ id: 'ai-2', isHuman: false }),
      makePlayer({ id: 'ai-3', isHuman: false }),
    ],
    drawPile: [],
    discardPile: [],
    currentPlayerIndex: 0,
    currentRound: 1,
    actionLog: [],
    drawnCard: null,
    pendingDiscard: null,
    discardedByIndex: -1,
    claimResponses: [],
    winner: null,
    ...overrides,
  };
}
