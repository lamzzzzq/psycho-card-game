/**
 * 牌库按人数缩放 + 发牌安全回归测试。
 *
 * 平衡决策（2026-06）：
 *   - 4 人：80 人格 + 12 dummy（92 张）
 *   - 2-3 人：60 人格 + 8 dummy（68 张）
 *   - 手牌仍 sum-1（可变）
 *
 * 锁死的不变量：
 *   1. 牌库组成正确、人格牌按维度均衡（每维 count/5 张）
 *   2. 任意分数（含极端 1~5）发牌都不截断 + 抽牌堆发完后仍 > 0
 *   3. 跑满整局不会在轮次上限前「抽+弃」双空（提前摸空死局）
 */
import { describe, it, expect } from 'vitest';
import {
  deckConfigFor, generatePersonalityCards, generateDummyCards, createShuffledDeck, dealCardsVariable,
} from '../card-engine';
import {
  drawCard, discardCard, attemptHu, pongCard, skipPong,
} from '../game-logic';
import { makeAIDecision, makeAIHuDecision, makeAIPongDecision } from '../ai-engine';
import { getInitialHandSize } from '../scoring';
import { DIMENSIONS, isPersonalityCard, isDummyCard } from '@/types';
import type { GameState, Player, PlayerId, BigFiveScores, Dimension } from '@/types';

function band(lo: number, hi: number): BigFiveScores {
  const r = () => Math.round((lo + Math.random() * (hi - lo)) * 10) / 10;
  return { O: r(), C: r(), E: r(), A: r(), N: r() };
}

describe('deck composition', () => {
  it('deckConfigFor scales by player count', () => {
    expect(deckConfigFor(2)).toEqual({ personality: 60, dummy: 8 });
    expect(deckConfigFor(3)).toEqual({ personality: 60, dummy: 8 });
    expect(deckConfigFor(4)).toEqual({ personality: 80, dummy: 12 });
  });

  it('createShuffledDeck sizes: 3人=68, 4人=92', () => {
    expect(createShuffledDeck(3).length).toBe(68);
    expect(createShuffledDeck(4).length).toBe(92);
  });

  it('generatePersonalityCards(80) is balanced 16 per dimension with unique ids', () => {
    const cards = generatePersonalityCards(80);
    expect(cards.length).toBe(80);
    const byDim: Record<Dimension, number> = { O: 0, C: 0, E: 0, A: 0, N: 0 };
    for (const c of cards) byDim[c.dimension]++;
    for (const d of DIMENSIONS) expect(byDim[d]).toBe(16);
    expect(new Set(cards.map((c) => c.id)).size).toBe(80); // 无 id 碰撞
  });

  it('dummy ids never collide with personality ids', () => {
    const pers = generatePersonalityCards(80);
    const dummy = generateDummyCards(12);
    const persIds = new Set(pers.map((c) => c.id));
    for (const d of dummy) expect(persIds.has(d.id)).toBe(false);
  });
});

describe('deal-time safety — 抽牌堆有预留 + 人人有牌 (含极端分数)', () => {
  // 所有分数段（含病态 4.5~5）都必须安全：抽牌堆 ≥ 人数、无人 0 张。
  for (const [players, lo, hi] of [[3, 2, 4], [4, 2, 4], [3, 3, 5], [4, 3, 5], [4, 4.5, 5]] as const) {
    it(`${players}人 分数${lo}~${hi}: 500 次发牌都留有抽牌堆且无人空手`, () => {
      for (let i = 0; i < 500; i++) {
        const scores = Array.from({ length: players }, () => band(lo, hi));
        const deck = createShuffledDeck(players);
        const { hands, remaining } = dealCardsVariable(deck, scores);
        expect(remaining.length).toBeGreaterThanOrEqual(players); // 护栏预留 ≥ 人数
        hands.forEach((h) => expect(h.length).toBeGreaterThan(0)); // 无人 0 张
        // 牌不丢不增
        expect(hands.reduce((a, h) => a + h.length, 0) + remaining.length).toBe(deck.length);
      }
    });
  }

  // 常规分数段（2~4）：远低于牌库容量，护栏不触发，每人照拿完整 sum-1。
  // （3~5 高分段尾部偶尔会被护栏削 1~2 张，属预期，故不在此断言。）
  for (const [players, lo, hi] of [[3, 2, 4], [4, 2, 4]] as const) {
    it(`${players}人 分数${lo}~${hi}: 常规分数下不削减手牌`, () => {
      for (let i = 0; i < 500; i++) {
        const scores = Array.from({ length: players }, () => band(lo, hi));
        const deck = createShuffledDeck(players);
        const { hands } = dealCardsVariable(deck, scores);
        hands.forEach((h, idx) => expect(h.length).toBe(getInitialHandSize(scores[idx])));
      }
    });
  }
});

// ── 轻量整局跑测：确认轮次上限前不会双空摸死 ──────────────────────────────
function runFull(players: number, rounds: number, lo: number, hi: number): GameState {
  const scores = Array.from({ length: players }, () => band(lo, hi));
  const deck = createShuffledDeck(players);
  const { hands, remaining } = dealCardsVariable(deck, scores);
  let state: GameState = {
    phase: 'drawing', settings: { totalRounds: rounds, aiDifficulty: 'medium' },
    players: hands.map((hand, i): Player => ({
      id: `p${i}` as PlayerId, name: `P${i}`, avatar: '🤖', hand,
      isHuman: false, bigFiveScores: scores[i], declaredSets: [], skipNextTurn: false, revealedHand: false,
    })),
    drawPile: remaining, discardPile: [], currentPlayerIndex: 0, currentRound: 1,
    actionLog: [], drawnCard: null, pendingDiscard: null, discardedByIndex: -1, claimResponses: [], winner: null,
  };
  let actions = 0;
  while (state.phase !== 'game-over' && actions < 8000) {
    actions++;
    if (state.phase === 'drawing') {
      const cur = state.players[state.currentPlayerIndex];
      state = makeAIHuDecision(cur, 'medium').shouldHu ? attemptHu(state, state.currentPlayerIndex) : drawCard(state);
    } else if (state.phase === 'discarding' || state.phase === 'ai-turn') {
      const cur = state.players[state.currentPlayerIndex];
      const drawn = state.drawnCard ?? cur.hand[0];
      if (!drawn) { state = { ...state, phase: 'game-over' }; continue; }
      const d = makeAIDecision(cur, drawn, 'medium', { discardPile: state.discardPile, actionLog: state.actionLog, currentRound: state.currentRound, totalRounds: rounds });
      const handIds = new Set(cur.hand.map((c) => c.id));
      const cardId = handIds.has(d.cardToDiscard.id) ? d.cardToDiscard.id : (state.drawnCard?.id ?? cur.hand[0]?.id);
      if (cardId == null) { state = { ...state, phase: 'game-over' }; continue; }
      state = discardCard(state, cardId);
    } else if (state.phase === 'claim-window') {
      const pc = state.players.length; const by = state.discardedByIndex; let handled = false;
      for (let off = 1; off < pc; off++) {
        const idx = (by + off) % pc;
        if (state.phase !== 'claim-window' || !state.pendingDiscard) break;
        const p = state.players[idx];
        if (state.claimResponses.includes(p.id)) continue;
        const canPong = !p.skipNextTurn && !p.frozenUntilOwnDiscard && !p.hasLeft;
        if (canPong && isPersonalityCard(state.pendingDiscard)) {
          const dec = makeAIPongDecision(p, state.pendingDiscard, 'medium');
          if (dec.shouldPong && dec.dimension && dec.handCardIds) { state = pongCard(state, idx, dec.dimension, dec.handCardIds); handled = true; break; }
        }
        state = skipPong(state, idx); handled = true; break;
      }
      if (!handled && state.phase === 'claim-window') state = { ...state, phase: 'game-over' };
    }
  }
  return state;
}

describe('整局不提前摸空 (零死局)', () => {
  for (const [players, rounds] of [[3, 8], [4, 8], [4, 10]] as const) {
    it(`${players}人 ${rounds}轮: 150 局无「轮次没到就双空」`, () => {
      let prematureExhaust = 0;
      for (let i = 0; i < 150; i++) {
        const s = runFull(players, rounds, 2, 4);
        if (s.drawPile.length === 0 && s.discardPile.length === 0 && s.currentRound <= rounds) prematureExhaust++;
      }
      expect(prematureExhaust).toBe(0);
    });
  }
});
