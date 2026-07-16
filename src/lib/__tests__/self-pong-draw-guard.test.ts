import { describe, it, expect, beforeEach } from 'vitest';
import { selfPongCard, discardCard } from '../game-logic';
import { makeCard, makeGameState, makePlayer, resetCardIds } from '../../test/fixtures';
import type { PlayerId, GameState, Player } from '@/types';
import { getTotalTarget } from '../scoring';

// bug: 自摸碰在 'drawing' 阶段(还没抽牌)也能触发 → 玩家跳过抽牌却仍强制弃牌 →
// 每次净掉一张(T-1 → T-2)。修复:自摸碰必须在 'discarding' 阶段(已抽牌/已碰牌)。
// 默认分数全 3 → 每维目标 3,起手 T-1=14。
function owned(p: Player): number {
  return p.hand.length + p.declaredSets.reduce((s, d) => s + d.cards.length, 0);
}
// 14 张手牌,含 3 张 N(id 1/2/3)
const hand14 = () => [
  makeCard('N', { id: 1 }), makeCard('N', { id: 2 }), makeCard('N', { id: 3 }),
  makeCard('O', { id: 4 }), makeCard('O', { id: 5 }), makeCard('O', { id: 6 }),
  makeCard('C', { id: 7 }), makeCard('C', { id: 8 }), makeCard('C', { id: 9 }),
  makeCard('E', { id: 10 }), makeCard('E', { id: 11 }), makeCard('E', { id: 12 }),
  makeCard('A', { id: 13 }), makeCard('A', { id: 14 }),
];
const others = () => [makePlayer({ id: 'B' as PlayerId }), makePlayer({ id: 'C' as PlayerId })];

describe('自摸碰必须先抽牌 (drawing 阶段拒绝)', () => {
  beforeEach(() => resetCardIds());

  it("'drawing' 阶段自摸碰被拒绝(不改状态)——否则会漏抽一次牌导致掉牌", () => {
    const human = makePlayer({ id: 'H' as PlayerId, hand: hand14() });
    const state = makeGameState({ phase: 'drawing', currentPlayerIndex: 0, drawnCard: null, players: [human, ...others()] });
    const result = selfPongCard(state, 0, 'N', [1, 2, 3]);
    expect(result).toBe(state); // 原样返回 = 拒绝
  });

  it("'discarding' 阶段(已抽牌)自摸碰成功,且抽牌→自摸→弃牌守恒(T-1)", () => {
    const human = makePlayer({ id: 'H' as PlayerId, hand: hand14() });
    const T = getTotalTarget(human.bigFiveScores);
    const state = makeGameState({
      phase: 'discarding',
      currentPlayerIndex: 0,
      drawnCard: makeCard('A', { id: 99 }), // 本回合摸到的牌(非 N)
      players: [human, ...others()],
    });
    const afterPong: GameState = selfPongCard(state, 0, 'N', [1, 2, 3]);
    expect(afterPong.players[0].declaredSets).toHaveLength(1);
    expect(afterPong.players[0].declaredSets[0].dimension).toBe('N');
    expect(afterPong.phase).toBe('discarding'); // 归档后仍需弃 1 张
    // 弃掉摸到的 A → 全程守恒:抽(+1)自摸(0)弃(-1)=净0,owned 仍 T-1
    const afterDiscard = discardCard(afterPong, 99);
    expect(owned(afterDiscard.players[0])).toBe(T - 1);
  });
});
