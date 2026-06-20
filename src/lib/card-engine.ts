import { GameCard, PersonalityCard, DummyCard, BigFiveScores, Dimension, DIMENSIONS } from '@/types';
import { QUESTIONS } from '@/data/questions';
import { KNOWLEDGE_CARDS } from '@/data/dummy-cards';
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
// 真實題庫有 10 題/維度（共 50，IPIP-50）。當 count > 50（如 4 人的 80），按維度
// 循環複用該維度的題面補足，分配新的唯一 id。⚠️ 僅 `dimension` 影響玩法，
// text 是佔位文案 —— 真實的 80 張牌面內容準備好後替換本函數即可。
export function generatePersonalityCards(count: number = 50): PersonalityCard[] {
  const base: PersonalityCard[] = QUESTIONS.map((q) => ({
    id: q.id,
    dimension: q.dimension,
    text: q.text,
    textEn: q.textEn,
    facet: q.facet,
  }));
  if (count <= base.length) return base.slice(0, count);

  const perDim = Math.floor(count / 5);
  const byDim: Record<Dimension, PersonalityCard[]> = { O: [], C: [], E: [], A: [], N: [] };
  for (const c of base) byDim[c.dimension].push(c);

  const out: PersonalityCard[] = [];
  let placeholderId = 5000; // 5000+ 佔位牌；真實題面 1-50，dummy 1000+
  for (const d of DIMENSIONS) {
    const pool = byDim[d];
    for (let i = 0; i < perDim; i++) {
      if (i < pool.length) {
        out.push(pool[i]);
      } else {
        const src = pool[i % pool.length];
        out.push({ id: placeholderId++, dimension: d, text: src.text, textEn: src.textEn, facet: src.facet });
      }
    }
  }
  return out;
}

export function generateDummyCards(count: number = 8): DummyCard[] {
  return Array.from({ length: count }, (_, i) => {
    const k = KNOWLEDGE_CARDS[i % KNOWLEDGE_CARDS.length];
    return { id: 1000 + i, text: k.term, definition: k.definition, isDummy: true as const };
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
  playerScores: BigFiveScores[],
  minDrawReserve: number = playerScores.length,
  // 開局每手 dummy 上限。隨機切牌時每手期望 ~1.7 張 dummy（2~3 張常見），
  // 開局體驗差。發牌改為「每手最多 maxDummyPerHand 張」，多餘 dummy 進抽牌堆，
  // 靠之後摸牌零散出現（攤到各回合，稀態仍 ≤1）。見 docs/DECK_BALANCE.md。
  maxDummyPerHand: number = 1
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

  // deck 已洗過 → 兩個池內部順序仍隨機，不需再洗。
  const personality = deck.filter((c) => !c.isDummy);
  const dummies = deck.filter((c) => c.isDummy);

  // 每手 dummy 配額：默認 min(maxDummyPerHand, handSize)。正常/偏高分到此為止，
  // 每手 ≤1 張 dummy。
  const quota = sizes.map((s) => Math.min(maxDummyPerHand, s, dummies.length));
  // 病態極值（如 4 人全測 ~5）人格牌(80)不夠填總手牌 → 缺口必須由 dummy 補。
  // 把這些「被迫的」dummy 用 round-robin 平攤到各手，避免全堆在最後幾手（曾出現
  // 單手 5 張）。攤勻後最壞 = ⌈缺口/人數⌉，不會某一手暴增。
  const shortfall = Math.max(0, total - personality.length);
  const target = Math.min(dummies.length, Math.max(quota.reduce((a, b) => a + b, 0), shortfall));
  let placed = quota.reduce((a, b) => a + b, 0);
  while (placed < target) {
    // 給「還有空位且當前 dummy 最少」的手 +1，保證平攤。
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

  // 剩餘人格牌 + 剩餘 dummy 合併重洗 → 抽牌堆（多出來的 dummy 都在這裏）。
  const remaining = shuffle([...personality.slice(pIdx), ...dummies.slice(dIdx)]);
  return { hands, remaining };
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
