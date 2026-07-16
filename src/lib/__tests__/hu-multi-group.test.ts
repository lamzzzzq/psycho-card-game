import { describe, it, expect, beforeEach } from 'vitest';
import { attemptHu } from '@/lib/game-logic';
import { makeCard, makeGameState, makePlayer, resetCardIds } from '@/test/fixtures';
import type { PlayerId } from '@/types';

// attemptHu 是单机(useGameStore)与多人(pvp-game-logic)共用的胜负核心，
// 所以这里覆盖到即两端都覆盖到。默认分数全 3 → 每维目标 3 张，起手 15-1=14。
//
// 验证「一口气胡多组」：未归档的维度只要牌池(手牌 + 摸到/截到的那张)够数，
// 胡时会把所有未归档维度一次性归档并获胜——0/2 组归档乃至门清都成立。
describe('hu — 一口气胡多组 / 门清', () => {
  beforeEach(() => resetCardIds());

  // O/C/E/A 四维各 3 张(已凑齐)，供拼手牌用
  const fourDimsComplete = () => [
    makeCard('O', { id: 1 }), makeCard('O', { id: 2 }), makeCard('O', { id: 3 }),
    makeCard('C', { id: 4 }), makeCard('C', { id: 5 }), makeCard('C', { id: 6 }),
    makeCard('E', { id: 7 }), makeCard('E', { id: 8 }), makeCard('E', { id: 9 }),
    makeCard('A', { id: 10 }), makeCard('A', { id: 11 }), makeCard('A', { id: 12 }),
  ];
  const threeOthers = (a: PlayerId, b: PlayerId) => [
    makePlayer({ id: b, isHuman: false }),
    makePlayer({ id: 'C3' as PlayerId, isHuman: false }),
  ];

  it('门清自摸胡：0 组归档，四维齐 + 摸到第 5 维补齐 → 一口气胡 5 组', () => {
    const hand = [...fourDimsComplete(), makeCard('N', { id: 13 }), makeCard('N', { id: 14 })];
    const human = makePlayer({ id: 'H' as PlayerId, hand, declaredSets: [] });
    const state = makeGameState({
      phase: 'discarding',
      currentPlayerIndex: 0,
      drawnCard: makeCard('N', { id: 99 }), // 补齐 N 的第 3 张
      players: [human, ...threeOthers('H' as PlayerId, 'B' as PlayerId)],
    });
    const result = attemptHu(state, 0);
    expect(result.phase).toBe('game-over');
    expect(result.winner).toBe('H');
    expect(result.players[0].declaredSets).toHaveLength(5); // 5 维一次性归档
  });

  it('门清荣胡：0 组归档，别人打出第 5 维那张补齐 → 一口气胡 5 组', () => {
    const hand = [...fourDimsComplete(), makeCard('N', { id: 13 }), makeCard('N', { id: 14 })];
    const human = makePlayer({ id: 'H' as PlayerId, hand, declaredSets: [] });
    const state = makeGameState({
      phase: 'claim-window',
      discardedByIndex: 1, // B 打出，H 截胡
      currentPlayerIndex: 1,
      pendingDiscard: makeCard('N', { id: 99 }),
      players: [human, ...threeOthers('H' as PlayerId, 'B' as PlayerId)],
    });
    const result = attemptHu(state, 0);
    expect(result.phase).toBe('game-over');
    expect(result.winner).toBe('H');
    expect(result.players[0].declaredSets).toHaveLength(5);
    expect(result.pendingDiscard).toBeNull(); // 被截的弃牌并入归档，不进弃牌堆
  });

  it('部分归档(2 组) + 其余手牌齐 + 摸到补齐 → 一口气胡剩下 3 组', () => {
    const hand = [
      makeCard('E', { id: 7 }), makeCard('E', { id: 8 }), makeCard('E', { id: 9 }),
      makeCard('A', { id: 10 }), makeCard('A', { id: 11 }), makeCard('A', { id: 12 }),
      makeCard('N', { id: 13 }), makeCard('N', { id: 14 }),
    ];
    const declaredSets = [
      { dimension: 'O' as const, cards: [makeCard('O', { id: 1 }), makeCard('O', { id: 2 }), makeCard('O', { id: 3 })], round: 1 },
      { dimension: 'C' as const, cards: [makeCard('C', { id: 4 }), makeCard('C', { id: 5 }), makeCard('C', { id: 6 })], round: 1 },
    ];
    const human = makePlayer({ id: 'H' as PlayerId, hand, declaredSets });
    const state = makeGameState({
      phase: 'discarding',
      currentPlayerIndex: 0,
      drawnCard: makeCard('N', { id: 99 }),
      players: [human, ...threeOthers('H' as PlayerId, 'B' as PlayerId)],
    });
    const result = attemptHu(state, 0);
    expect(result.phase).toBe('game-over');
    expect(result.winner).toBe('H');
    expect(result.players[0].declaredSets).toHaveLength(5);
  });

  it('差一张且没摸到/没人打出 → 胡失败(罚停+公开手牌)', () => {
    const hand = [...fourDimsComplete(), makeCard('N', { id: 13 }), makeCard('N', { id: 14 })]; // 只有 2 张 N
    const human = makePlayer({ id: 'H' as PlayerId, hand, declaredSets: [] });
    const state = makeGameState({
      phase: 'discarding',
      currentPlayerIndex: 0,
      drawnCard: null, // 没摸到补齐的牌
      players: [human, ...threeOthers('H' as PlayerId, 'B' as PlayerId)],
    });
    const result = attemptHu(state, 0);
    expect(result.winner).toBeNull();
    expect(result.players[0].skipNextTurn).toBe(true);
    expect(result.players[0].revealedHand).toBe(true);
  });
});
