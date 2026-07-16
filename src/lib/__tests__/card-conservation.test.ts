import { describe, it, expect } from 'vitest';
import {
  initializeGame,
  drawCard,
  discardCard,
  attemptHu,
  pongCard,
  skipPong,
} from '../game-logic';
import { makeAIDecision, makeAIHuDecision, makeAIPongDecision } from '../ai-engine';
import { generateAIScores, getTotalTarget } from '../scoring';
import type { GameState, Player } from '@/types';
import { isPersonalityCard } from '@/types';

// ── 持牌守恒不变量 ───────────────────────────────────────────────
// 用户问：有没有情况「手牌 + 1 ≠ 待碰张数」？
// 理论：起手 = 目标总和 T − 1；draw/discard/碰/自摸/胡 每步净 0；
// drawnCard / pendingDiscard 存在 state 上(不进 player.hand)，只在弃牌/碰牌时
// 原子并入。所以任意时刻每个玩家 owned = hand + 已归档张数 恒 ∈ [T-1, T]，
// 且回合开始(phase='drawing')的当前玩家恰好 = T-1 → 等价于「手牌+1 = 待碰张数」。
// 这里跑多局 AI 对战把它断死；任何 off-by-one(丢牌/多牌)都会被抓到。

function owned(p: Player): number {
  return p.hand.length + p.declaredSets.reduce((s, d) => s + d.cards.length, 0);
}

function runGame(): string[] {
  const breaks: string[] = [];
  let state: GameState = initializeGame(generateAIScores(), { totalRounds: 10, aiDifficulty: 'medium' });

  const checkAll = (tag: string) => {
    for (const p of state.players) {
      const T = getTotalTarget(p.bigFiveScores);
      const o = owned(p);
      // owned 只可能是 T-1(静止) 或 T(刚碰到外部弃牌、尚未弃出的瞬间)
      if (o < T - 1 || o > T) breaks.push(`${tag}: ${p.id} owned=${o} 越界 [${T - 1},${T}]`);
    }
  };

  let actions = 0;
  while (state.phase !== 'game-over' && actions < 4000) {
    actions++;
    checkAll(`a#${actions}/${state.phase}`);

    switch (state.phase) {
      case 'drawing': {
        const cur = state.players[state.currentPlayerIndex];
        // 回合开始的当前玩家必须恰好 T-1（== 待碰张数 - 1）
        const T = getTotalTarget(cur.bigFiveScores);
        if (owned(cur) !== T - 1) breaks.push(`turn-start ${cur.id} owned=${owned(cur)} ≠ ${T - 1}`);

        if (makeAIHuDecision(cur, state.settings.aiDifficulty).shouldHu) {
          state = attemptHu(state, state.currentPlayerIndex);
        } else {
          state = drawCard(state);
        }
        break;
      }
      case 'ai-turn':
      case 'discarding': {
        const cur = state.players[state.currentPlayerIndex];
        const drawn = state.drawnCard ?? cur.hand[0];
        const decision = makeAIDecision(cur, drawn, state.settings.aiDifficulty, {
          discardPile: state.discardPile,
          actionLog: state.actionLog,
          currentRound: state.currentRound,
          totalRounds: state.settings.totalRounds,
        });
        const handIds = new Set(cur.hand.map((c) => c.id));
        const cardId = handIds.has(decision.cardToDiscard.id)
          ? decision.cardToDiscard.id
          : (state.drawnCard?.id ?? cur.hand[0]?.id);
        if (cardId == null) { state = { ...state, phase: 'game-over' }; break; }
        state = discardCard(state, cardId);
        break;
      }
      case 'claim-window': {
        const n = state.players.length;
        const by = state.discardedByIndex;
        let handled = false;
        for (let off = 1; off < n; off++) {
          const idx = (by + off) % n;
          if (state.phase !== 'claim-window' || !state.pendingDiscard) break;
          const p = state.players[idx];
          if (state.claimResponses.includes(p.id)) continue;
          const canPong = !p.skipNextTurn && !p.frozenUntilOwnDiscard && !p.hasLeft;
          if (canPong && isPersonalityCard(state.pendingDiscard)) {
            const d = makeAIPongDecision(p, state.pendingDiscard, state.settings.aiDifficulty);
            if (d.shouldPong && d.dimension && d.handCardIds) {
              state = pongCard(state, idx, d.dimension, d.handCardIds);
              handled = true;
              break;
            }
          }
          state = skipPong(state, idx);
          handled = true;
          break;
        }
        if (!handled && state.phase === 'claim-window') state = { ...state, phase: 'game-over' };
        break;
      }
      default:
        state = { ...state, phase: 'game-over' };
    }
    if (breaks.length > 5) break; // 早停，够说明问题
  }
  checkAll('final');
  return breaks;
}

describe('持牌守恒: 手牌 + 已归档 = T-1 (等价于 手牌+1 = 待碰张数)', () => {
  it('120 局 AI 对战全程守恒不变量成立', () => {
    const allBreaks: string[] = [];
    for (let i = 0; i < 120; i++) allBreaks.push(...runGame());
    expect(allBreaks.slice(0, 10)).toEqual([]);
  });
});
