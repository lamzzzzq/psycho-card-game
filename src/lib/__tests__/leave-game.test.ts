/**
 * Coverage for markPlayerLeft + hasLeft engine integration.
 * Mirrors the user story: "退出即退出，少一人继续打，仅剩 1 人即胜负"
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { markPlayerLeft, skipPenalizedPlayers } from '../game-logic';
import { makePlayer, makeGameState, makeCard, resetCardIds } from '@/test/fixtures';

beforeEach(() => {
  resetCardIds();
});

describe('markPlayerLeft', () => {
  it('sets hasLeft on the targeted player', () => {
    const state = makeGameState();
    const next = markPlayerLeft(state, 'ai-1');
    expect(next.players.find((p) => p.id === 'ai-1')?.hasLeft).toBe(true);
    expect(next.players.find((p) => p.id === 'human')?.hasLeft).toBeFalsy();
  });

  it('is idempotent — second leave is a no-op', () => {
    const state = makeGameState();
    const once = markPlayerLeft(state, 'ai-1');
    const twice = markPlayerLeft(once, 'ai-1');
    expect(twice).toBe(once);
  });

  it('ends the game when only one active player remains, awarding them the win', () => {
    const state = makeGameState();
    let next = markPlayerLeft(state, 'ai-1');
    next = markPlayerLeft(next, 'ai-2');
    next = markPlayerLeft(next, 'ai-3');
    expect(next.phase).toBe('game-over');
    expect(next.winner).toBe('human');
  });

  it('current-player-leaves mid-discard advances the turn cleanly', () => {
    const state = makeGameState({
      phase: 'discarding',
      currentPlayerIndex: 0,
      drawnCard: makeCard('O'),
    });
    const next = markPlayerLeft(state, 'human');
    expect(next.players[0].hasLeft).toBe(true);
    expect(next.currentPlayerIndex).not.toBe(0);
    // drawnCard is dropped — the seat is dead, the card never made it
    // back to a hand or to the discard pile.
    expect(next.drawnCard).toBeNull();
  });

  it('current-player-leaves in drawing phase: skip machinery advances past them', () => {
    const state = makeGameState({
      phase: 'drawing',
      currentPlayerIndex: 0,
    });
    const next = markPlayerLeft(state, 'human');
    expect(next.players[0].hasLeft).toBe(true);
    expect(next.currentPlayerIndex).toBe(1);
    expect(next.phase).toBe('drawing');
  });

  it('non-current-player leaves during claim-window: auto-passes their claim', () => {
    const pending = makeCard('O');
    const state = makeGameState({
      phase: 'claim-window',
      currentPlayerIndex: 0,
      discardedByIndex: 0,
      pendingDiscard: pending,
      claimResponses: [],
    });
    const next = markPlayerLeft(state, 'ai-2');
    // ai-2 is appended to claimResponses (since they didn't discard).
    expect(next.players[2].hasLeft).toBe(true);
    // Either still in claim-window with the response logged, or
    // finalized if everyone else also got auto-passed.
    if (next.phase === 'claim-window') {
      expect(next.claimResponses).toContain('ai-2');
    }
  });

  it('skipPenalizedPlayers fast-forwards past consecutive hasLeft seats', () => {
    const state = makeGameState({
      phase: 'drawing',
      currentPlayerIndex: 1,
      players: [
        makePlayer({ id: 'human' }),
        makePlayer({ id: 'ai-1', isHuman: false, hasLeft: true }),
        makePlayer({ id: 'ai-2', isHuman: false, hasLeft: true }),
        makePlayer({ id: 'ai-3', isHuman: false }),
      ],
    });
    const next = skipPenalizedPlayers(state);
    // Should fast-forward to ai-3 (index 3).
    expect(next.currentPlayerIndex).toBe(3);
    // hasLeft must NOT be cleared by the skip — only skipNextTurn is.
    expect(next.players[1].hasLeft).toBe(true);
    expect(next.players[2].hasLeft).toBe(true);
  });
});
