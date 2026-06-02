import { GameCard, PersonalityCard, DummyCard, BigFiveScores, Dimension, DIMENSIONS } from '@/types';
import { QUESTIONS } from '@/data/questions';
import { DUMMY_CARD_TEXTS } from '@/data/dummy-cards';
import { shuffle } from './utils';
import { getInitialHandSize } from './scoring';

// 牌庫按人數縮放（2026-06 平衡決策，見 docs/DECK_BALANCE.md / 模擬數據）：
//   - 4 人：80 人格 + 12 dummy（大手牌 sum-1 需要更大牌庫防發牌發光）
//   - 2-3 人：60 人格 + 8 dummy
// dummy 數控制在 ~12%，保證「每回合手上 dummy 輪均 ≤ 1」。
export function deckConfigFor(playerCount: number): { personality: number; dummy: number } {
  return playerCount >= 4 ? { personality: 80, dummy: 12 } : { personality: 60, dummy: 8 };
}

// 生成 `count` 張人格牌，均勻分佈在 5 個維度（count/5 張/維度）。
// 真實題庫有 12 題/維度（共 60）。當 count > 60（如 4 人的 80），按維度
// 循環複用該維度的題面補足，分配新的唯一 id。⚠️ 僅 `dimension` 影響玩法，
// text 是佔位文案 —— 真實的 80 張牌面內容準備好後替換本函數即可。
export function generatePersonalityCards(count: number = 60): PersonalityCard[] {
  const base: PersonalityCard[] = QUESTIONS.map((q) => ({
    id: q.id,
    dimension: q.dimension,
    text: q.text,
    facet: q.facet,
  }));
  if (count <= base.length) return base.slice(0, count);

  const perDim = Math.floor(count / 5);
  const byDim: Record<Dimension, PersonalityCard[]> = { O: [], C: [], E: [], A: [], N: [] };
  for (const c of base) byDim[c.dimension].push(c);

  const out: PersonalityCard[] = [];
  let placeholderId = 5000; // 5000+ 佔位牌；真實題面 1-60，dummy 1000+
  for (const d of DIMENSIONS) {
    const pool = byDim[d];
    for (let i = 0; i < perDim; i++) {
      if (i < pool.length) {
        out.push(pool[i]);
      } else {
        const src = pool[i % pool.length];
        out.push({ id: placeholderId++, dimension: d, text: src.text, facet: src.facet });
      }
    }
  }
  return out;
}

export function generateDummyCards(count: number = 8): DummyCard[] {
  return Array.from({ length: count }, (_, i) => ({
    id: 1000 + i,
    text: DUMMY_CARD_TEXTS[i % DUMMY_CARD_TEXTS.length],
    isDummy: true as const,
  }));
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
  playerScores: BigFiveScores[],
  minDrawReserve: number = playerScores.length
): { hands: GameCard[][]; remaining: GameCard[] } {
  // 想要的手牌（sum-1）。極端高分下總和可能超過牌庫 → 會截斷後發玩家、
  // 抽牌堆歸零、第一回合秒死。護欄：若總和 > 牌庫 - 預留，從最大的手牌
  // 逐張削減，直到能塞下且至少留 minDrawReserve 張抽牌堆。
  // 正常/偏高分（總和 ≤ 牌庫-預留）不會觸發，每人照拿 sum-1。
  const sizes = playerScores.map(getInitialHandSize);
  const maxDealable = Math.max(0, deck.length - minDrawReserve);
  let total = sizes.reduce((a, b) => a + b, 0);
  while (total > maxDealable) {
    let maxIdx = 0;
    for (let i = 1; i < sizes.length; i++) if (sizes[i] > sizes[maxIdx]) maxIdx = i;
    if (sizes[maxIdx] <= 1) break; // 兜底：手牌已削到 1，無法再削（牌庫 < 人數纔會到這）
    sizes[maxIdx] -= 1;
    total -= 1;
  }

  const hands: GameCard[][] = [];
  let index = 0;
  for (const handSize of sizes) {
    hands.push(deck.slice(index, index + handSize));
    index += handSize;
  }

  return { hands, remaining: deck.slice(index) };
}

export function dealCards(
  deck: GameCard[],
  playerCount: number,
  cardsPerPlayer: number
): { hands: GameCard[][]; remaining: GameCard[] } {
  const hands: GameCard[][] = [];
  let index = 0;

  for (let p = 0; p < playerCount; p++) {
    hands.push(deck.slice(index, index + cardsPerPlayer));
    index += cardsPerPlayer;
  }

  return { hands, remaining: deck.slice(index) };
}
