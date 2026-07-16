import { describe, it, expect } from 'vitest';
import { initializePvpGame, applyPvpAction } from '../pvp-game-logic';
import { serializeGameState } from '../pvp-serializer';
import { makeAIDecision, makeAIHuDecision, makeAIPongDecision } from '../ai-engine';
import { generateAIScores, getTotalTarget } from '../scoring';
import type { GameState, Player } from '@/types';
import { isPersonalityCard } from '@/types';

// 用户报告 PVP 1v1 里「手牌 + 1 ≠ 待碰张数」。PVP 走 applyPvpAction + 序列化视图，
// 是单机没有的路径。这里驱动真实 PVP 管线跑多局 1v1，断言：
//   (a) raw 状态守恒 owned = hand + 已归档 ∈ [T-1, T]，回合开始恰好 T-1；
//   (b) 序列化视图里 viewer 自己的手牌数 == raw 手牌数（显示不丢牌）。

function owned(p: Player): number {
  return p.hand.length + p.declaredSets.reduce((s, d) => s + d.cards.length, 0);
}

function runPvp1v1(): string[] {
  const breaks: string[] = [];
  const roster = [
    { player_id: 'P0', student_id: 'S0', avatar: '🧪' },
    { player_id: 'P1', student_id: 'S1', avatar: '🧫' },
  ];
  const scoreMap = { P0: generateAIScores(), P1: generateAIScores() } as Record<string, ReturnType<typeof generateAIScores>>;
  let state: GameState = initializePvpGame(roster as any, scoreMap, { totalRounds: 10, difficulty: 'hidden' } as any);

  const check = (tag: string) => {
    for (const p of state.players) {
      const T = getTotalTarget(p.bigFiveScores);
      const o = owned(p);
      if (o < T - 1 || o > T) breaks.push(`${tag}: ${p.id} raw owned=${o} 越界 [${T - 1},${T}]`);
      // 序列化视图对账：viewer 看到的自己手牌数必须 == raw
      const ser = serializeGameState(state as any, p.id);
      const sp = ser.players.find((x) => x.id === p.id)!;
      const serCount = sp.hand ? sp.hand.length : sp.handCount;
      if (serCount !== p.hand.length) breaks.push(`${tag}: ${p.id} 序列化手牌=${serCount} ≠ raw=${p.hand.length}`);
    }
  };

  let actions = 0;
  while (state.phase !== 'game-over' && actions < 4000) {
    actions++;
    check(`a#${actions}/${state.phase}`);
    const cur = state.players[state.currentPlayerIndex];

    if (state.phase === 'drawing') {
      const T = getTotalTarget(cur.bigFiveScores);
      if (owned(cur) !== T - 1) breaks.push(`turn-start ${cur.id} owned=${owned(cur)} ≠ ${T - 1}`);
      state = makeAIHuDecision(cur, 'medium').shouldHu
        ? applyPvpAction(state, cur.id, { type: 'hu' } as any)
        : applyPvpAction(state, cur.id, { type: 'draw' } as any);
    } else if (state.phase === 'discarding') {
      const drawn = state.drawnCard ?? cur.hand[0];
      const dec = makeAIDecision(cur, drawn, 'medium', {
        discardPile: state.discardPile,
        actionLog: state.actionLog,
        currentRound: state.currentRound,
        totalRounds: state.settings.totalRounds,
      });
      const handIds = new Set(cur.hand.map((c) => c.id));
      const cardId = handIds.has(dec.cardToDiscard.id) ? dec.cardToDiscard.id : (state.drawnCard?.id ?? cur.hand[0]?.id);
      if (cardId == null) { state = { ...state, phase: 'game-over' }; break; }
      state = applyPvpAction(state, cur.id, { type: 'discard', cardId } as any);
    } else if (state.phase === 'claim-window') {
      const by = state.discardedByIndex;
      const other = state.players[(by + 1) % state.players.length];
      let acted = false;
      if (state.pendingDiscard && !other.skipNextTurn && !other.frozenUntilOwnDiscard && isPersonalityCard(state.pendingDiscard)) {
        const d = makeAIPongDecision(other, state.pendingDiscard, 'medium');
        if (d.shouldPong && d.dimension && d.handCardIds) {
          state = applyPvpAction(state, other.id, { type: 'pong', dimension: d.dimension, handCardIds: d.handCardIds } as any);
          acted = true;
        }
      }
      if (!acted) state = applyPvpAction(state, other.id, { type: 'skip-pong' } as any);
    } else {
      state = { ...state, phase: 'game-over' };
      break;
    }
    if (breaks.length > 6) break;
  }
  check('final');
  return breaks;
}

describe('PVP 1v1 持牌守恒 + 序列化对账', () => {
  it('150 局 1v1 全程 raw 守恒 & 序列化手牌数不丢', () => {
    const all: string[] = [];
    for (let i = 0; i < 150; i++) all.push(...runPvp1v1());
    expect(all.slice(0, 12)).toEqual([]);
  });
});
