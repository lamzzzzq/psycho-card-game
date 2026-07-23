/**
 * AI 批量对局统计 —— 老板要的「AI 胡率 + 出 bug 可能性」。
 *
 * 全 AI 自玩，复刻 useGameStore.executeAITurn 修复后的流程（与 ai-hu-reachability 同一套），
 * 矩阵：人数 {2,3,4} × 难度 {easy,medium,hard}，每格 GAMES_PER_CELL 局。
 *
 * 报告每格：胡率（有人真胡终局的局数占比）、hu成功/失败数、平均动作数、平均终局轮次、bug 数。
 * bug = 死锁 / 无牌可弃 / 意外 phase / 超步数 / 牌数不守恒。
 * 断言：任何 bug 即失败；hu-fail 必须 0（决策与 attemptHu 同判定）。胡率只观测不断言。
 * 跑法：npx vitest run src/lib/__tests__/ai-batch-stats.test.ts
 */
import { describe, it, expect } from 'vitest';
import { drawCard, discardCard, attemptHu, pongCard, skipPong } from '../game-logic';
import { createShuffledDeck, dealCardsVariable } from '../card-engine';
import { makeAIDecision, makeAIHuDecision, makeAIPongDecision } from '../ai-engine';
import { generateAIScores } from '../scoring';
import type { GameState, Player, AIDifficulty, GameCard } from '@/types';

const GAMES_PER_CELL = 500;
const TOTAL_ROUNDS = 10;
const ACTION_HARD_LIMIT = 5000;
const PLAYER_COUNTS = [2, 3, 4] as const;
const DIFFICULTIES: AIDifficulty[] = ['easy', 'medium', 'hard'];

// 按 N 人拼初始 GameState（全 AI；不用 initializeGame 因为它写死 4 人）
function initGameN(playerCount: number, difficulty: AIDifficulty): GameState {
  const scores = Array.from({ length: playerCount }, () => generateAIScores());
  const deck = createShuffledDeck(playerCount);
  const { hands, remaining } = dealCardsVariable(deck, scores);
  const players = scores.map((s, i) => ({
    id: `p${i}`,
    name: `P${i}`,
    nameEn: `P${i}`,
    avatar: '🤖',
    isHuman: false,
    hand: hands[i],
    declaredSets: [],
    bigFiveScores: s,
    skipNextTurn: false,
  })) as unknown as Player[];
  return {
    phase: 'drawing',
    settings: { totalRounds: TOTAL_ROUNDS, aiDifficulty: difficulty },
    players,
    drawPile: remaining,
    discardPile: [],
    currentPlayerIndex: 0,
    currentRound: 1,
    actionLog: [],
    drawnCard: null,
    pendingDiscard: null,
    discardedByIndex: -1,
    claimResponses: [],
    winner: null,
  } as unknown as GameState;
}

function ctx(state: GameState) {
  return {
    discardPile: state.discardPile,
    actionLog: state.actionLog,
    currentRound: state.currentRound,
    totalRounds: state.settings.totalRounds,
  };
}

// 牌数守恒：手牌 + 归档 + 弃牌堆 + 摸牌堆 + drawnCard + pendingDiscard 恒定
function countCards(state: GameState): number {
  let n = state.drawPile.length + state.discardPile.length;
  if (state.drawnCard) n++;
  if (state.pendingDiscard) n++;
  for (const p of state.players) {
    n += p.hand.length;
    for (const set of p.declaredSets) n += set.cards.length;
  }
  return n;
}

interface GameResult {
  huSuccess: number;
  huFail: number;
  endedByHu: boolean;
  actions: number;
  endRound: number;
  breaks: string[];
}

function runOneGame(playerCount: number, difficulty: AIDifficulty, seed: number): GameResult {
  let state = initGameN(playerCount, difficulty);
  const total0 = countCards(state);
  const breaks: string[] = [];
  let actions = 0;

  const conserve = (where: string) => {
    const now = countCards(state);
    if (now !== total0) breaks.push(`p${playerCount}/${difficulty} game#${seed} ${where}: cards ${now} != ${total0}`);
  };

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
          const hu = makeAIHuDecision(cur, difficulty, state.drawnCard);
          if (hu.shouldHu) {
            state = attemptHu(state, state.currentPlayerIndex);
            break;
          }
        } else {
          const hu = makeAIHuDecision(cur, difficulty);
          if (hu.shouldHu) {
            state = attemptHu(state, state.currentPlayerIndex);
            if (state.phase === 'game-over') break;
          }
        }
        if (state.phase !== 'ai-turn' && state.phase !== 'discarding') break;
        const cur2 = state.players[state.currentPlayerIndex];
        const drawn: GameCard = state.drawnCard ?? cur2.hand[0];
        const decision = makeAIDecision(cur2, drawn, difficulty, ctx(state));
        const handIds = new Set(cur2.hand.map((c) => c.id));
        const cardId = handIds.has(decision.cardToDiscard.id)
          ? decision.cardToDiscard.id
          : (state.drawnCard?.id ?? cur2.hand[0]?.id);
        if (cardId == null) {
          breaks.push(`p${playerCount}/${difficulty} game#${seed} action#${actions}: discarding with no card`);
          state = { ...state, phase: 'game-over' };
          break;
        }
        state = discardCard(state, cardId);
        conserve(`after discard #${actions}`);
        break;
      }
      case 'claim-window': {
        const discardedBy = state.discardedByIndex;
        let handled = false;
        for (let offset = 1; offset < playerCount; offset++) {
          const idx = (discardedBy + offset) % playerCount;
          if (state.phase !== 'claim-window' || !state.pendingDiscard) break;
          const p = state.players[idx];
          if (state.claimResponses.includes(p.id)) continue;
          const canPong = !p.skipNextTurn && !p.frozenUntilOwnDiscard && !p.hasLeft;
          if (canPong) {
            const decision = makeAIPongDecision(p, state.pendingDiscard, difficulty);
            if (decision.shouldPong && decision.dimension && decision.handCardIds) {
              state = pongCard(state, idx, decision.dimension, decision.handCardIds);
              conserve(`after pong #${actions}`);
              handled = true;
              break;
            }
          }
          state = skipPong(state, idx);
          handled = true;
          break;
        }
        if (!handled && state.phase === 'claim-window') {
          breaks.push(`p${playerCount}/${difficulty} game#${seed} action#${actions}: claim-window deadlock`);
          state = { ...state, phase: 'game-over' };
        }
        break;
      }
      default: {
        breaks.push(`p${playerCount}/${difficulty} game#${seed} action#${actions}: unexpected phase ${state.phase}`);
        state = { ...state, phase: 'game-over' };
      }
    }
  }

  if (actions >= ACTION_HARD_LIMIT) {
    breaks.push(`p${playerCount}/${difficulty} game#${seed}: hit action limit (deadlock?)`);
  }

  let huSuccess = 0;
  let huFail = 0;
  for (const a of state.actionLog) {
    if (a.type === 'hu-success') huSuccess++;
    if (a.type === 'hu-fail') huFail++;
  }
  return { huSuccess, huFail, endedByHu: huSuccess > 0, actions, endRound: state.currentRound, breaks };
}

describe('AI 批量对局统计（胡率 + bug）', () => {
  it(`矩阵 人数{2,3,4}×难度{easy,medium,hard}，各 ${GAMES_PER_CELL} 局`, () => {
    const allBreaks: string[] = [];
    let huFailGrand = 0;
    const rows: string[] = [];
    rows.push('人数  难度      局数   胡率     hu成功  hu失败  平均动作  平均终局轮  bug');
    rows.push('----  --------  -----  -------  ------  ------  --------  ----------  ---');

    for (const pc of PLAYER_COUNTS) {
      for (const diff of DIFFICULTIES) {
        let endedByHu = 0, huSuccess = 0, huFail = 0, sumActions = 0, sumEndRound = 0;
        const cellBreaks: string[] = [];
        for (let seed = 0; seed < GAMES_PER_CELL; seed++) {
          const r = runOneGame(pc, diff, seed);
          if (r.endedByHu) endedByHu++;
          huSuccess += r.huSuccess;
          huFail += r.huFail;
          sumActions += r.actions;
          sumEndRound += r.endRound;
          cellBreaks.push(...r.breaks);
        }
        allBreaks.push(...cellBreaks);
        huFailGrand += huFail;
        const huRate = ((endedByHu / GAMES_PER_CELL) * 100).toFixed(1) + '%';
        rows.push(
          `${String(pc).padEnd(4)}  ${diff.padEnd(8)}  ${String(GAMES_PER_CELL).padEnd(5)}  ${huRate.padEnd(7)}  ${String(huSuccess).padEnd(6)}  ${String(huFail).padEnd(6)}  ${(sumActions / GAMES_PER_CELL).toFixed(1).padEnd(8)}  ${(sumEndRound / GAMES_PER_CELL).toFixed(1).padEnd(10)}  ${cellBreaks.length}`
        );
      }
    }

    console.log('\n' + rows.join('\n') + '\n');
    if (allBreaks.length) console.log('BUG 样本（前 20）：\n' + allBreaks.slice(0, 20).join('\n'));

    expect(allBreaks).toEqual([]);
    expect(huFailGrand).toBe(0);
  }, 180_000);
});
