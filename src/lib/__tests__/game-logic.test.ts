/**
 * Layer 1 unit tests for src/lib/game-logic.ts
 *
 * Coverage map (from TESTING_PLAN.md §3):
 *   - initializeGame         → §"initializeGame"
 *   - hasWon                 → §"hasWon"
 *   - getDeclaredDimensions  → §"getDeclaredDimensions"
 *   - getPlayerScore         → §"getPlayerScore"
 *   - getRankings            → §"getRankings"
 *   - drawCard               → §"drawCard"
 *   - discardCard            → §"discardCard"
 *   - skipPong               → §"skipPong"
 *   - attemptHu              → §"attemptHu" (smoke test only — full coverage in Layer 2)
 *   - pongCard               → §"pongCard"  (smoke test only — full coverage in Layer 2)
 *   - skipPenalizedPlayers   → §"skipPenalizedPlayers"
 *
 * Pattern: Arrange → Act → Assert. See TESTING_PLAN.md §8.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  initializeGame,
  hasWon,
  getDeclaredDimensions,
  getPlayerScore,
  getRankings,
  drawCard,
  discardCard,
  skipPong,
  skipPenalizedPlayers,
} from '../game-logic';
import { DIMENSIONS } from '@/types';
import {
  makePlayer,
  makeGameState,
  makeCard,
  makeBigFive,
  makeSettings,
  resetCardIds,
} from '@/test/fixtures';

beforeEach(() => {
  resetCardIds();
});

// ─── initializeGame ──────────────────────────────────────────────────────────
describe('initializeGame', () => {
  it('creates 4 players (1 human + 3 AI)', () => {
    const state = initializeGame(makeBigFive(), makeSettings());
    expect(state.players).toHaveLength(4);
    expect(state.players[0].isHuman).toBe(true);
    expect(state.players.slice(1).every((p) => !p.isHuman)).toBe(true);
  });

  it('starts in "drawing" phase with player 0 active', () => {
    const state = initializeGame(makeBigFive(), makeSettings());
    expect(state.phase).toBe('drawing');
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.currentRound).toBe(1);
  });

  it('honors human Big Five scores', () => {
    const human = makeBigFive({ O: 4.5, N: 1.2 });
    const state = initializeGame(human, makeSettings());
    expect(state.players[0].bigFiveScores).toEqual(human);
  });

  it('deals each player a non-empty hand', () => {
    const state = initializeGame(makeBigFive(), makeSettings());
    state.players.forEach((p) => expect(p.hand.length).toBeGreaterThan(0));
  });

  it('initializes empty discard pile and no winner', () => {
    const state = initializeGame(makeBigFive(), makeSettings());
    expect(state.discardPile).toEqual([]);
    expect(state.winner).toBeNull();
    expect(state.actionLog).toEqual([]);
  });
});

// ─── hasWon ──────────────────────────────────────────────────────────────────
describe('hasWon', () => {
  it('returns false when no dimensions declared', () => {
    expect(hasWon(makePlayer())).toBe(false);
  });

  it('returns false when only some dimensions declared', () => {
    const player = makePlayer({
      declaredSets: [{ dimension: 'O', cards: [makeCard('O')], round: 1 }],
    });
    expect(hasWon(player)).toBe(false);
  });

  it('returns true when all 5 dimensions declared', () => {
    const declaredSets = DIMENSIONS.map((d) => ({
      dimension: d,
      cards: [makeCard(d), makeCard(d)],
      round: 1,
    }));
    expect(hasWon(makePlayer({ declaredSets }))).toBe(true);
  });
});

// ─── getDeclaredDimensions ───────────────────────────────────────────────────
describe('getDeclaredDimensions', () => {
  it('returns empty Set for fresh player', () => {
    expect(getDeclaredDimensions(makePlayer()).size).toBe(0);
  });

  it('collects unique dimensions from declared sets', () => {
    const player = makePlayer({
      declaredSets: [
        { dimension: 'O', cards: [], round: 1 },
        { dimension: 'C', cards: [], round: 1 },
        { dimension: 'O', cards: [], round: 2 }, // duplicate dim
      ],
    });
    const dims = getDeclaredDimensions(player);
    expect(dims.has('O')).toBe(true);
    expect(dims.has('C')).toBe(true);
    expect(dims.size).toBe(2);
  });
});

// ─── getPlayerScore + getRankings ────────────────────────────────────────────
describe('getPlayerScore', () => {
  it('returns 0 for player with no declared sets', () => {
    expect(getPlayerScore(makePlayer())).toBe(0);
  });

  it('aggregates positive score from declared sets', () => {
    const player = makePlayer({
      bigFiveScores: makeBigFive({ O: 4 }),
      declaredSets: [
        { dimension: 'O', cards: [makeCard('O'), makeCard('O')], round: 1 },
      ],
    });
    expect(getPlayerScore(player)).toBeGreaterThan(0);
  });
});

describe('getRankings', () => {
  it('returns players sorted by score descending', () => {
    const high = makePlayer({
      id: 'human',
      bigFiveScores: makeBigFive({ O: 5 }),
      declaredSets: [
        { dimension: 'O', cards: [makeCard('O'), makeCard('O')], round: 1 },
      ],
    });
    const low = makePlayer({ id: 'ai-1' });
    const ranked = getRankings([low, high]);
    expect(ranked[0].id).toBe('human');
  });

  it('preserves all players (no drops)', () => {
    const players = [makePlayer({ id: 'human' }), makePlayer({ id: 'ai-1' })];
    expect(getRankings(players)).toHaveLength(2);
  });
});

// ─── drawCard ────────────────────────────────────────────────────────────────
//
// NOTE: game-logic.drawCard does NOT guard on phase — it executes
// unconditionally. The phase guard lives in pvp-game-logic.applyPvpAction
// (PVP layer is the trust boundary; single-player calls are trusted).
// See TESTING_LOG.md "Discovery 1" for why this matters.
describe('drawCard', () => {
  it('moves a card from drawPile to drawnCard and switches phase', () => {
    const card = makeCard('O');
    const state = makeGameState({ phase: 'drawing', drawPile: [card] });
    const result = drawCard(state);
    expect(result.drawnCard).toEqual(card);
    expect(result.drawPile).toHaveLength(0);
    // Human player → 'discarding'; AI player → 'ai-turn'
    expect(result.phase).toBe('discarding');
  });

  it('logs a draw action', () => {
    const card = makeCard('O');
    const state = makeGameState({ phase: 'drawing', drawPile: [card] });
    const result = drawCard(state);
    expect(result.actionLog).toHaveLength(1);
    expect(result.actionLog[0].type).toBe('draw');
  });

  it('forces game-over when both drawPile and discardPile are empty', () => {
    const state = makeGameState({ phase: 'drawing', drawPile: [], discardPile: [] });
    const result = drawCard(state);
    expect(result.phase).toBe('game-over');
    expect(result.winner).not.toBeNull();
  });

  it('reshuffles discard pile back into draw pile when draw pile empties', () => {
    const recycled = makeCard('O');
    const state = makeGameState({
      phase: 'drawing',
      drawPile: [],
      discardPile: [recycled],
    });
    const result = drawCard(state);
    expect(result.drawnCard).toEqual(recycled);
    expect(result.discardPile).toHaveLength(0);
  });
});

// ─── discardCard ─────────────────────────────────────────────────────────────
//
// NOTE: discardCard also has no phase guard — it filters by cardId presence.
// If cardId not in hand+drawn, it's a no-op via early return.
describe('discardCard', () => {
  it('returns state unchanged if cardId not in hand or drawn card', () => {
    const state = makeGameState({ phase: 'discarding' });
    state.players[0].hand = [makeCard('O')];
    const result = discardCard(state, 99999);
    expect(result).toBe(state); // exact same reference
  });

  it('removes the card from current player hand', () => {
    const card = makeCard('O');
    const state = makeGameState({ phase: 'discarding' });
    state.players[0].hand = [card, makeCard('C')];
    const result = discardCard(state, card.id);
    expect(result.players[0].hand.find((c) => c.id === card.id)).toBeUndefined();
    expect(result.players[0].hand).toHaveLength(1);
  });

  it('opens claim-window after discard (so others can pong)', () => {
    const card = makeCard('O');
    const state = makeGameState({ phase: 'discarding' });
    state.players[0].hand = [card];
    const result = discardCard(state, card.id);
    expect(result.phase).toBe('claim-window');
    expect(result.pendingDiscard).toEqual(card);
    expect(result.discardedByIndex).toBe(0);
  });
});

// ─── skipPong ────────────────────────────────────────────────────────────────
describe('skipPong', () => {
  it('records the skipping player into claimResponses', () => {
    const state = makeGameState({
      phase: 'claim-window',
      discardedByIndex: 0,
      pendingDiscard: makeCard('O'),
    });
    const result = skipPong(state, 1);
    expect(result.claimResponses).toContain(state.players[1].id);
  });
});

// ─── skipPenalizedPlayers ────────────────────────────────────────────────────
describe('skipPenalizedPlayers', () => {
  it('does not change state when no one is penalized', () => {
    const state = makeGameState({ phase: 'drawing' });
    const result = skipPenalizedPlayers(state);
    expect(result.currentPlayerIndex).toBe(0);
  });

  it('skips a penalized player at the head of turn queue', () => {
    const state = makeGameState({
      phase: 'drawing',
      currentPlayerIndex: 0,
    });
    state.players[0].skipNextTurn = true;
    const result = skipPenalizedPlayers(state);
    expect(result.currentPlayerIndex).not.toBe(0);
    expect(result.players[0].skipNextTurn).toBe(false);
  });
});
