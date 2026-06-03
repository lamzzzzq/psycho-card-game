/**
 * 复现：碰失败后罚停是否最终解除（用户实测「一直在罚，根本没恢复」）。
 * 确定性驱动整局循环，追踪被罚玩家 C 的 frozenUntilOwnDiscard 是否清除 +
 * 是否拿到真正的回合（draw+discard）。
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { pongCard, skipPong, drawCard, discardCard } from '../game-logic';
import { makeCard, makeGameState, makePlayer, resetCardIds } from '@/test/fixtures';
import type { PlayerId, GameState } from '@/types';

beforeEach(() => resetCardIds());

// 推进一步：根据 phase 决定动作。返回新状态 + 是否 C 拿到了真实回合。
function step(state: GameState, log: string[]): GameState {
  const pc = state.players.length;
  if (state.phase === 'claim-window') {
    // 所有「非弃牌者、未响应」玩家 skip（frozen 的已被引擎 autoSkip 进 claimResponses）
    for (let off = 1; off < pc; off++) {
      const idx = (state.discardedByIndex + off) % pc;
      const p = state.players[idx];
      if (state.phase !== 'claim-window') break;
      if (state.claimResponses.includes(p.id)) continue;
      log.push(`claim: ${p.id} skip`);
      state = skipPong(state, idx);
    }
    return state;
  }
  if (state.phase === 'drawing') {
    const idx = state.currentPlayerIndex;
    const before = state.players[idx];
    state = drawCard(state);
    // drawCard 可能因 skipNextTurn 直接 skip 掉，phase/idx 会变
    if (state.phase === 'discarding' || state.phase === 'ai-turn') {
      const cur = state.players[state.currentPlayerIndex];
      log.push(`turn: ${cur.id} draw+discard (was frozen=${!!before.frozenUntilOwnDiscard})`);
      const discardId = cur.hand[0]?.id ?? state.drawnCard?.id;
      if (discardId != null) state = discardCard(state, discardId);
    } else {
      log.push(`turn: ${before.id} auto-skipped (skipNextTurn)`);
    }
    return state;
  }
  return state;
}

describe('REPRO: 碰失败后罚停最终解除', () => {
  it('C 碰失败后，30 步内应拿到真实回合并清除 frozenUntilOwnDiscard', () => {
    // 3 人，A 弃 O。C 选 O+C（够数但混维度）→ 碰失败。
    // 给每人较大手牌 + 充足抽牌堆，模拟真实多轮。
    const mkHand = (ids: number[]) =>
      ids.map((id, i) => makeCard((['O', 'C', 'E', 'A', 'N'] as const)[i % 5], { id }));
    let state = makeGameState({
      phase: 'claim-window',
      discardedByIndex: 0,
      currentPlayerIndex: 0,
      pendingDiscard: makeCard('O', { id: 100 }),
      players: [
        makePlayer({ id: 'A' as PlayerId, hand: mkHand([10, 11, 12, 13, 14]) }),
        makePlayer({ id: 'B' as PlayerId, hand: mkHand([20, 21, 22, 23, 24]) }),
        makePlayer({ id: 'C' as PlayerId, hand: [makeCard('O', { id: 1 }), makeCard('C', { id: 2 }), makeCard('E', { id: 3 }), makeCard('A', { id: 4 }), makeCard('N', { id: 5 }) ] }),
      ],
      drawPile: Array.from({ length: 40 }, (_, i) => makeCard((['O', 'C', 'E', 'A', 'N'] as const)[i % 5], { id: 300 + i })),
      discardPile: [],
    });

    // C 碰失败
    state = pongCard(state, 2, 'O', [1, 2]);
    expect(state.players[2].skipNextTurn).toBe(true);
    expect(state.players[2].frozenUntilOwnDiscard).toBe(true);

    const log: string[] = [];
    let cGotRealTurn = false;
    for (let i = 0; i < 60 && state.phase !== 'game-over'; i++) {
      const cBefore = state.players[2];
      // 检测 C 是否将要进行真实回合
      if (state.phase === 'drawing' && state.currentPlayerIndex === 2 && !cBefore.skipNextTurn) {
        cGotRealTurn = true;
      }
      state = step(state, log);
      if (!state.players[2].frozenUntilOwnDiscard && cGotRealTurn) break;
    }

    // 打印循环日志辅助诊断
    if (state.players[2].frozenUntilOwnDiscard) {
      // eslint-disable-next-line no-console
      console.log('C 仍 frozen！循环日志:\n' + log.join('\n'));
    }

    expect(cGotRealTurn).toBe(true);
    expect(state.players[2].frozenUntilOwnDiscard).toBe(false);
  });
});
