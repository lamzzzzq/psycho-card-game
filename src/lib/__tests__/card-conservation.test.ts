import { describe, it, expect } from 'vitest';
import {
  initializeGame,
  drawCard,
  discardCard,
  attemptHu,
  pongCard,
  selfPongCard,
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

// ── 故意失败也要守恒 ────────────────────────────────────────────────
// 上面那局 AI 永远不会「胡错」（makeAIHuDecision 只在真能赢时才胡），所以它抓不到
// 失败路径的漏牌。这里每隔几步强行制造一次 胡失败 / 自摸碰失败：
// 旧实现会把 drawnCard 塞回手牌然后直接让位 —— 那张牌永远没弃出去，该玩家从此
// owned = T（而不是 T-1），下回合摸牌前就能合法胡，还能靠故意失败反复刷牌。
// 老板 2026-08-01 实测发现（「撳咗 Win 掣冇出到牌，下次 draw 就多咗一张」）。
function runGameWithRogueFails(seed: number): { breaks: string[]; rogues: number } {
  const breaks: string[] = [];
  let state: GameState = initializeGame(generateAIScores(), { totalRounds: 10, aiDifficulty: 'medium' });

  const checkAll = (tag: string) => {
    for (const p of state.players) {
      const T = getTotalTarget(p.bigFiveScores);
      const o = owned(p);
      if (o < T - 1 || o > T) breaks.push(`${tag}: ${p.id} owned=${o} 越界 [${T - 1},${T}]`);
    }
  };

  let actions = 0;
  let rogues = 0;
  let discardOps = 0;   // 进入过几次出牌阶段 —— 用它来定节奏，比 actions % k 稳
  while (state.phase !== 'game-over' && actions < 4000) {
    actions++;
    checkAll(`a#${actions}/${state.phase}`);

    switch (state.phase) {
      case 'drawing': {
        const cur = state.players[state.currentPlayerIndex];
        const T = getTotalTarget(cur.bigFiveScores);
        // ← 关键断言：回合开始时必须恰好 T-1。旧实现在这里会是 T。
        if (owned(cur) !== T - 1) breaks.push(`turn-start ${cur.id} owned=${owned(cur)} ≠ ${T - 1}`);
        state = drawCard(state);
        break;
      }
      case 'ai-turn':
      case 'discarding': {
        const cur = state.players[state.currentPlayerIndex];
        discardOps++;
        // 定期制造一次故意失败（确定性：只看计数，不用随机数）。按「第几次出牌
        // 机会」计，不按 actions —— 后者会被局长短影响，短局可能一次都触发不到。
        // 胡在 discarding / ai-turn 两种阶段都能提交；自摸碰只在 discarding。
        if (discardOps % (2 + (seed % 4)) === 0) {
          const idx = state.currentPlayerIndex;
          const canSelfPong = state.phase === 'discarding' && cur.hand.length > 0;
          if (rogues % 2 === 1 && canSelfPong) {
            state = selfPongCard(state, idx, 'O', cur.hand.slice(0, 1).map((c) => c.id));
          } else {
            state = attemptHu(state, idx);          // 多半失败；万一真能胡就 game-over
          }
          rogues++;
          break; // 失败后仍停在原阶段 —— 下一圈循环把欠的那张弃掉
        }
        const drawn = state.drawnCard ?? cur.hand[0];
        if (!drawn) { state = { ...state, phase: 'game-over' }; break; }
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
        // 全员过牌 —— 这个 runner 只关心失败路径，碰的部分上面那局已经跑过了
        const n = state.players.length;
        let handled = false;
        for (let off = 1; off < n; off++) {
          const idx = (state.discardedByIndex + off) % n;
          if (state.phase !== 'claim-window') break;
          if (state.claimResponses.includes(state.players[idx].id)) continue;
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
    if (breaks.length > 5) break;
  }
  checkAll('final');
  return { breaks, rogues };
}

describe('持牌守恒: 手牌 + 已归档 = T-1 (等价于 手牌+1 = 待碰张数)', () => {
  it('120 局 AI 对战全程守恒不变量成立', () => {
    const allBreaks: string[] = [];
    for (let i = 0; i < 120; i++) allBreaks.push(...runGame());
    expect(allBreaks.slice(0, 10)).toEqual([]);
  });

  it('胡失败 / 自摸碰失败之后照样守恒（失败也必须弃一张）', () => {
    const allBreaks: string[] = [];
    let totalRogues = 0;
    for (let seed = 0; seed < 12; seed++) {
      const r = runGameWithRogueFails(seed);
      allBreaks.push(...r.breaks);
      totalRogues += r.rogues;
    }
    expect(allBreaks.slice(0, 10)).toEqual([]);
    // 自检：真的制造出失败了才算测到东西（单局可能因为提前胡牌而一次都没触发，
    // 所以看总数不看单局）
    expect(totalRogues).toBeGreaterThan(20);
  });
});
