import { GameCard, PersonalityCard, DummyCard, HexacoScores, Dimension, DIMENSIONS } from '@/types/hexaco-game';
import { HEXACO_QUESTIONS } from '@/data/hexaco-questions';
import { KNOWLEDGE_CARDS } from '@/data/dummy-cards';
import { shuffle } from '@/lib/utils';
import { getInitialHandSize } from './scoring';

// HEXACO 牌庫（src/lib/card-engine.ts 的六維平行版本，2026-08 平衡決策）：
//   - 4 人：96 人格 + 12 knowledge = 108（每維 16 = 10 真題 + 隨機複製 6）
//   - 2-3 人：72 人格 + 8 knowledge = 80（每維 12 = 10 真題 + 隨機複製 2）
// 推導：手牌 = 六維 sum−1，比五維大 ~1.2 倍 → 每維張數照抄 Big Five（12/16），
// 人格牌自然 ×1.2；knowledge 張數【保持 8/12 不變】——手牌期望 ≈ 手牌數 × (K/總牌庫)，
// 手牌與總牌庫同時 ×1.2、K 不動 → 「每回合手上 knowledge 輪均 ≤ 1」紅線與 Big Five 持平。
// 發牌護欄餘量也持平：4 人偏高分需 4×23=92 ≤ 108−4；Big Five 是 4×19=76 ≤ 92−4，餘量同為 16。
export function deckConfigFor(playerCount: number): { personality: number; dummy: number } {
  return playerCount >= 4 ? { personality: 96, dummy: 12 } : { personality: 72, dummy: 8 };
}

// 生成 `count` 張人格牌，均勻分佈在 6 個維度（count/6 張/維度）。
// 題庫 10 題/維度（共 60，HEXACO-60）。當 count > 60，按維度隨機不重複抽題複製補足
// （每局不同、避免固定複製前幾題），分配新的唯一 id。⚠️ 僅 `dimension` 影響玩法。
// HEXACO 暫無卡圖：不設 imageSrc，卡面走 ◈ 佔位（見 HexacoCard 缺圖回退）。
export function generatePersonalityCards(count: number = 60): PersonalityCard[] {
  const base: PersonalityCard[] = HEXACO_QUESTIONS.map((q) => ({
    id: q.id,
    dimension: q.dimension,
    text: q.text,
    textEn: q.textEn,
  }));
  if (count <= base.length) return base.slice(0, count);

  const perDim = Math.floor(count / DIMENSIONS.length);
  const byDim: Record<Dimension, PersonalityCard[]> = { H: [], E: [], X: [], A: [], C: [], O: [] };
  for (const c of base) byDim[c.dimension].push(c);

  const out: PersonalityCard[] = [];
  let placeholderId = 5000; // 5000+ 複製牌；真實題面 1-60，dummy 1000+
  for (const d of DIMENSIONS) {
    const pool = byDim[d];              // 該維度 10 張真題
    out.push(...pool);                  // 真題全放
    // 需複製 = perDim − 10 張。72 張→每維抽 2、96 張→每維抽 6。imageId 指回原題。
    const copies = perDim - pool.length;
    if (copies > 0) {
      for (const src of shuffle([...pool]).slice(0, Math.min(copies, pool.length))) {
        out.push({ id: placeholderId++, imageId: src.imageId ?? src.id, dimension: d, text: src.text, textEn: src.textEn });
      }
    }
  }
  return out;
}

export function generateDummyCards(count: number = 8): DummyCard[] {
  return Array.from({ length: count }, (_, i) => {
    const k = KNOWLEDGE_CARDS[i % KNOWLEDGE_CARDS.length];
    return { id: 1000 + i, text: k.termZh, textEn: k.term, definition: k.definitionZh, definitionEn: k.definition, isDummy: true as const };
  });
}

export function generateDeck(playerCount: number = 4): GameCard[] {
  const { personality, dummy } = deckConfigFor(playerCount);
  return [...generatePersonalityCards(personality), ...generateDummyCards(dummy)];
}

export function createShuffledDeck(playerCount: number = 4): GameCard[] {
  return shuffle(generateDeck(playerCount));
}

export function dealCardsVariable(
  deck: GameCard[],
  playerScores: HexacoScores[],
  minDrawReserve: number = playerScores.length,
  // 開局每手 dummy 上限（同 Big Five 版：多餘 dummy 進抽牌堆攤到各回合）。
  maxDummyPerHand: number = 1
): { hands: GameCard[][]; remaining: GameCard[] } {
  // 想要的手牌（sum-1）。極端高分下總和可能超過牌庫 → 護欄：從最大的手牌
  // 逐張削減，直到能塞下且至少留 minDrawReserve 張抽牌堆（同 Big Five 版）。
  const sizes = playerScores.map(getInitialHandSize);
  const maxDealable = Math.max(0, deck.length - minDrawReserve);
  let total = sizes.reduce((a, b) => a + b, 0);
  while (total > maxDealable) {
    let maxIdx = 0;
    for (let i = 1; i < sizes.length; i++) if (sizes[i] > sizes[maxIdx]) maxIdx = i;
    if (sizes[maxIdx] <= 1) break; // 兜底：手牌已削到 1，無法再削
    sizes[maxIdx] -= 1;
    total -= 1;
  }

  // deck 已洗過 → 兩個池內部順序仍隨機，不需再洗。
  const personality = deck.filter((c) => !c.isDummy);
  const dummies = deck.filter((c) => c.isDummy);

  // 每手 dummy 配額：默認 min(maxDummyPerHand, handSize)。
  const quota = sizes.map((s) => Math.min(maxDummyPerHand, s, dummies.length));
  // 病態極值人格牌不夠填總手牌 → 缺口由 dummy 補，round-robin 平攤到各手。
  const shortfall = Math.max(0, total - personality.length);
  const target = Math.min(dummies.length, Math.max(quota.reduce((a, b) => a + b, 0), shortfall));
  let placed = quota.reduce((a, b) => a + b, 0);
  while (placed < target) {
    let idx = -1;
    for (let i = 0; i < quota.length; i++) {
      if (quota[i] < sizes[i] && (idx < 0 || quota[i] < quota[idx])) idx = i;
    }
    if (idx < 0) break;
    quota[idx]++;
    placed++;
  }

  let pIdx = 0;
  let dIdx = 0;
  const hands: GameCard[][] = [];
  sizes.forEach((handSize, h) => {
    const hand: GameCard[] = [];
    const dWant = Math.min(quota[h], dummies.length - dIdx);
    for (let i = 0; i < dWant; i++) hand.push(dummies[dIdx++]);
    while (hand.length < handSize) {
      if (pIdx < personality.length) hand.push(personality[pIdx++]);
      else if (dIdx < dummies.length) hand.push(dummies[dIdx++]); // 兜底
      else break;
    }
    hands.push(shuffle(hand)); // 打散手內順序，dummy 不固定排在最前
  });

  // 剩餘人格牌 + 剩餘 dummy 合併重洗 → 抽牌堆。
  const remaining = shuffle([...personality.slice(pIdx), ...dummies.slice(dIdx)]);
  return { hands, remaining };
}
