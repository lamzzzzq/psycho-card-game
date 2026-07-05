/**
 * Layer 1 unit tests for src/lib/pvp-game-logic.ts
 *
 * pvp-game-logic is the trust boundary: it validates incoming actions
 * (current player, phase, etc.) before delegating to game-logic.
 * These tests focus on the GUARDS — the cases where bad input must be
 * rejected (state returned unchanged).
 *
 * See TESTING_PLAN.md §3 for coverage map.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { initializePvpGame, applyPvpAction } from '../pvp-game-logic';
import type { RoomPlayer, RoomSettings, PvpAction } from '@/types/pvp';
import type { BigFiveScores } from '@/types';
import { makeBigFive, makeCard, makeGameState, makePlayer, resetCardIds } from '@/test/fixtures';

beforeEach(() => {
  resetCardIds();
});

const settings: RoomSettings = { totalRounds: 4, maxPlayers: 4 };

function makeRoomPlayers(uuids: string[]): RoomPlayer[] {
  return uuids.map((id, i) => ({
    room_id: 'room-test',
    player_id: id,
    seat_index: i,
    student_id: `student-${i}`,
  }));
}

// ─── initializePvpGame ───────────────────────────────────────────────────────
describe('initializePvpGame', () => {
  it('builds a game state with the supplied player count', () => {
    const players = makeRoomPlayers(['uuid-a', 'uuid-b', 'uuid-c']);
    const bigFiveMap: Record<string, BigFiveScores> = {
      'uuid-a': makeBigFive({ O: 4 }),
      'uuid-b': makeBigFive({ C: 5 }),
      'uuid-c': makeBigFive(),
    };
    const state = initializePvpGame(players, bigFiveMap, settings);
    expect(state.players).toHaveLength(3);
    expect(state.players.every((p) => p.isHuman)).toBe(true);
    expect(state.phase).toBe('drawing');
    expect(state.currentRound).toBe(1);
  });

  it('falls back to random Big Five when player has no scores in the map', () => {
    const players = makeRoomPlayers(['uuid-a']);
    const state = initializePvpGame(players, {}, settings);
    const scores = state.players[0].bigFiveScores;
    expect(scores.O).toBeGreaterThanOrEqual(1);
    expect(scores.O).toBeLessThanOrEqual(5);
  });

  it('respects supplied Big Five for known players', () => {
    const myScores = makeBigFive({ O: 4.7, N: 1.3 });
    const players = makeRoomPlayers(['uuid-a']);
    const state = initializePvpGame(players, { 'uuid-a': myScores }, settings);
    expect(state.players[0].bigFiveScores).toEqual(myScores);
  });

  it('propagates totalRounds from settings', () => {
    const players = makeRoomPlayers(['uuid-a', 'uuid-b']);
    const state = initializePvpGame(players, {}, { totalRounds: 7, maxPlayers: 4 });
    expect(state.settings.totalRounds).toBe(7);
  });
});

// ─── applyPvpAction — security guards ────────────────────────────────────────
describe('applyPvpAction — security guards', () => {
  function stateWithCustomPlayers() {
    return makeGameState({
      phase: 'drawing',
      currentPlayerIndex: 0,
      players: [
        makePlayer({ id: 'uuid-a' as any }),
        makePlayer({ id: 'uuid-b' as any, isHuman: false }),
        makePlayer({ id: 'uuid-c' as any, isHuman: false }),
      ],
    });
  }

  it('rejects draw from a non-current player', () => {
    const state = stateWithCustomPlayers();
    state.drawPile = [makeCard('O')];
    const result = applyPvpAction(state, 'uuid-b', { type: 'draw' });
    expect(result).toBe(state); // unchanged reference
  });

  it('rejects discard from a non-current player', () => {
    const state = stateWithCustomPlayers();
    const card = makeCard('O');
    state.players[1].hand = [card];
    const action: PvpAction = { type: 'discard', cardId: card.id };
    const result = applyPvpAction(state, 'uuid-b', action);
    expect(result).toBe(state);
  });

  it('rejects pong outside claim-window', () => {
    const state = stateWithCustomPlayers();
    state.phase = 'drawing';
    const action: PvpAction = { type: 'pong', dimension: 'O', handCardIds: [] };
    const result = applyPvpAction(state, 'uuid-b', action);
    expect(result).toBe(state);
  });

  it('rejects skip-pong outside claim-window', () => {
    const state = stateWithCustomPlayers();
    state.phase = 'drawing';
    const action: PvpAction = { type: 'skip-pong' };
    const result = applyPvpAction(state, 'uuid-b', action);
    expect(result).toBe(state);
  });

  it('rejects hu from a non-current player outside claim-window (late-arriving hu must not steal drawnCard / warp the turn)', () => {
    const state = stateWithCustomPlayers();
    state.phase = 'drawing';
    const result = applyPvpAction(state, 'uuid-b', { type: 'hu' });
    expect(result).toBe(state);
  });

  it('rejects actions from a player not seated in the game state', () => {
    const state = stateWithCustomPlayers();
    const result = applyPvpAction(state, 'uuid-ghost', { type: 'hu' });
    expect(result).toBe(state);
  });

  it('maps seats by engine state, not room roster: actions stay correct after a seat is removed from the roster', () => {
    // 房間名冊剔除了 uuid-b（中途離線被移出），但引擎 players 座位不變。
    // uuid-c（引擎 index 2）在 claim-window 中 skip-pong，記錄的必須是 uuid-c。
    const state = stateWithCustomPlayers();
    state.phase = 'claim-window';
    state.discardedByIndex = 0;
    state.pendingDiscard = makeCard('O');
    const result = applyPvpAction(state, 'uuid-c', { type: 'skip-pong' });
    expect(result.claimResponses).toContain('uuid-c');
    expect(result.claimResponses).not.toContain('uuid-b');
  });

  it('locks out players who already responded in the current claim-window', () => {
    const state = stateWithCustomPlayers();
    state.phase = 'claim-window';
    state.discardedByIndex = 0;
    state.pendingDiscard = makeCard('O');
    state.claimResponses = ['uuid-b'] as any;
    // uuid-b already skipped — second skip-pong from same player must be no-op
    const action: PvpAction = { type: 'skip-pong' };
    const result = applyPvpAction(state, 'uuid-b', action);
    expect(result).toBe(state);
  });
});

// ─── applyPvpAction — happy path delegations ────────────────────────────────
describe('applyPvpAction — happy paths', () => {
  it('draw from current player advances state to discarding', () => {
    const card = makeCard('O');
    const state = makeGameState({
      phase: 'drawing',
      currentPlayerIndex: 0,
      drawPile: [card],
      players: [
        makePlayer({ id: 'uuid-a' as any }),
        makePlayer({ id: 'uuid-b' as any, isHuman: false }),
      ],
    });
    const result = applyPvpAction(state, 'uuid-a', { type: 'draw' });
    expect(result.phase).toBe('discarding');
    expect(result.drawnCard).toEqual(card);
  });

  it('skip-pong inside claim-window from non-current player records response', () => {
    // Need 3 players so the claim-window stays open after one skip
    // (with 2 players, the only eligible claimer's skip auto-finalizes
    //  the window and clears claimResponses).
    const state = makeGameState({
      phase: 'claim-window',
      discardedByIndex: 0,
      pendingDiscard: makeCard('O'),
      players: [
        makePlayer({ id: 'uuid-a' as any }),
        makePlayer({ id: 'uuid-b' as any, isHuman: false }),
        makePlayer({ id: 'uuid-c' as any, isHuman: false }),
      ],
    });
    const result = applyPvpAction(state, 'uuid-b', { type: 'skip-pong' });
    expect(result.claimResponses).toContain('uuid-b');
    // uuid-c hasn't responded yet, so window is still open
    expect(result.phase).toBe('claim-window');
  });
});
