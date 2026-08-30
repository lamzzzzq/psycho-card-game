import { GameCard, PersonalityCard, DummyCard, Sd4Scores, Dimension, DIMENSIONS } from '@/types/sd4-game';
import { SD4_QUESTIONS } from '@/data/sd4-questions';
import { KNOWLEDGE_CARDS } from '@/data/dummy-cards';
import { shuffle } from '@/lib/utils';
import { getInitialHandSize } from './scoring';

// SD4 牌庫（src/lib/hexaco-game/card-engine.ts 的四維平行版本，2026-08 平衡決策）：
//   - 4 人：64 人格 + 12 knowledge = 76（每維 16 = 7 真題 + 循環複製 9）
//   - 2-3 人：48 人格 + 8 knowledge = 56（每維 12 = 7 真題 + 隨機複製 5）
// 推導（與 HEXACO 同一條公式，方向反過來是縮小）：手牌 = 四維 sum−1，比五維小 ~0.8 倍
// → 每維張數照抄 Big Five（12/16），人格牌自然 ×0.8；knowledge 張數【保持 8/12 不變】——
// 手牌期望 ≈ 手牌數 × (K/總牌庫)，手牌與總牌庫同時 ×0.8、K 不動 →
// 「每回合手上 knowledge 輪均 ≤ 1」紅線與 Big Five 持平。
// 發牌護欄餘量也持平：4 人偏高分需 4×15=60 ≤ 76−4；Big Five 是 4×19=76 ≤ 92−4，餘量同為 16。
// 維度可得性同樣持平：4 人全員某維 target=4 需 16 = 每維恰好 16（大五/HEXACO 同為卡滿）。
export function deckConfigFor(playerCount: number): { personality: number; dummy: number } {
  return playerCount >= 4 ? { personality: 64, dummy: 12 } : { personality: 48, dummy: 8 };
}

// 生成 `count` 張人格牌，均勻分佈在 4 個維度（count/4 張/維度）。
// 題庫 7 題/維度（共 28，SD4）。當 count > 28，按維度隨機不重複抽題複製補足；
// ⚠️ 與 HEXACO 版的差異：SD4 每維只有 7 張真題，4 人局每維需複製 9 張（> 7），
// 因此複製改為「整輪循環」——每輪把 7 題洗勻抽完才進下一輪，保證同一題最多
// 比其他題多 1 份（16 張 = 每題 2 份 + 隨機 2 題各多 1 份），分佈盡量均勻。
// 複製牌分配新的唯一 id、imageId 指回原題。⚠️ 僅 `dimension` 影響玩法。
export function generatePersonalityCards(count: number = 48): PersonalityCard[] {
  const base: PersonalityCard[] = SD4_QUESTIONS.map((q) => ({
    id: q.id,
    dimension: q.dimension,
    text: q.text,
    textEn: q.textEn,
  }));
  if (count <= base.length) return base.slice(0, count);

  const perDim = Math.floor(count / DIMENSIONS.length);
  const byDim: Record<Dimension, PersonalityCard[]> = { M: [], N: [], P: [], S: [] };
  for (const c of base) byDim[c.dimension].push(c);

  const out: PersonalityCard[] = [];
  let placeholderId = 5000; // 5000+ 複製牌；真實題面 1-28，dummy 1000+
  for (const d of DIMENSIONS) {
    const pool = byDim[d];              // 該維度 7 張真題
    out.push(...pool);                  // 真題全放
    // 需複製 = perDim − 7 張。48 張→每維 5、64 張→每維 9（跨輪循環）。
    let copies = perDim - pool.length;
    while (copies > 0) {
      const round = shuffle([...pool]).slice(0, Math.min(copies, pool.length));
      for (const src of round) {
        out.push({ id: placeholderId++, imageId: src.imageId ?? src.id, dimension: d, text: src.text, textEn: src.textEn });
      }
      copies -= round.length;
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
  playerScores: Sd4Scores[],
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
