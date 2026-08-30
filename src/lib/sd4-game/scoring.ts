import { Sd4Scores, Dimension, DIMENSIONS, GameCard, isPersonalityCard } from '@/types/sd4-game';

// SD4 遊戲計分（src/lib/hexaco-game/scoring.ts 的四維平行版本；測評計分在 lib/sd4-scoring.ts，
// 這裡只管遊戲側：目標張數 / 手牌 / 結算）。

export function getTargetCounts(scores: Sd4Scores): Record<Dimension, number> {
  // 每维目标张数下限 1：脏数据/越界分可能 round 到 0，而 target=0 会让
  // 「空集归档 / 空集胡牌」成立 → 强制 ≥1 堵死该隐患（同 Big Five 版）。
  const t = (v: number) => Math.max(1, Math.round(v));
  return { M: t(scores.M), N: t(scores.N), P: t(scores.P), S: t(scores.S) };
}

export function getTotalTarget(scores: Sd4Scores): number {
  const targets = getTargetCounts(scores);
  return DIMENSIONS.reduce((sum, d) => sum + targets[d], 0);
}

export function getInitialHandSize(scores: Sd4Scores): number {
  return getTotalTarget(scores) - 1;
}

export function calculateHandScore(
  hand: GameCard[],
  scores: Sd4Scores
): number {
  return Math.round(
    hand.reduce((total, card) => {
      if (isPersonalityCard(card)) {
        return total + scores[card.dimension];
      }
      return total;
    }, 0) * 10
  ) / 10;
}

export function calculatePenaltyScore(hand: GameCard[]): number {
  return -hand.length;
}

export function calculateFinalScore(
  declaredCount: number,
  remainingHand: GameCard[]
): number {
  return declaredCount * 10 + calculatePenaltyScore(remainingHand);
}

export function generateAIScores(): Sd4Scores {
  // Range 2.0-4.0（同 Big Five 版）：四維 target 2-4，手牌 7-15。
  const rand = (min: number, max: number) =>
    Math.round((min + Math.random() * (max - min)) * 10) / 10;

  return { M: rand(2.0, 4.0), N: rand(2.0, 4.0), P: rand(2.0, 4.0), S: rand(2.0, 4.0) };
}
