/**
 * AI smoke — N 局全 AI 自玩 PVP，stress test 核心 spec 不变量。
 *
 * 不需要浏览器 / Supabase。直接调 game-logic + ai-engine。
 *
 * 目标：
 *   1. 无死锁（每局必有 winner 或 isGameOver=true within action 上限）
 *   2. 罚停不变量：skipNextTurn 玩家不会被作为 currentPlayer 进 drawCard
 *   3. claim-window lockout：frozen 玩家不能 pong-success
 *   4. 已归档维度强 trap：碰已归档维度永远 fail，永不 success
 *   5. winner 数据一致性：winner != null 时一定是 hasWon() 或 last-standing
 *
 * 同时输出 failReason 分布、罚停频次、平均轮数等统计，便于检查 trap 是否
 * 真的被 AI 触发过（如果 0 次，说明 AI engine 完全 gate 住了 trap — OK，
 * 但要确认 spec 路径仍能被外部 client 触发，这部分留给手测）。
 */
import { describe, it, expect } from 'vitest';
import {
  initializeGame,
  drawCard,
  discardCard,
  attemptHu,
  pongCard,
  skipPong,
  hasWon,
  getDeclaredDimensions,
} from '../game-logic';
import {
  makeAIDecision,
  makeAIHuDecision,
  makeAIPongDecision,
} from '../ai-engine';
import { generateAIScores } from '../scoring';
import type { GameState, GameAction, Dimension, Player } from '@/types';
import { DIMENSIONS, isPersonalityCard } from '@/types';

const ACTION_HARD_LIMIT = 5000;
const TOTAL_GAMES = 500;

interface SmokeResult {
  gamesPlayed: number;
  totalActions: number;
  totalRoundsSum: number;
  winnerCount: number;
  noWinnerCount: number;
  deckExhaustedEndings: number;
  hasWonEndings: number;
  roundLimitEndings: number;
  pongSuccess: number;
  pongFailWrongCards: number;
  pongFailAlreadyDeclared: number;
  huSuccess: number;
  huFail: number;
  skips: number;
  penaltyMarksObserved: number;  // skipNextTurn=true 出现的局数
  invariantBreaks: string[];
}

// Rogue AI: 随机选一个未必正确的维度 + 一组手牌提交，强制触发 pong-fail
// / 已归档 trap / hu-fail 路径。用于 stress test 罚停 spec，非生产 AI。
function rogueChoosePong(p: Player, pendingDim: Dimension): { dimension: Dimension; handCardIds: number[] } {
  // 30% 概率选「已归档维度」(强 trap)
  const declared = Array.from(getDeclaredDimensions(p));
  if (declared.length > 0 && Math.random() < 0.3) {
    const dim = declared[Math.floor(Math.random() * declared.length)];
    const sameInHand = p.hand.filter(c => isPersonalityCard(c) && c.dimension === dim).map(c => c.id);
    return { dimension: dim, handCardIds: sameInHand.slice(0, Math.min(2, sameInHand.length)) };
  }
  // 60% 概率选 pendingDim + 乱选张数
  if (Math.random() < 0.6) {
    const all = p.hand.filter(c => isPersonalityCard(c)).map(c => c.id);
    return { dimension: pendingDim, handCardIds: all.slice(0, Math.floor(Math.random() * 4)) };
  }
  // 10% 选随机维度
  const dim = DIMENSIONS[Math.floor(Math.random() * DIMENSIONS.length)];
  const all = p.hand.filter(c => isPersonalityCard(c)).map(c => c.id);
  return { dimension: dim, handCardIds: all.slice(0, Math.floor(Math.random() * 4)) };
}

function runOneGame(seed: number, rogueRate = 0.0): { state: GameState; actions: number; breaks: string[] } {
  // 4 人全 AI（用 initializeGame 但把 human seat 也用 AI 决策驱动）
  // BigFive 用 generateAIScores 让每局 setup 略不同
  const humanScores = generateAIScores();
  let state: GameState = initializeGame(humanScores, {
    totalRounds: 10,
    aiDifficulty: 'medium',
  });
  const breaks: string[] = [];

  let actions = 0;
  while (state.phase !== 'game-over' && actions < ACTION_HARD_LIMIT) {
    actions++;

    // ── invariant 1: currentPlayer 不应该是 skipNextTurn=true（除非 phase
    //    刚切换还没来得及 skipPenalizedPlayers，但 game-logic 内部已经
    //    在每个出口调用 — 任何"卡在 skipNextTurn 玩家身上"的状态都是 bug）
    if (state.phase === 'drawing' || state.phase === 'discarding') {
      const cur = state.players[state.currentPlayerIndex];
      if (cur.skipNextTurn) {
        breaks.push(`game#${seed} action#${actions}: skipNextTurn currentPlayer ${cur.id} (phase=${state.phase})`);
      }
    }

    switch (state.phase) {
      case 'drawing': {
        const cur = state.players[state.currentPlayerIndex];
        // Rogue mode: 概率性强行 hu（不管能不能 hu）
        const rogueHu = rogueRate > 0 && Math.random() < rogueRate;
        // AI 决定要不要 hu
        const huDecision = rogueHu
          ? { shouldHu: true, thinkingMs: 0 }
          : makeAIHuDecision(cur, state.settings.aiDifficulty);
        if (huDecision.shouldHu) {
          const before = state.players[state.currentPlayerIndex];
          state = attemptHu(state, state.currentPlayerIndex);
          // 校验：如果 hu fail，玩家应被罚停。
          // 注意：attemptHu 内部 own-turn fail path 已 advance turn + 调
          // skipPenalizedPlayers，可能把当前玩家的 skipNextTurn 已经清掉
          // （如果他被 wrap-around skip）。所以只校验 frozenUntilOwnDiscard
          // —— 它会持久到 own next discard，是稳定不变量。
          const lastHu = [...state.actionLog].reverse().find(
            a => a.playerId === before.id && (a.type === 'hu-fail' || a.type === 'hu-success')
          );
          if (lastHu?.type === 'hu-fail') {
            const after = state.players.find(p => p.id === before.id)!;
            if (!after.frozenUntilOwnDiscard) {
              breaks.push(`game#${seed}: hu-fail player ${before.id} without frozenUntilOwnDiscard`);
            }
          }
          break;
        }
        state = drawCard(state);
        break;
      }
      case 'discarding': {
        const cur = state.players[state.currentPlayerIndex];
        const drawn = state.drawnCard ?? cur.hand[0];
        const decision = makeAIDecision(cur, drawn, state.settings.aiDifficulty, {
          discardPile: state.discardPile,
          actionLog: state.actionLog,
          currentRound: state.currentRound,
          totalRounds: state.settings.totalRounds,
        });
        const handIds = new Set(cur.hand.map(c => c.id));
        const cardId = handIds.has(decision.cardToDiscard.id)
          ? decision.cardToDiscard.id
          : (state.drawnCard?.id ?? cur.hand[0]?.id);
        if (cardId == null) {
          breaks.push(`game#${seed} action#${actions}: discarding with no card`);
          state = { ...state, phase: 'game-over' };
          break;
        }
        state = discardCard(state, cardId);
        break;
      }
      case 'claim-window': {
        // 让每个非 discarder 都 AI 决策 (pong / skip)
        const playerCount = state.players.length;
        const discardedBy = state.discardedByIndex;
        // first-come basis: downstream-first
        let handled = false;
        for (let offset = 1; offset < playerCount; offset++) {
          const idx = (discardedBy + offset) % playerCount;
          if (state.phase !== 'claim-window') break;
          const p = state.players[idx];
          if (state.claimResponses.includes(p.id)) continue;
          if (!state.pendingDiscard) break;

          const canPong = !p.skipNextTurn && !p.frozenUntilOwnDiscard && !p.hasLeft;
          // Rogue mode 概率强行碰（含已归档 trap + wrong count）
          const rogue = rogueRate > 0 && canPong && Math.random() < rogueRate;
          if (rogue && isPersonalityCard(state.pendingDiscard)) {
            const choice = rogueChoosePong(p, state.pendingDiscard.dimension);
            state = pongCard(state, idx, choice.dimension, choice.handCardIds);
            handled = true;
            break;
          }
          if (canPong) {
            const decision = makeAIPongDecision(p, state.pendingDiscard, state.settings.aiDifficulty);
            if (decision.shouldPong && 'dimension' in decision && 'handCardIds' in decision) {
              const before = getDeclaredDimensions(p);
              // ── invariant 2: normal AI 不该自己引发 already-declared trap（ai-engine
              //    line 87-88 已经 gate）— rogue 不算
              if (before.has(decision.dimension)) {
                breaks.push(`game#${seed}: AI tried to pong already-declared dim ${decision.dimension}`);
              }
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
          // 没人响应 — 死锁迹象
          breaks.push(`game#${seed} action#${actions}: claim-window deadlock`);
          state = { ...state, phase: 'game-over' };
        }
        break;
      }
      case 'ai-turn':
      case 'game-over':
        // shouldn't reach 'ai-turn' (it's a single-player UI flag) — coerce to drawing
        if (state.phase === 'ai-turn') {
          state = { ...state, phase: 'drawing' };
        }
        break;
    }

    // ── invariant 3: 没人能在 claim-window 中以 frozenUntilOwnDiscard=true
    //    的状态拿到 pong-success（应在 pongCard 内部被 isFrozen 守卫挡掉）
    const lastLog = state.actionLog[state.actionLog.length - 1];
    if (lastLog?.type === 'pong-success') {
      const ponger = state.players.find(p => p.id === lastLog.playerId);
      // pong-success 之后 ponger 已经把卡归档了，所以无法事后校验 frozen 状态
      // 但 ponger 之前应该不是 frozen（否则就是 bug）。fail-safe check:
      // ranger 此时不应该 hasLeft
      if (ponger?.hasLeft) {
        breaks.push(`game#${seed}: hasLeft player ${ponger.id} got pong-success`);
      }
    }

    // ── invariant 4: 已归档维度强 trap — 任何 pong-success 后不该有同维度第二条
    // 在 declaredSets 里 (`pongCard` 已 gate via `!alreadyDeclared`)
    for (const p of state.players) {
      const dimCounts = new Map<string, number>();
      for (const ds of p.declaredSets) {
        dimCounts.set(ds.dimension, (dimCounts.get(ds.dimension) ?? 0) + 1);
      }
      for (const [dim, count] of dimCounts) {
        if (count > 1) {
          breaks.push(`game#${seed}: player ${p.id} has ${count} declared sets of dim ${dim}`);
        }
      }
    }
  }

  if (actions >= ACTION_HARD_LIMIT) {
    breaks.push(`game#${seed}: hit hard action limit ${ACTION_HARD_LIMIT} without game-over`);
  }

  // ── invariant 5: winner 一致性
  //   合法 game-over winner 路径有 4 种：
  //     a) hasWon(winner) — 5 维全归档
  //     b) last-standing — 其他人都 hasLeft
  //     c) reached totalRounds — 回合上限
  //     d) deck exhausted — drawPile 和 discardPile 都空（drawCard 内的兜底）
  if (state.winner) {
    const winner = state.players.find(p => p.id === state.winner);
    if (!winner) {
      breaks.push(`game#${seed}: winner id ${state.winner} not in players`);
    } else {
      const allActive = state.players.filter(p => !p.hasLeft);
      const isLastStanding = allActive.length === 1 && allActive[0].id === winner.id;
      const won = hasWon(winner);
      const reachedRoundLimit =
        state.currentRound > state.settings.totalRounds && state.settings.totalRounds > 0;
      const deckExhausted = state.drawPile.length === 0 && state.discardPile.length === 0;
      if (!won && !isLastStanding && !reachedRoundLimit && !deckExhausted) {
        breaks.push(
          `game#${seed}: winner ${winner.id} doesn't hasWon (declared=${winner.declaredSets.length}), not last-standing, round=${state.currentRound}/${state.settings.totalRounds}, draw=${state.drawPile.length} discard=${state.discardPile.length}`
        );
      }
    }
  }

  return { state, actions, breaks };
}

function summarize(results: { state: GameState; actions: number; breaks: string[] }[]): SmokeResult {
  const summary: SmokeResult = {
    gamesPlayed: results.length,
    totalActions: 0,
    totalRoundsSum: 0,
    winnerCount: 0,
    noWinnerCount: 0,
    deckExhaustedEndings: 0,
    hasWonEndings: 0,
    roundLimitEndings: 0,
    pongSuccess: 0,
    pongFailWrongCards: 0,
    pongFailAlreadyDeclared: 0,
    huSuccess: 0,
    huFail: 0,
    skips: 0,
    penaltyMarksObserved: 0,
    invariantBreaks: [],
  };
  for (const r of results) {
    summary.totalActions += r.actions;
    summary.totalRoundsSum += r.state.currentRound;
    if (r.state.winner) summary.winnerCount++;
    else summary.noWinnerCount++;
    // 分类 game-over 路径
    const winner = r.state.players.find(p => p.id === r.state.winner);
    if (winner && hasWon(winner)) summary.hasWonEndings++;
    else if (
      r.state.currentRound > r.state.settings.totalRounds &&
      r.state.settings.totalRounds > 0
    ) summary.roundLimitEndings++;
    else if (r.state.drawPile.length === 0 && r.state.discardPile.length === 0) {
      summary.deckExhaustedEndings++;
    }
    // 是否出现过任何罚停标志
    if (r.state.players.some(p => p.frozenUntilOwnDiscard)) summary.penaltyMarksObserved++;
    for (const a of r.state.actionLog as GameAction[]) {
      if (a.type === 'pong-success') summary.pongSuccess++;
      else if (a.type === 'pong-fail') {
        if (a.failReason === 'already-declared') summary.pongFailAlreadyDeclared++;
        else summary.pongFailWrongCards++;
      } else if (a.type === 'hu-success') summary.huSuccess++;
      else if (a.type === 'hu-fail') summary.huFail++;
      else if (a.type === 'skip') summary.skips++;
    }
    summary.invariantBreaks.push(...r.breaks);
  }
  return summary;
}

describe('AI smoke — N 局全 AI 自玩，验证核心 spec', () => {
  it(`完成 ${TOTAL_GAMES} 局无死锁 + 无不变量违反 (rogue 25% 强制 stress 罚停/trap)`, () => {
    const start = Date.now();
    const results: ReturnType<typeof runOneGame>[] = [];
    for (let i = 0; i < TOTAL_GAMES; i++) {
      // 一半正常 AI，一半 rogue 模式（25% 概率乱出，stress test fail 路径）
      const rogueRate = i % 2 === 0 ? 0 : 0.25;
      results.push(runOneGame(i, rogueRate));
    }
    const elapsed = Date.now() - start;
    const s = summarize(results);

    // eslint-disable-next-line no-console
    console.log(
      `\n[AI smoke] ${s.gamesPlayed} 局 / ${elapsed}ms / ${s.totalActions} actions ` +
      `(avg ${(s.totalActions / s.gamesPlayed).toFixed(0)} actions/game, ` +
      `avg round ${(s.totalRoundsSum / s.gamesPlayed).toFixed(1)})\n` +
      `  winner: ${s.winnerCount}/${s.gamesPlayed}  无 winner: ${s.noWinnerCount}\n` +
      `  ending paths: hasWon=${s.hasWonEndings}  roundLimit=${s.roundLimitEndings}  deckExhausted=${s.deckExhaustedEndings}\n` +
      `  pong-success: ${s.pongSuccess}  pong-fail(wrong): ${s.pongFailWrongCards}  pong-fail(already-declared): ${s.pongFailAlreadyDeclared}\n` +
      `  hu-success: ${s.huSuccess}  hu-fail: ${s.huFail}  skip: ${s.skips}\n` +
      `  局中至少一人被罚停 frozen: ${s.penaltyMarksObserved}/${s.gamesPlayed}`
    );

    if (s.invariantBreaks.length > 0) {
      // eslint-disable-next-line no-console
      console.error('[AI smoke] invariant breaks:\n' + s.invariantBreaks.slice(0, 20).join('\n'));
    }
    expect(s.invariantBreaks).toEqual([]);
    // 至少一半局有 winner（防止 AI 全部摆烂）
    expect(s.winnerCount).toBeGreaterThan(s.gamesPlayed / 2);
  }, 30_000);
});
