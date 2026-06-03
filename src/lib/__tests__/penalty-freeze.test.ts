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

describe('own-turn hu-fail — 立即 advance turn (banner-vs-action 一致性 fix)', () => {
  it('phase=drawing 时 own-turn hu-fail：立即 advance turn，下家接管', () => {
    const state = makeGameState({
      phase: 'drawing',
      currentPlayerIndex: 0,
      players: [
        makePlayer({ id: 'A' as PlayerId, hand: [makeCard('O', { id: 1 })] }),
        makePlayer({ id: 'B' as PlayerId }),
        makePlayer({ id: 'C' as PlayerId }),
      ],
      drawPile: [makeCard('A', { id: 99 })],
    });
    const result = attemptHu(state, 0);
    expect(result.phase).toBe('drawing');
    expect(result.currentPlayerIndex).toBe(1); // 不再停在 A
    expect(result.players[0].skipNextTurn).toBe(true);
    expect(result.players[0].frozenUntilOwnDiscard).toBe(true);
    expect(result.drawnCard).toBeNull();
  });

  it('phase=discarding 时 own-turn hu-fail：drawnCard 还回手牌 + advance turn', () => {
    const drawn = makeCard('A', { id: 500 });
    const state = makeGameState({
      phase: 'discarding',
      currentPlayerIndex: 0,
      drawnCard: drawn,
      players: [
        makePlayer({ id: 'A' as PlayerId, hand: [makeCard('O', { id: 10 })] }),
        makePlayer({ id: 'B' as PlayerId }),
        makePlayer({ id: 'C' as PlayerId }),
      ],
    });
    const result = attemptHu(state, 0);
    expect(result.currentPlayerIndex).toBe(1);
    expect(result.drawnCard).toBeNull();
    // drawnCard 500 应被塞回 A 手牌
    expect(result.players[0].hand.map((c) => c.id).sort()).toEqual([10, 500]);
    expect(result.players[0].skipNextTurn).toBe(true);
    expect(result.players[0].frozenUntilOwnDiscard).toBe(true);
    expect(result.players[0].revealedHand).toBe(true);
  });

  it('own-turn hu-fail 当回合 frozenUntilOwnDiscard 不会被 discard 立即清掉', () => {
    // 新 spec 关键不变量：当回合不再调 discardCard（因为已 advance turn），
    // 所以 frozenUntilOwnDiscard 必然保留到下一圈玩家自己的解冻轮。
    const state = makeGameState({
      phase: 'discarding',
      currentPlayerIndex: 0,
      drawnCard: makeCard('A', { id: 7 }),
      players: [
        makePlayer({ id: 'A' as PlayerId, hand: [makeCard('O', { id: 8 })] }),
        makePlayer({ id: 'B' as PlayerId }),
      ],
    });
    const result = attemptHu(state, 0);
    expect(result.players[0].frozenUntilOwnDiscard).toBe(true);
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
    // 加重罚停（extraSkipQueued）：第一次 own-turn skip 后立即激活 skipNextTurn=true
    // 让下一圈再跳一次。C 还在罚停中。
    expect(state.players[2].skipNextTurn).toBe(true);
    expect(state.players[2].extraSkipQueued).toBe(false); // 已 consume
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
    // 加重罚停：第一次 own-skip 触发 extraSkipQueued → 重新激活 skipNextTurn
    expect(state.players[1].skipNextTurn).toBe(true);
    expect(state.players[1].extraSkipQueued).toBe(false); // consumed
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

  it('强 trap: 已归档维度 pong → fail + 罚停 + failReason="already-declared"', () => {
    // B 已经归档 O 维度。A 出了一张 O，B 仍然 commit pong O → 应判 fail。
    const state = makeGameState({
      phase: 'claim-window',
      discardedByIndex: 0,
      currentPlayerIndex: 0,
      pendingDiscard: makeCard('O', { id: 100 }),
      players: [
        makePlayer({ id: 'A' as PlayerId }),
        makePlayer({
          id: 'B' as PlayerId,
          hand: [makeCard('O', { id: 10 }), makeCard('O', { id: 11 })],
          declaredSets: [
            {
              dimension: 'O',
              cards: [
                makeCard('O', { id: 90 }),
                makeCard('O', { id: 91 }),
                makeCard('O', { id: 92 }),
              ],
              round: 1,
            },
          ],
        }),
        makePlayer({ id: 'C' as PlayerId }),
      ],
    });
    const result = pongCard(state, 1, 'O', [10, 11]);
    expect(result.players[1].skipNextTurn).toBe(true);
    expect(result.players[1].frozenUntilOwnDiscard).toBe(true);
    // 找最后一个 pong-fail（actionLog 末尾可能因 finalizeClaimWindow 追加了 skip）
    const failAction = [...result.actionLog].reverse().find((a) => a.type === 'pong-fail');
    expect(failAction).toBeDefined();
    expect(failAction!.failReason).toBe('already-declared');
  });

  it('强 trap: 已归档维度 self-pong → fail + 罚停 + failReason="already-declared"', () => {
    const drawn = makeCard('O', { id: 500 });
    const state = makeGameState({
      phase: 'discarding',
      currentPlayerIndex: 0,
      drawnCard: drawn,
      players: [
        makePlayer({
          id: 'A' as PlayerId,
          hand: [makeCard('O', { id: 10 }), makeCard('O', { id: 11 })],
          declaredSets: [
            {
              dimension: 'O',
              cards: [
                makeCard('O', { id: 90 }),
                makeCard('O', { id: 91 }),
                makeCard('O', { id: 92 }),
              ],
              round: 1,
            },
          ],
        }),
        makePlayer({ id: 'B' as PlayerId }),
      ],
    });
    const result = selfPongCard(state, 0, 'O', [10, 11, 500]);
    expect(result.players[0].skipNextTurn).toBe(true);
    expect(result.players[0].frozenUntilOwnDiscard).toBe(true);
    const failAction = [...result.actionLog].reverse().find((a) => a.type === 'pong-fail');
    expect(failAction).toBeDefined();
    expect(failAction!.failReason).toBe('already-declared');
  });

  it('普通 pong-fail (count/dim 错) failReason="wrong-cards"', () => {
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
      ],
    });
    const result = pongCard(state, 1, 'O', [10, 11]);
    const failAction = [...result.actionLog].reverse().find((a) => a.type === 'pong-fail');
    expect(failAction).toBeDefined();
    expect(failAction!.failReason).toBe('wrong-cards');
  });

  it('加重罚停：pong-fail 后 extraSkipQueued=true，第一次 own-skip 后重新激活 skipNextTurn', () => {
    // B fails → both flags set
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
        makePlayer({ id: 'C' as PlayerId, hand: [] }),
      ],
    });
    const afterFail = pongCard(state, 1, 'O', [10, 11]);
    expect(afterFail.players[1].skipNextTurn).toBe(true);
    expect(afterFail.players[1].extraSkipQueued).toBe(true);
    expect(afterFail.players[1].frozenUntilOwnDiscard).toBe(true);
  });

  it('加重罚停：skipPenalizedPlayers 单次调用 consume 一次后立即激活 skipNextTurn 第二次', () => {
    // 直接构造 currentPlayerIndex=B + B 罚停状态
    const state = makeGameState({
      phase: 'drawing',
      currentPlayerIndex: 1,
      players: [
        makePlayer({ id: 'A' as PlayerId }),
        makePlayer({
          id: 'B' as PlayerId,
          skipNextTurn: true,
          extraSkipQueued: true,
          frozenUntilOwnDiscard: true,
        }),
        makePlayer({ id: 'C' as PlayerId }),
      ],
    });
    const result = skipPenalizedPlayers(state);
    // B 被跳了一次，extraSkipQueued consume 后重新激活 skipNextTurn
    expect(result.players[1].skipNextTurn).toBe(true);
    expect(result.players[1].extraSkipQueued).toBe(false);
    expect(result.players[1].frozenUntilOwnDiscard).toBe(true);
    // turn advance 到下一玩家
    expect(result.currentPlayerIndex).not.toBe(1);
  });

  it('加重罚停：第二次 own-turn 跳过完成即立即解冻（2 跳后自由）', () => {
    // 模拟第一次跳已经完成的状态：skipNextTurn=true，extraSkipQueued=false
    const state = makeGameState({
      phase: 'drawing',
      currentPlayerIndex: 1,
      players: [
        makePlayer({ id: 'A' as PlayerId }),
        makePlayer({
          id: 'B' as PlayerId,
          skipNextTurn: true,
          extraSkipQueued: false,
          frozenUntilOwnDiscard: true,
        }),
        makePlayer({ id: 'C' as PlayerId }),
      ],
    });
    const result = skipPenalizedPlayers(state);
    // 第二次跳：skipNextTurn=false 彻底 consume
    expect(result.players[1].skipNextTurn).toBe(false);
    expect(result.players[1].extraSkipQueued).toBe(false);
    // 新模型：第 2 跳完成 → frozenUntilOwnDiscard 立即清除（不再等自己 discard）。
    expect(result.players[1].frozenUntilOwnDiscard).toBe(false);
    // 该 skip 应带 clearedPenalty 标记（日志显示「✅ 罰停解除」）。
    const lastSkip = [...result.actionLog].reverse().find((a) => a.type === 'skip' && a.playerId === ('B' as PlayerId));
    expect(lastSkip?.clearedPenalty).toBe(true);
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

describe('option B — 碰牌偷走出牌权时，被略过的罚停座位补计一次跳过', () => {
  // 4 人 A(0) B(1) C(2) D(3)。A 弃 O，D 碰成功 → 指针从 0 跳到 3，
  // 中间座位 1、2 被略过。其中罚停的座位应补计一次跳过。
  function pongState(bMods: Partial<ReturnType<typeof makePlayer>>, cMods: Partial<ReturnType<typeof makePlayer>>) {
    return makeGameState({
      phase: 'claim-window',
      discardedByIndex: 0,
      currentPlayerIndex: 0,
      pendingDiscard: makeCard('O', { id: 100 }),
      claimResponses: [],
      players: [
        makePlayer({ id: 'A' as PlayerId }),
        makePlayer({ id: 'B' as PlayerId, ...bMods }),
        makePlayer({ id: 'C' as PlayerId, ...cMods }),
        // D 默认 Big Five 3.0 → target O = 3：手里 2 张 O + 桌上 1 张 = 3，碰成功。
        makePlayer({ id: 'D' as PlayerId, hand: [makeCard('O', { id: 1 }), makeCard('O', { id: 2 })] }),
      ],
    });
  }

  it('被略过的座位若在第 1 跳（extraSkipQueued）→ 补计一次，仍剩一跳', () => {
    const state = pongState(
      { skipNextTurn: true, extraSkipQueued: true, frozenUntilOwnDiscard: true },
      {}
    );
    const result = pongCard(state, 3, 'O', [1, 2]);
    // 碰成功
    expect(result.actionLog.some((a) => a.type === 'pong-success')).toBe(true);
    // B 被碰牌略过 → 补计一次跳过：extraSkipQueued consume，skipNextTurn 仍 true，未解冻
    expect(result.players[1].extraSkipQueued).toBe(false);
    expect(result.players[1].skipNextTurn).toBe(true);
    expect(result.players[1].frozenUntilOwnDiscard).toBe(true);
    // 该略过应生成一条 B 的 skip 日志
    expect(result.actionLog.some((a) => a.type === 'skip' && a.playerId === ('B' as PlayerId))).toBe(true);
  });

  it('被略过的座位若在最后一跳 → 补计后立即解冻', () => {
    const state = pongState(
      {},
      { skipNextTurn: true, extraSkipQueued: false, frozenUntilOwnDiscard: true }
    );
    const result = pongCard(state, 3, 'O', [1, 2]);
    // C 被略过 → 最后一跳 consume：彻底解冻
    expect(result.players[2].skipNextTurn).toBe(false);
    expect(result.players[2].frozenUntilOwnDiscard).toBe(false);
    const cSkip = result.actionLog.find((a) => a.type === 'skip' && a.playerId === ('C' as PlayerId));
    expect(cSkip?.clearedPenalty).toBe(true);
  });

  it('未罚停的被略过座位不受影响（不生成 skip）', () => {
    const state = pongState({}, {});
    const result = pongCard(state, 3, 'O', [1, 2]);
    expect(result.players[1].skipNextTurn).toBeFalsy();
    expect(result.actionLog.some((a) => a.type === 'skip')).toBe(false);
  });
});
