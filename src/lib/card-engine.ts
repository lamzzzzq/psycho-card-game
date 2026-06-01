import { GameCard, PersonalityCard, DummyCard, BigFiveScores, Dimension, DIMENSIONS } from '@/types';
import { QUESTIONS } from '@/data/questions';
import { DUMMY_CARD_TEXTS } from '@/data/dummy-cards';
import { shuffle } from './utils';
import { getInitialHandSize } from './scoring';

// 牌库按人数缩放（2026-06 平衡决策，见 docs/DECK_BALANCE.md / 模拟数据）：
//   - 4 人：80 人格 + 12 dummy（大手牌 sum-1 需要更大牌库防发牌发光）
//   - 2-3 人：60 人格 + 8 dummy
// dummy 数控制在 ~12%，保证「每回合手上 dummy 轮均 ≤ 1」。
export function deckConfigFor(playerCount: number): { personality: number; dummy: number } {
  return playerCount >= 4 ? { personality: 80, dummy: 12 } : { personality: 60, dummy: 8 };
}

// 生成 `count` 张人格牌，均匀分布在 5 个维度（count/5 张/维度）。
// 真实题库有 12 题/维度（共 60）。当 count > 60（如 4 人的 80），按维度
// 循环复用该维度的题面补足，分配新的唯一 id。⚠️ 仅 `dimension` 影响玩法，
// text 是占位文案 —— 真实的 80 张牌面内容准备好后替换本函数即可。
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
  let placeholderId = 5000; // 5000+ 占位牌；真实题面 1-60，dummy 1000+
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
  // 想要的手牌（sum-1）。极端高分下总和可能超过牌库 → 会截断后发玩家、
  // 抽牌堆归零、第一回合秒死。护栏：若总和 > 牌库 - 预留，从最大的手牌
  // 逐张削减，直到能塞下且至少留 minDrawReserve 张抽牌堆。
  // 正常/偏高分（总和 ≤ 牌库-预留）不会触发，每人照拿 sum-1。
  const sizes = playerScores.map(getInitialHandSize);
  const maxDealable = Math.max(0, deck.length - minDrawReserve);
  let total = sizes.reduce((a, b) => a + b, 0);
  while (total > maxDealable) {
    let maxIdx = 0;
    for (let i = 1; i < sizes.length; i++) if (sizes[i] > sizes[maxIdx]) maxIdx = i;
    if (sizes[maxIdx] <= 1) break; // 兜底：手牌已削到 1，无法再削（牌库 < 人数才会到这）
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
