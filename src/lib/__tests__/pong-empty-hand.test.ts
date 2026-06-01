/**
 * Empty-hand-after-pong deadlock guard.
 *
 * A non-winning pong (or self-pong) can consume the player's ENTIRE hand
 * when their last cards happen to all be the ponged dimension. Before the
 * fix they were left in phase='discarding' with 0 cards and no drawnCard —
 * a permanent deadlock (the discard UI has nothing to click). Now the
 * stolen turn simply ends and play advances to the next seat.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { pongCard, selfPongCard } from '../game-logic';
import { makeCard, makeGameState, makePlayer, resetCardIds } from '@/test/fixtures';
import type { PlayerId } from '@/types';

beforeEach(() => resetCardIds());

describe('pong empty-hand deadlock guard', () => {
  it('pong consuming the whole hand (non-win) advances the turn instead of deadlocking', () => {
    const state = makeGameState({
      phase: 'claim-window', discardedByIndex: 0, currentPlayerIndex: 0,
      pendingDiscard: makeCard('O', { id: 100 }),
      drawPile: [makeCard('A', { id: 200 })],
      players: [
        makePlayer({ id: 'A' as PlayerId }),
        makePlayer({ id: 'B' as PlayerId, hand: [makeCard('O', { id: 10 }), makeCard('O', { id: 11 })] }),
        makePlayer({ id: 'C' as PlayerId }),
      ],
    });
    const r = pongCard(state, 1, 'O', [10, 11]);
    expect(r.players[1].hand.length).toBe(0);
    expect(r.players[1].declaredSets.length).toBe(1); // O declared
    expect(r.phase).not.toBe('discarding');           // NOT stuck owing a discard
    expect(r.currentPlayerIndex).not.toBe(1);          // turn moved past B
    expect(r.winner).toBeNull();                       // B did not win
  });

  it('self-pong consuming hand+drawn (non-win) advances the turn', () => {
    const drawn = makeCard('O', { id: 500 });
    const state = makeGameState({
      phase: 'discarding', currentPlayerIndex: 1, drawnCard: drawn,
      drawPile: [makeCard('A', { id: 600 })],
      players: [
        makePlayer({ id: 'A' as PlayerId }),
        makePlayer({ id: 'B' as PlayerId, hand: [makeCard('O', { id: 10 }), makeCard('O', { id: 11 })] }),
        makePlayer({ id: 'C' as PlayerId }),
      ],
    });
    // target O = 3 → select both hand O + drawn O = 3 → success, hand empties, drawn used.
    const r = selfPongCard(state, 1, 'O', [10, 11, 500]);
    expect(r.players[1].hand.length).toBe(0);
    expect(r.players[1].declaredSets.length).toBe(1);
    expect(r.phase).not.toBe('discarding');
    expect(r.currentPlayerIndex).not.toBe(1);
    expect(r.drawnCard).toBeNull();
  });
});
