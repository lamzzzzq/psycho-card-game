/**
 * Penalty-freeze edge cases.
 *
 * Scenario seat order: A(0) → B(1) → C(2). C pong-fails on A's discard.
 * From that moment until C's own turn auto-skips, C must be frozen out
 * of every claim window (pong / hu / skip). The auto-skip happens when
 * the turn rotates back to C; after that, C's downstream A becomes the
 * next active player and C is unfrozen.
 *
 * Without this, B's claim window would deadlock waiting for C to
 * respond — the panel is hidden for penalized players, so they have no
 * way to skip manually. Tests below cover the deadlock path explicitly.
 *
 * Also covered: pong-fail must NOT expose the entire hand (that's
 * reserved for hu-fail). Only `revealedSelectedCards` is set.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  attemptHu,
  pongCard,
  selfPongCard,
  skipPong,
  discardCard,
  drawCard,
  skipPenalizedPlayers,
} from '../game-logic';
import {
  makeCard,
  makeDummy,
  makeGameState,
  makePlayer,
  resetCardIds,
} from '@/test/fixtures';
import type { PlayerId } from '@/types';

beforeEach(() => {
  resetCardIds();
});

// Helper: build a 3-player state in claim-window phase, with A as
// discarder, a pending O-dimension card on the table. Default Big
// Five = 3 across the board → target O count = 3, so a C with two
// hand cards (one O + one wrong dim) + the pending makes 3 cards →
// passes the count gate, fails the all-correct check → pong-fail.
function aBcClaimState() {
  const pending = makeCard('O', { id: 100 });
  return makeGameState({
    phase: 'claim-window',
    discardedByIndex: 0, // A
    currentPlayerIndex: 0,
    pendingDiscard: pending,
    players: [
      makePlayer({ id: 'A' as PlayerId }),
      makePlayer({ id: 'B' as PlayerId }), // human so drawCard → 'discarding'
      makePlayer({
        id: 'C' as PlayerId,
        hand: [makeCard('O', { id: 1 }), makeCard('C', { id: 2 })],
      }),
    ],
    discardPile: [],
    drawPile: [makeCard('A', { id: 200 })],
  });
}

describe('pong-fail penalty (count too low)', () => {
  it('pong with insufficient cards is treated as a fail, not silently rejected', () => {
    // Default Big Five 3.0 → target O = 3. C selects only 1 card →
    // total (1 hand + 1 pending) = 2 < 3. Earlier code silently
    // bounced; now it must commit as a failed pong with penalty.
    const state = makeGameState({
      phase: 'claim-window',
      discardedByIndex: 0,
      currentPlayerIndex: 0,
      pendingDiscard: makeCard('O', { id: 100 }),
      players: [
        makePlayer({ id: 'A' as PlayerId }),
        makePlayer({ id: 'B' as PlayerId }),
        makePlayer({ id: 'C' as PlayerId, hand: [makeCard('O', { id: 1 })] }),
      ],
    });
    const result = pongCard(state, 2, 'O', [1]);
    // Penalty applied — not a no-op return.
    expect(result).not.toBe(state);
    expect(result.players[2].skipNextTurn).toBe(true);
    expect(result.players[2].revealedHand).toBe(false);
    expect(result.players[2].revealedSelectedCards?.length).toBe(1);
  });

  it('pong with no selected cards is also treated as a fail', () => {
    const state = makeGameState({
      phase: 'claim-window',
      discardedByIndex: 0,
      currentPlayerIndex: 0,
      pendingDiscard: makeCard('O', { id: 100 }),
      players: [
        makePlayer({ id: 'A' as PlayerId }),
        makePlayer({ id: 'B' as PlayerId }),
        makePlayer({ id: 'C' as PlayerId, hand: [makeCard('O', { id: 1 })] }),
      ],
    });
    const result = pongCard(state, 2, 'O', []);
    expect(result.players[2].skipNextTurn).toBe(true);
    expect(result.players[2].revealedSelectedCards?.length).toBe(0);
  });
});

describe('pong-fail penalty (visibility)', () => {
  it('pong-fail exposes only the attempted cards, NOT the full hand', () => {
    const state = aBcClaimState();
    // C tries to pong by selecting cards 1 (O) and 2 (C — wrong). With
    // pending that's 3 cards = target, but allCorrect=false → fail.
    const result = pongCard(state, 2, 'O', [1, 2]);
    const c = result.players[2];
    expect(c.skipNextTurn).toBe(true);
    expect(c.revealedHand).toBe(false); // important — full hand stays hidden
    expect(c.revealedSelectedCards).toBeDefined();
    expect(c.revealedSelectedCards?.length).toBe(2);
  });

  it('hu-fail still exposes the full hand', () => {
    const state = makeGameState({
      phase: 'drawing',
      currentPlayerIndex: 0,
      players: [
        makePlayer({ id: 'A' as PlayerId, hand: [makeCard('O')] }),
        makePlayer({ id: 'B' as PlayerId }),
      ],
    });
    const result = attemptHu(state, 0);
    expect(result.players[0].revealedHand).toBe(true);
    expect(result.players[0].skipNextTurn).toBe(true);
  });
});

describe('penalty freeze — C cannot act in B\'s claim window', () => {
  // Build a "post pong-fail" state: C is penalized, claim window
  // closed, currentPlayerIndex advanced to B, C still has skipNextTurn.
  function statePostPongFail() {
    return makeGameState({
      phase: 'drawing',
      currentPlayerIndex: 1, // B's turn now
      discardedByIndex: -1,
      players: [
        makePlayer({ id: 'A' as PlayerId }),
        makePlayer({ id: 'B' as PlayerId, hand: [makeCard('A', { id: 50 })] }),
        // C is penalized
        makePlayer({
          id: 'C' as PlayerId,
          hand: [
            makeCard('O', { id: 30 }),
            makeCard('O', { id: 31 }),
            makeCard('O', { id: 32 }),
          ],
          skipNextTurn: true,
          revealedSelectedCards: [makeCard('O', { id: 99 })],
        }),
      ],
      drawPile: [makeCard('A', { id: 60 })],
    });
  }

  it('B discards → claim window auto-records C\'s skip (no deadlock)', () => {
    let state = statePostPongFail();
    // B draws + discards a personality card.
    state = drawCard(state);
    expect(state.phase).toBe('discarding');
    state = discardCard(state, state.drawnCard!.id);
    // After discardCard, autoSkipPenalizedClaimers should fire.
    // Eligible non-discarders: A and C. C is penalized → auto-skipped.
    // A still needs to respond.
    expect(state.phase).toBe('claim-window');
    expect(state.claimResponses).toContain('C');
    expect(state.claimResponses).not.toContain('A');
  });

  it('penalized C cannot pong even if they would have qualifying cards', () => {
    const state = statePostPongFail();
    // Manually open a claim window with B as discarder.
    const claimState = makeGameState({
      ...state,
      phase: 'claim-window',
      discardedByIndex: 1,
      currentPlayerIndex: 1,
      pendingDiscard: makeCard('O', { id: 999 }),
      players: state.players,
      claimResponses: ['C' as PlayerId], // already auto-recorded
    });
    const result = pongCard(claimState, 2, 'O', [30]);
    // Already in claimResponses + skipNextTurn → pong rejected.
    expect(result).toBe(claimState);
  });

  it('penalized C cannot hu', () => {
    const state = statePostPongFail();
    const claimState = makeGameState({
      ...state,
      phase: 'claim-window',
      discardedByIndex: 1,
      pendingDiscard: makeCard('O', { id: 999 }),
      claimResponses: ['C' as PlayerId],
    });
    const result = attemptHu(claimState, 2);
    expect(result).toBe(claimState);
  });
});

describe('penalty freeze — full A→B→C→A cycle reaches normal play', () => {
  it('A discards → C pong-fails → B turn → C auto-skipped own turn → A unfreezes C', () => {
    // Build A's claim window with C about to pong-fail by selecting a
    // wrong-dim card alongside an O.
    let state = makeGameState({
      phase: 'claim-window',
      discardedByIndex: 0,
      currentPlayerIndex: 0,
      pendingDiscard: makeCard('O', { id: 100 }),
      drawPile: [makeCard('C', { id: 200 }), makeCard('C', { id: 201 })],
      players: [
        makePlayer({ id: 'A' as PlayerId }),
        makePlayer({ id: 'B' as PlayerId, hand: [makeCard('A', { id: 50 })] }),
        makePlayer({
          id: 'C' as PlayerId,
          hand: [makeCard('O', { id: 1 }), makeCard('C', { id: 2 })],
        }),
      ],
    });

    // Step 1: C pong-fails (mixed wrong dim — total 3 = target, but
    // not all O).
    state = pongCard(state, 2, 'O', [1, 2]);
    expect(state.players[2].skipNextTurn).toBe(true);

    // Step 2: B (the other claimer) skips → window finalizes, advance to B.
    state = skipPong(state, 1);
    expect(state.phase).toBe('drawing');
    expect(state.currentPlayerIndex).toBe(1);

    // Step 3: B draws + discards a personality card.
    state = drawCard(state);
    expect(state.phase).toBe('discarding');
    const drawnId = state.drawnCard!.id;
    state = discardCard(state, drawnId);
    // claim window opens; C auto-skipped.
    expect(state.phase).toBe('claim-window');
    expect(state.claimResponses).toContain('C');

    // Step 4: A skips → window finalizes, advance to C → C
    // skipPenalizedPlayers auto-skips → land on A.
    state = skipPong(state, 0);
    expect(state.phase).toBe('drawing');
    expect(state.currentPlayerIndex).toBe(0); // back to A
    // C is now unfrozen
    expect(state.players[2].skipNextTurn).toBe(false);
  });

  it('after C\'s auto-skip, drawCard on C\'s next visit clears revealedSelectedCards', () => {
    // C just got auto-skipped (skipNextTurn cleared) but reveal still set.
    let state = makeGameState({
      phase: 'drawing',
      currentPlayerIndex: 2,
      drawPile: [makeCard('O', { id: 70 })],
      players: [
        makePlayer({ id: 'A' as PlayerId }),
        makePlayer({ id: 'B' as PlayerId }),
        makePlayer({
          id: 'C' as PlayerId,
          skipNextTurn: false,
          revealedSelectedCards: [makeCard('O', { id: 88 })],
        }),
      ],
    });
    state = drawCard(state);
    expect(state.players[2].revealedSelectedCards).toBeUndefined();
  });
});

describe('penalty freeze — multiple penalized players', () => {
  it('all penalized claimers auto-skip; window finalizes on remaining player', () => {
    // A discards. B and C both penalized.
    let state = makeGameState({
      phase: 'drawing',
      currentPlayerIndex: 0,
      drawPile: [makeCard('O', { id: 100 })],
      players: [
        makePlayer({ id: 'A' as PlayerId, hand: [makeCard('O', { id: 10 })] }),
        makePlayer({ id: 'B' as PlayerId, skipNextTurn: true }),
        makePlayer({ id: 'C' as PlayerId, skipNextTurn: true }),
      ],
    });
    state = drawCard(state);
    state = discardCard(state, state.drawnCard!.id);
    // No human claimers left — both B and C auto-skipped → finalize.
    expect(state.phase).not.toBe('claim-window');
    // After finalize + skipPenalizedPlayers, turn should land somewhere
    // sensible (not stuck).
    expect(state.currentPlayerIndex).toBeGreaterThanOrEqual(0);
  });
});

describe('skipPenalizedPlayers — sanity: clears skipNextTurn after own auto-skip', () => {
  it('penalized player at head of turn queue auto-skips and clears flag', () => {
    let state = makeGameState({
      phase: 'drawing',
      currentPlayerIndex: 0,
      players: [
        makePlayer({ id: 'A' as PlayerId, skipNextTurn: true }),
        makePlayer({ id: 'B' as PlayerId }),
        makePlayer({ id: 'C' as PlayerId }),
      ],
    });
    state = skipPenalizedPlayers(state);
    expect(state.currentPlayerIndex).toBe(1); // advanced to B
    expect(state.players[0].skipNextTurn).toBe(false); // A unfrozen
  });
});

// New "罚停一整轮" semantic: a pong/hu-fail offender is locked out of
// every claim window from the moment of failure until they themselves
// complete a clean draw + discard turn (after the auto-skip that
// consumes skipNextTurn). The freeze is released by the offender's
// OWN next discard — independent of any other player's actions.
describe('penalty freeze — frozenUntilOwnDiscard (罚停一整轮)', () => {
  it('pong-fail tags the offender with frozenUntilOwnDiscard=true', () => {
    const state = makeGameState({
      phase: 'claim-window',
      discardedByIndex: 0,
      currentPlayerIndex: 0,
      pendingDiscard: makeCard('O', { id: 100 }),
      players: [
        makePlayer({ id: 'A' as PlayerId }),
        makePlayer({
          id: 'B' as PlayerId,
          hand: [makeCard('O', { id: 10 }), makeCard('C', { id: 11 })],
        }),
        makePlayer({ id: 'C' as PlayerId }),
      ],
    });
    const result = pongCard(state, 1, 'O', [10, 11]);
    expect(result.players[1].skipNextTurn).toBe(true);
    expect(result.players[1].frozenUntilOwnDiscard).toBe(true);
  });

  it('hu-fail tags the offender with frozenUntilOwnDiscard=true', () => {
    const state = makeGameState({
      phase: 'drawing',
      currentPlayerIndex: 0,
      players: [
        makePlayer({ id: 'A' as PlayerId, hand: [makeCard('O')] }),
        makePlayer({ id: 'B' as PlayerId }),
      ],
    });
    const result = attemptHu(state, 0);
    expect(result.players[0].skipNextTurn).toBe(true);
    expect(result.players[0].frozenUntilOwnDiscard).toBe(true);
    expect(result.players[0].revealedHand).toBe(true);
  });

  it('B\'s freeze survives the own-turn auto-skip — still locked out next claim window', () => {
    let state = makeGameState({
      phase: 'claim-window',
      discardedByIndex: 0,
      currentPlayerIndex: 0,
      pendingDiscard: makeCard('O', { id: 100 }),
      drawPile: [makeCard('A', { id: 200 }), makeCard('A', { id: 201 })],
      players: [
        makePlayer({ id: 'A' as PlayerId }),
        makePlayer({
          id: 'B' as PlayerId,
          hand: [makeCard('O', { id: 10 }), makeCard('C', { id: 11 })],
        }),
        makePlayer({ id: 'C' as PlayerId, hand: [] }),
      ],
    });

    state = pongCard(state, 1, 'O', [10, 11]);  // B fails
    state = skipPong(state, 2);                  // C skips → advance to B → auto-skip B → land on C
    expect(state.currentPlayerIndex).toBe(2);
    expect(state.players[1].skipNextTurn).toBe(false);     // consumed
    expect(state.players[1].frozenUntilOwnDiscard).toBe(true); // CRITICAL: still frozen

    // C draws + discards → claim window with C as discarder. B auto-skipped.
    state = drawCard(state);
    state = discardCard(state, state.drawnCard!.id);
    expect(state.phase).toBe('claim-window');
    expect(state.claimResponses).toContain('B');
    // Still frozen — only B's own discard clears it.
    expect(state.players[1].frozenUntilOwnDiscard).toBe(true);
  });

  it('B\'s own next clean discard clears B\'s freeze', () => {
    // Pre-built state: B already auto-skipped, frozenUntilOwnDiscard
    // still true, B's hand has a personality card to discard.
    let state = makeGameState({
      phase: 'drawing',
      currentPlayerIndex: 1, // B's turn (post auto-skip rotation)
      drawPile: [makeCard('A', { id: 300 })],
      players: [
        makePlayer({ id: 'A' as PlayerId }),
        makePlayer({
          id: 'B' as PlayerId,
          frozenUntilOwnDiscard: true,
          hand: [makeCard('O', { id: 50 })],
        }),
        makePlayer({ id: 'C' as PlayerId }),
      ],
    });
    state = drawCard(state);
    state = discardCard(state, state.drawnCard!.id);
    expect(state.players[1].frozenUntilOwnDiscard).toBe(false);
  });

  it('self-pong-fail: drawnCard returns to hand, both skipNextTurn AND frozenUntilOwnDiscard set, turn advanced', () => {
    // C is in own turn (phase=discarding, drawnCard set), big-five all
    // 3.0 so target for any dim = 3. C selects 2 wrong-dim cards → fail.
    const drawn = makeCard('A', { id: 500 });
    let state = makeGameState({
      phase: 'discarding',
      currentPlayerIndex: 2,
      drawnCard: drawn,
      players: [
        makePlayer({ id: 'A' as PlayerId }),
        makePlayer({ id: 'B' as PlayerId }),
        makePlayer({
          id: 'C' as PlayerId,
          hand: [makeCard('O', { id: 600 }), makeCard('C', { id: 601 })],
        }),
      ],
    });
    state = selfPongCard(state, 2, 'O', [600, 601]);
    // drawnCard returned to hand → no information lost, but no discard either.
    expect(state.players[2].hand.map((c) => c.id).sort()).toEqual([500, 600, 601]);
    // Both penalty marks set: skip own next turn + freeze claim windows
    // until the second own-turn discard.
    expect(state.players[2].skipNextTurn).toBe(true);
    expect(state.players[2].frozenUntilOwnDiscard).toBe(true);
    // Turn advanced past C.
    expect(state.currentPlayerIndex).not.toBe(2);
    expect(state.drawnCard).toBeNull();
  });

  it('a dummy-card own discard also clears the freeze', () => {
    let state = makeGameState({
      phase: 'drawing',
      currentPlayerIndex: 1,
      drawPile: [makeDummy({ id: 999 })],
      players: [
        makePlayer({ id: 'A' as PlayerId }),
        makePlayer({
          id: 'B' as PlayerId,
          frozenUntilOwnDiscard: true,
        }),
        makePlayer({ id: 'C' as PlayerId }),
      ],
    });
    state = drawCard(state);
    state = discardCard(state, state.drawnCard!.id);
    expect(state.players[1].frozenUntilOwnDiscard).toBe(false);
  });
});
