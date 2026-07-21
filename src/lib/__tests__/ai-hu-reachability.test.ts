/**
 * AI 胡牌可达性 — 验证 2026-07-21 修复：AI 之前永远胡不了牌。
 *
 * 根因（手牌不变量）：站立手牌数恒 = 剩余未归档目标总和 − 1（开局 sum−1、
 * 抽+弃净 0、碰 −N 目标同减 N）。旧流程只在摸牌【前】用纯手牌做 hu 检查
 * （数学上必假），摸牌后直接弃 —— makeAIHuDecision 是事实死代码。
 *
 * 注意：ai-smoke.test.ts 的驱动器复刻的是旧流程（drawing 阶段查胡），所以
 * 它 500 局也测不出这个问题。本文件复刻 useGameStore.executeAITurn 修复后的
 * 流程：摸牌后带 drawnCard 查胡 + 碰成功后 hand-only 查胡。
 *
 * 断言：
 *   1. 单元：makeAIHuDecision 不带 extraCard 时（差一张）为 false，
 *      带上补齐的 drawnCard 为 true —— 且与 attemptHu 的判定一致（查了就能成）。
 *   2. 模拟：N 局全 AI 自玩（medium，能胡必胡），至少出现一次 hu-success，
 *      且正常 AI 的 hu 尝试零失败（决策与引擎同一判定，查了必成）。
 *   3. 所有局在 action 上限内终局（无死锁回归）。
 */
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
import { generateAIScores, getTargetCounts } from '../scoring';
import type { GameState, Player, PersonalityCard } from '@/types';
import { DIMENSIONS } from '@/types';

const ACTION_HARD_LIMIT = 5000;
const TOTAL_GAMES = 200;

// ── 单元：extraCard 语义 ──────────────────────────────────────────────
function makeCard(id: number, dimension: PersonalityCard['dimension']): PersonalityCard {
  return { id, dimension, text: `t${id}` };
}

function makeTestPlayer(hand: PersonalityCard[]): Player {
  return {
    id: 'ai-1',
    name: 'AI',
    nameEn: 'AI',
    avatar: '🤖',
    isHuman: false,
    hand,
    declaredSets: [],
    bigFiveScores: { O: 3, C: 3, E: 3, A: 3, N: 3 },
    skipNextTurn: false,
  } as unknown as Player;
}

describe('makeAIHuDecision extraCard（自摸胡判定）', () => {
  it('差一张时 hand-only 为 false，带上补齐的 drawnCard 为 true', () => {
    const scores = { O: 3, C: 3, E: 3, A: 3, N: 3 };
    const targets = getTargetCounts(scores);
    // 每维凑满 targets[d] 张，唯独 O 少一张（= 站立手牌不变量的真实形态）
    const hand: PersonalityCard[] = [];
    let id = 1;
    for (const d of DIMENSIONS) {
      const need = d === 'O' ? targets[d] - 1 : targets[d];
      for (let i = 0; i < need; i++) hand.push(makeCard(id++, d));
    }
    const player = makeTestPlayer(hand);

    expect(makeAIHuDecision(player, 'medium').shouldHu).toBe(false);
    expect(makeAIHuDecision(player, 'medium', makeCard(999, 'O')).shouldHu).toBe(true);
    // 与引擎判定一致：决策说能胡，attemptHu 就必须成功
    const state = {
      phase: 'discarding',
      players: [player],
      currentPlayerIndex: 0,
      drawnCard: makeCard(999, 'O'),
      pendingDiscard: null,
      discardedByIndex: -1,
      claimResponses: [],
      currentRound: 1,
      settings: { totalRounds: 10, aiDifficulty: 'medium' },
      actionLog: [],
      drawPile: [],
      discardPile: [],
      winner: null,
    } as unknown as GameState;
    const after = attemptHu(state, 0);
    expect(after.phase).toBe('game-over');
    expect(after.winner).toBe(player.id);
  });
});

// ── 模拟：复刻修复后的 executeAITurn 流程 ────────────────────────────
function ctx(state: GameState) {
  return {
    discardPile: state.discardPile,
    actionLog: state.actionLog,
    currentRound: state.currentRound,
    totalRounds: state.settings.totalRounds,
  };
}

function runOneGame(seed: number): { state: GameState; breaks: string[] } {
  let state: GameState = initializeGame(generateAIScores(), {
    totalRounds: 10,
    aiDifficulty: 'medium',
  });
  const breaks: string[] = [];

  let actions = 0;
  while (state.phase !== 'game-over' && actions < ACTION_HARD_LIMIT) {
    actions++;

    switch (state.phase) {
      case 'drawing': {
        state = drawCard(state);
        break;
      }
      case 'ai-turn':
      case 'discarding': {
        const cur = state.players[state.currentPlayerIndex];
        if (state.drawnCard) {
          // 摸牌后：自摸胡检查（把 drawnCard 一起算）—— 修复后的真实胡点
          const hu = makeAIHuDecision(cur, state.settings.aiDifficulty, state.drawnCard);
          if (hu.shouldHu) {
            state = attemptHu(state, state.currentPlayerIndex);
            break;
          }
        } else {
          // 碰成功后（欠一张弃牌）：hand-only 检查唯一可能为真的时刻
          const hu = makeAIHuDecision(cur, state.settings.aiDifficulty);
          if (hu.shouldHu) {
            state = attemptHu(state, state.currentPlayerIndex);
            if (state.phase === 'game-over') break;
            // hu 失败会留在 discarding —— 落到下面弃牌
          }
        }
        if (state.phase !== 'ai-turn' && state.phase !== 'discarding') break;
        const cur2 = state.players[state.currentPlayerIndex];
        const drawn = state.drawnCard ?? cur2.hand[0];
        const decision = makeAIDecision(cur2, drawn, state.settings.aiDifficulty, ctx(state));
        const handIds = new Set(cur2.hand.map((c) => c.id));
        const cardId = handIds.has(decision.cardToDiscard.id)
          ? decision.cardToDiscard.id
          : (state.drawnCard?.id ?? cur2.hand[0]?.id);
        if (cardId == null) {
          breaks.push(`game#${seed} action#${actions}: discarding with no card`);
          state = { ...state, phase: 'game-over' };
          break;
        }
        state = discardCard(state, cardId);
        break;
      }
      case 'claim-window': {
        const playerCount = state.players.length;
        const discardedBy = state.discardedByIndex;
        let handled = false;
        for (let offset = 1; offset < playerCount; offset++) {
          const idx = (discardedBy + offset) % playerCount;
          if (state.phase !== 'claim-window' || !state.pendingDiscard) break;
          const p = state.players[idx];
          if (state.claimResponses.includes(p.id)) continue;
          const canPong = !p.skipNextTurn && !p.frozenUntilOwnDiscard && !p.hasLeft;
          if (canPong) {
            const decision = makeAIPongDecision(p, state.pendingDiscard, state.settings.aiDifficulty);
            if (decision.shouldPong && decision.dimension && decision.handCardIds) {
              state = pongCard(state, idx, decision.dimension, decision.handCardIds);
              handled = true;
              break;
            }
          }
          state = skipPong(state, idx);
          handled = true;
          break;
        }
        if (!handled && state.phase === 'claim-window') {
          breaks.push(`game#${seed} action#${actions}: claim-window deadlock`);
          state = { ...state, phase: 'game-over' };
        }
        break;
      }
      default: {
        breaks.push(`game#${seed} action#${actions}: unexpected phase ${state.phase}`);
        state = { ...state, phase: 'game-over' };
      }
    }
  }

  if (actions >= ACTION_HARD_LIMIT) {
    breaks.push(`game#${seed}: hit action limit without game-over`);
  }
  return { state, breaks };
}

describe(`AI 胡牌可达性（${TOTAL_GAMES} 局全 AI 自玩，修复后流程）`, () => {
  it('AI 能胡牌：至少一次 hu-success，正常决策的 hu 零失败，所有局终局', () => {
    let huSuccess = 0;
    let huFail = 0;
    const allBreaks: string[] = [];

    for (let seed = 0; seed < TOTAL_GAMES; seed++) {
      const { state, breaks } = runOneGame(seed);
      allBreaks.push(...breaks);
      for (const a of state.actionLog) {
        if (a.type === 'hu-success') huSuccess++;
        if (a.type === 'hu-fail') huFail++;
      }
    }

    console.log(`[ai-hu] ${TOTAL_GAMES} 局：hu-success=${huSuccess} hu-fail=${huFail}`);

    expect(allBreaks).toEqual([]);
    // 修复前该数字恒为 0（决策函数只数纯手牌，数学上永假 → 从不尝试）
    expect(huSuccess).toBeGreaterThan(0);
    // 决策与 attemptHu 同一判定：查了就必须成，出现 fail = 两边计数逻辑漂移
    expect(huFail).toBe(0);
  }, 60_000);
});
