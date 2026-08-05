import { HexacoScores, Dimension, DIMENSIONS, GameCard, isPersonalityCard } from '@/types/hexaco-game';

// HEXACO 遊戲計分（src/lib/scoring.ts 的六維平行版本；測評計分在 lib/hexaco-scoring.ts，
// 這裡只管遊戲側：目標張數 / 手牌 / 結算）。

export function getTargetCounts(scores: HexacoScores): Record<Dimension, number> {
  // 每维目标张数下限 1：脏数据/越界分可能 round 到 0，而 target=0 会让
  // 「空集归档 / 空集胡牌」成立 → 强制 ≥1 堵死该隐患（同 Big Five 版）。
  const t = (v: number) => Math.max(1, Math.round(v));
  return {
    H: t(scores.H), E: t(scores.E), X: t(scores.X),
    A: t(scores.A), C: t(scores.C), O: t(scores.O),
  };
}

export function getTotalTarget(scores: HexacoScores): number {
  const targets = getTargetCounts(scores);
  return DIMENSIONS.reduce((sum, d) => sum + targets[d], 0);
}

export function getInitialHandSize(scores: HexacoScores): number {
  return getTotalTarget(scores) - 1;
}

export function calculateHandScore(
  hand: GameCard[],
  scores: HexacoScores
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

export function generateAIScores(): HexacoScores {
  // Range 2.0-4.0（同 Big Five 版）：六維 target 2-4，手牌 11-23。
  const rand = (min: number, max: number) =>
    Math.round((min + Math.random() * (max - min)) * 10) / 10;

  return {
    H: rand(2.0, 4.0), E: rand(2.0, 4.0), X: rand(2.0, 4.0),
    A: rand(2.0, 4.0), C: rand(2.0, 4.0), O: rand(2.0, 4.0),
  };
}
