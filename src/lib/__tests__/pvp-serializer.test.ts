/**
 * Layer 1 unit tests for src/lib/pvp-serializer.ts
 *
 * **CRITICAL: This is a security boundary test.**
 *
 * If serializeGameState leaks an opponent's hand, the entire PVP game is
 * compromised — anyone listening to the Realtime broadcast could read all
 * hands. We test the boundary contract from multiple angles to make sure
 * regressions don't sneak in.
 *
 * Pattern: Arrange → Act → Assert. See TESTING_PLAN.md §8.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { serializeGameState } from '../pvp-serializer';
import { makeGameState, makeCard, makePlayer, resetCardIds } from '@/test/fixtures';

beforeEach(() => {
  resetCardIds();
});

describe('serializeGameState — viewer isolation (security)', () => {
  function buildStateWithDistinctHands() {
    const humanCards = [makeCard('O'), makeCard('C')];
    const ai1Cards = [makeCard('E'), makeCard('A')];
    const ai2Cards = [makeCard('N')];
    const state = makeGameState({
      players: [
        makePlayer({ id: 'human', hand: humanCards }),
        makePlayer({ id: 'ai-1', hand: ai1Cards, isHuman: false }),
        makePlayer({ id: 'ai-2', hand: ai2Cards, isHuman: false }),
      ],
    });
    return { state, humanCards, ai1Cards, ai2Cards };
  }

  it('reveals own hand to the viewer', () => {
    const { state, humanCards } = buildStateWithDistinctHands();
    const serialized = serializeGameState(state, 'human');
    const me = serialized.players.find((p) => p.id === 'human')!;
    expect(me.hand).toEqual(humanCards);
    expect(me.handCount).toBe(humanCards.length);
  });

  it('hides opponent hands from the viewer', () => {
    const { state } = buildStateWithDistinctHands();
    const serialized = serializeGameState(state, 'human');
    const opponent1 = serialized.players.find((p) => p.id === 'ai-1')!;
    const opponent2 = serialized.players.find((p) => p.id === 'ai-2')!;
    expect(opponent1.hand).toBeUndefined();
    expect(opponent2.hand).toBeUndefined();
  });

  it('still reveals opponent handCount (so UI can show card counts)', () => {
    const { state, ai1Cards, ai2Cards } = buildStateWithDistinctHands();
    const serialized = serializeGameState(state, 'human');
    const opponent1 = serialized.players.find((p) => p.id === 'ai-1')!;
    const opponent2 = serialized.players.find((p) => p.id === 'ai-2')!;
    expect(opponent1.handCount).toBe(ai1Cards.length);
    expect(opponent2.handCount).toBe(ai2Cards.length);
  });

  it('hides ALL hands when viewerPlayerId is null (generic broadcast)', () => {
    const { state } = buildStateWithDistinctHands();
    const serialized = serializeGameState(state, null);
    expect(serialized.players.every((p) => p.hand === undefined)).toBe(true);
  });

  it('reveals ALL hands when viewerPlayerId is "__all__" (host-only mode)', () => {
    const { state } = buildStateWithDistinctHands();
    const serialized = serializeGameState(state, '__all__');
    expect(serialized.players.every((p) => Array.isArray(p.hand))).toBe(true);
  });
});

describe('serializeGameState — drawnCard visibility', () => {
  it('hides drawnCard from non-current viewer', () => {
    const drawnCard = makeCard('O');
    const state = makeGameState({
      drawnCard,
      currentPlayerIndex: 0, // human's turn
      players: [makePlayer({ id: 'human' }), makePlayer({ id: 'ai-1', isHuman: false })],
    });
    const fromOpponent = serializeGameState(state, 'ai-1');
    expect(fromOpponent.drawnCard).toBeNull();
  });

  it('reveals drawnCard to the current player viewer', () => {
    const drawnCard = makeCard('O');
    const state = makeGameState({
      drawnCard,
      currentPlayerIndex: 0,
      players: [makePlayer({ id: 'human' }), makePlayer({ id: 'ai-1', isHuman: false })],
    });
    const fromCurrent = serializeGameState(state, 'human');
    expect(fromCurrent.drawnCard).toEqual(drawnCard);
  });

  it('reveals drawnCard in __all__ mode (host broadcast — clients filter by turn)', () => {
    const drawnCard = makeCard('O');
    const state = makeGameState({ drawnCard });
    const broadcast = serializeGameState(state, '__all__');
    expect(broadcast.drawnCard).toEqual(drawnCard);
  });
});

describe('serializeGameState — penalty reveals (hu-fail / pong-fail)', () => {
  it('exposes full hand when revealedHand=true (hu-fail penalty)', () => {
    const state = makeGameState();
    const culprit = state.players[1];
    culprit.revealedHand = true;
    culprit.hand = [makeCard('O'), makeCard('C')];
    const serialized = serializeGameState(state, 'human');
    const opp = serialized.players.find((p) => p.id === culprit.id)!;
    expect(opp.revealedCards).toEqual(culprit.hand);
  });

  it('exposes only attempted cards when revealedSelectedCards is set (pong-fail)', () => {
    const state = makeGameState();
    const culprit = state.players[1];
    const attempted = [makeCard('O'), makeCard('O')];
    culprit.revealedSelectedCards = attempted;
    culprit.hand = [...attempted, makeCard('C'), makeCard('N')]; // hand has more than the reveal
    const serialized = serializeGameState(state, 'human');
    const opp = serialized.players.find((p) => p.id === culprit.id)!;
    expect(opp.revealedSelectedCards).toEqual(attempted);
    // But the rest of the hand stays hidden
    expect(opp.hand).toBeUndefined();
  });
});

describe('serializeGameState — passthrough fields', () => {
  it('forwards phase, round, currentPlayerIndex, winner', () => {
    const state = makeGameState({
      phase: 'discarding',
      currentRound: 5,
      currentPlayerIndex: 2,
      winner: 'ai-1',
    });
    const serialized = serializeGameState(state, 'human');
    expect(serialized.phase).toBe('discarding');
    expect(serialized.currentRound).toBe(5);
    expect(serialized.currentPlayerIndex).toBe(2);
    expect(serialized.winner).toBe('ai-1');
  });

  it('uses drawPileCount instead of full drawPile contents (no cheating)', () => {
    const state = makeGameState({
      drawPile: [makeCard('O'), makeCard('C'), makeCard('E')],
    });
    const serialized = serializeGameState(state, 'human');
    expect(serialized.drawPileCount).toBe(3);
    // SerializedGameState type doesn't even have drawPile, so this is enforced by TS.
    expect((serialized as unknown as { drawPile?: unknown }).drawPile).toBeUndefined();
  });

  it('passes through totalRounds from settings', () => {
    const state = makeGameState({
      settings: { totalRounds: 8, aiDifficulty: 'easy' },
    });
    const serialized = serializeGameState(state, 'human');
    expect(serialized.totalRounds).toBe(8);
  });
});
