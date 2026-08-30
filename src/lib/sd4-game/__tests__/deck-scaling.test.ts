/**
 * SD4 牌库缩放 + 发牌安全回归（hexaco-game deck-scaling.test.ts 的四维物理隔离副本）。
 *
 * 平衡决策（2026-08）：
 *   - 4 人：64 人格 + 12 knowledge（76 张）
 *   - 2-3 人：48 人格 + 8 knowledge（56 张）
 *   - 手牌 = 四维 sum-1（可变）
 *
 * 推导：每维张数照抄 Big Five（12/16），knowledge 张数不变（8/12）→
 * 手牌与总牌库同时 ×0.8、K 不动 → 手上 knowledge 轮均期望与 Big Five 持平（红线 ≤1）。
 * 锁死的不变量同 Big Five 版，另加「整局 knowledge 轮均」直测（见文件底部）。
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
import { DIMENSIONS, isPersonalityCard, isDummyCard } from '@/types/sd4-game';
import type { GameState, Player, PlayerId, Sd4Scores, Dimension } from '@/types/sd4-game';

function band(lo: number, hi: number): Sd4Scores {
  const r = () => Math.round((lo + Math.random() * (hi - lo)) * 10) / 10;
  return { M: r(), N: r(), P: r(), S: r() };
}

describe('deck composition', () => {
  it('deckConfigFor scales by player count', () => {
    expect(deckConfigFor(2)).toEqual({ personality: 48, dummy: 8 });
    expect(deckConfigFor(3)).toEqual({ personality: 48, dummy: 8 });
    expect(deckConfigFor(4)).toEqual({ personality: 64, dummy: 12 });
  });

  it('createShuffledDeck sizes: 3人=56, 4人=76', () => {
    expect(createShuffledDeck(3).length).toBe(56);
    expect(createShuffledDeck(4).length).toBe(76);
  });

  it('generatePersonalityCards(64) is balanced 16 per dimension with unique ids', () => {
    const cards = generatePersonalityCards(64);
    expect(cards.length).toBe(64);
    const byDim: Record<Dimension, number> = { M: 0, N: 0, P: 0, S: 0 };
    for (const c of cards) byDim[c.dimension]++;
    for (const d of DIMENSIONS) expect(byDim[d]).toBe(16);
    expect(new Set(cards.map((c) => c.id)).size).toBe(64); // 无 id 碰撞
  });

  it('generatePersonalityCards(48) is balanced 12 per dimension', () => {
    const cards = generatePersonalityCards(48);
    expect(cards.length).toBe(48);
    const byDim: Record<Dimension, number> = { M: 0, N: 0, P: 0, S: 0 };
    for (const c of cards) byDim[c.dimension]++;
    for (const d of DIMENSIONS) expect(byDim[d]).toBe(12);
    expect(new Set(cards.map((c) => c.id)).size).toBe(48);
  });

  // SD4 特有：每維僅 7 真題，4 人局每維 16 張靠「整輪循環」複製——
  // 鎖死分佈性質：同一題面（按 imageId 歸併）最多 3 份（1 真 + 2 複製）、
  // 且複製牌的 imageId 恆指回 1–28 的真題（卡圖取圖依賴這一點）。
  it('循环复制分布均匀：同一题面最多 3 份，imageId 恒指回真题 1-28', () => {
    for (let trial = 0; trial < 50; trial++) {
      const cards = generatePersonalityCards(64);
      const byFace = new Map<number, number>();
      for (const c of cards) {
        const face = c.imageId ?? c.id;
        expect(face).toBeGreaterThanOrEqual(1);
        expect(face).toBeLessThanOrEqual(28);
        byFace.set(face, (byFace.get(face) ?? 0) + 1);
      }
      for (const n of byFace.values()) expect(n).toBeLessThanOrEqual(3);
      expect(byFace.size).toBe(28); // 每張真題至少出現 1 次
    }
  });

  it('dummy ids never collide with personality ids', () => {
    const pers = generatePersonalityCards(64);
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

  // 开局每手 dummy ≤ 1（用户实测痛点：随机切牌每手期望 ~1.7 张 dummy，2~3 常见）。
  // 低分段人格牌充足（总手牌 < 人格牌数）→ 严格 ≤1。
  for (const [players, lo, hi] of [[3, 2, 4], [4, 2, 4]] as const) {
    it(`${players}人 分数${lo}~${hi}: 500 次发牌每手 dummy ≤ 1`, () => {
      for (let i = 0; i < 500; i++) {
        const scores = Array.from({ length: players }, () => band(lo, hi));
        const deck = createShuffledDeck(players);
        const { hands } = dealCardsVariable(deck, scores);
        hands.forEach((h) =>
          expect(h.filter((c) => c.isDummy).length).toBeLessThanOrEqual(1)
        );
      }
    });
  }

  // 高分/病态段（3~5、4.5~5）：人格牌可能填不满总手牌，缺口必须由 dummy 补。
  // 平摊护栏保证不会某一手暴增（曾出现单手 5 张）→ 任何分数下都严守红线「每手 ≤2」。
  for (const [players, lo, hi] of [[3, 3, 5], [4, 3, 5], [4, 4.5, 5]] as const) {
    it(`${players}人 分数${lo}~${hi}: 500 次发牌每手 dummy ≤ 2（缺口平摊）`, () => {
      for (let i = 0; i < 500; i++) {
        const scores = Array.from({ length: players }, () => band(lo, hi));
        const deck = createShuffledDeck(players);
        const { hands } = dealCardsVariable(deck, scores);
        hands.forEach((h) =>
          expect(h.filter((c) => c.isDummy).length).toBeLessThanOrEqual(2)
        );
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
function runFull(
  players: number, rounds: number, lo: number, hi: number,
  // 每次轮到某玩家抽牌前采样：他手上现在有几张 knowledge（轮均红线直测用）。
  onTurnStart?: (dummiesInHand: number) => void
): GameState {
  const scores = Array.from({ length: players }, () => band(lo, hi));
  const deck = createShuffledDeck(players);
  const { hands, remaining } = dealCardsVariable(deck, scores);
  let state: GameState = {
    phase: 'drawing', settings: { totalRounds: rounds, aiDifficulty: 'medium' },
    players: hands.map((hand, i): Player => ({
      id: `p${i}` as PlayerId, name: `P${i}`, avatar: '🤖', hand,
      isHuman: false, sd4Scores: scores[i], declaredSets: [], skipNextTurn: false, revealedHand: false,
    })),
    drawPile: remaining, discardPile: [], currentPlayerIndex: 0, currentRound: 1,
    actionLog: [], drawnCard: null, pendingDiscard: null, discardedByIndex: -1, claimResponses: [], winner: null,
  };
  let actions = 0;
  while (state.phase !== 'game-over' && actions < 8000) {
    actions++;
    if (state.phase === 'drawing') {
      const cur = state.players[state.currentPlayerIndex];
      onTurnStart?.(cur.hand.filter((c) => isDummyCard(c)).length);
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

// ── knowledge 轮均红线直测 ────────────────────────────────────────────────
// 设计红线：一个回合内玩家手牌里的 knowledge 期望 ≤ 1。
// Big Five 实测：普通分(2~4)轮均 0.4~0.6、偏高分(3~5) ~1.0 擦边（docs/DECK_BALANCE.md）。
// SD4 的 K 张数不变 + 牌库/手牌同比 ×0.8，期望应与 Big Five 持平。
describe('knowledge 轮均期望 ≤ 1（整局蒙特卡洛）', () => {
  for (const [players, lo, hi, cap] of [
    [3, 2, 4, 1.0], [4, 2, 4, 1.0],   // 普通分：严格 ≤1
    [4, 3, 5, 1.2],                    // 偏高分：与 Big Five 同样 ~1.0 擦边，留 0.2 采样余量
  ] as const) {
    it(`${players}人 分数${lo}~${hi}: 80 局轮均 knowledge < ${cap}`, () => {
      let total = 0, turns = 0;
      for (let i = 0; i < 80; i++) {
        runFull(players, 8, lo, hi, (n) => { total += n; turns++; });
      }
      expect(turns).toBeGreaterThan(0);
      expect(total / turns).toBeLessThan(cap);
    });
  }
});
