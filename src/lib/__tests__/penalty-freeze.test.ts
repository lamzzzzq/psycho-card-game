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

// Pong-fail by the IMMEDIATE downstream player (B against A) is the case
// where the natural turn rotation auto-skips B before the next claim
// window opens. Without the frozenUntilDiscarderIndex marker, B would
// regain the right to pong on C's discard immediately, which violates
// the symmetric "1 own-turn skip + 1 claim-window freeze" rule.
describe('penalty freeze — B-fail (immediate downstream)', () => {
  it('pong-fail tags the offender with the original discarder index', () => {
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
    expect(result.players[1].frozenUntilDiscarderIndex).toBe(0);
  });

  it('B is auto-skipped at own turn AND auto-marked in C\'s claim window', () => {
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

    // B fails (mixed dimensions; count satisfies target so we exercise
    // the all-correct gate, not the count gate).
    state = pongCard(state, 1, 'O', [10, 11]);
    // C skips → finalize → advance to B → skipPenalizedPlayers skips B.
    state = skipPong(state, 2);
    expect(state.currentPlayerIndex).toBe(2); // landed on C
    expect(state.players[1].skipNextTurn).toBe(false); // skip consumed
    // CRITICAL: freeze marker survives the own-turn skip.
    expect(state.players[1].frozenUntilDiscarderIndex).toBe(0);

    // C draws + discards a personality card → claim window with C as
    // discarder. B should be auto-marked (frozenUntilDiscarderIndex=0
    // does not match current discarder=2).
    state = drawCard(state);
    state = discardCard(state, state.drawnCard!.id);
    expect(state.phase).toBe('claim-window');
    expect(state.discardedByIndex).toBe(2);
    expect(state.claimResponses).toContain('B');
    // The freeze marker should still be set because A has not operated
    // again yet.
    expect(state.players[1].frozenUntilDiscarderIndex).toBe(0);
  });

  it('A\'s next discard clears B\'s freeze and B can claim again', () => {
    let state = makeGameState({
      phase: 'claim-window',
      discardedByIndex: 0,
      currentPlayerIndex: 0,
      pendingDiscard: makeCard('O', { id: 100 }),
      drawPile: [
        makeCard('A', { id: 200 }), // C draws this
        makeCard('A', { id: 201 }), // A draws this on round 2
      ],
      players: [
        makePlayer({ id: 'A' as PlayerId }),
        makePlayer({
          id: 'B' as PlayerId,
          hand: [makeCard('O', { id: 10 }), makeCard('C', { id: 11 })],
        }),
        makePlayer({ id: 'C' as PlayerId, hand: [] }),
      ],
    });

    state = pongCard(state, 1, 'O', [10, 11]); // B fails
    state = skipPong(state, 2);                 // C skips → land on C
    state = drawCard(state);                    // C draws
    state = discardCard(state, state.drawnCard!.id); // C discards
    state = skipPong(state, 0);                 // A skips → finalize → advance to A

    expect(state.currentPlayerIndex).toBe(0);

    // A draws + discards. discardCard clears any player whose freeze
    // marker matches the new discarder.
    state = drawCard(state);
    state = discardCard(state, state.drawnCard!.id);

    expect(state.phase).toBe('claim-window');
    expect(state.discardedByIndex).toBe(0);
    expect(state.players[1].frozenUntilDiscarderIndex).toBeUndefined();
    expect(state.claimResponses).not.toContain('B');
  });

  it('a dummy-card discard by the original block-discarder also lifts the freeze', () => {
    // Edge case: A's next operation happens to be a dummy-card discard
    // (no claim window). The freeze should still clear so B is not
    // stuck frozen forever.
    let state = makeGameState({
      phase: 'drawing',
      currentPlayerIndex: 0,
      drawPile: [makeDummy({ id: 999 })],
      players: [
        makePlayer({ id: 'A' as PlayerId }),
        makePlayer({
          id: 'B' as PlayerId,
          frozenUntilDiscarderIndex: 0,
        }),
        makePlayer({ id: 'C' as PlayerId }),
      ],
    });
    state = drawCard(state);
    state = discardCard(state, state.drawnCard!.id);
    expect(state.players[1].frozenUntilDiscarderIndex).toBeUndefined();
  });
});
