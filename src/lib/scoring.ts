import { BigFiveScores, Dimension, DIMENSIONS, LikertScore, Question, GameCard, isPersonalityCard } from '@/types';

export function calculateBigFiveScores(
  answers: Record<number, LikertScore>,
  questions: Question[]
): BigFiveScores {
  const dimensionScores: Record<Dimension, number[]> = {
    O: [], C: [], E: [], A: [], N: [],
  };

  for (const q of questions) {
    const rawScore = answers[q.id];
    if (rawScore === undefined) continue;
    const score = q.reversed ? (6 - rawScore) : rawScore;
    dimensionScores[q.dimension].push(score);
  }

  const avg = (arr: number[]) =>
    arr.length === 0 ? 3 : arr.reduce((a, b) => a + b, 0) / arr.length;

  return {
    O: Math.round(avg(dimensionScores.O) * 10) / 10,
    C: Math.round(avg(dimensionScores.C) * 10) / 10,
    E: Math.round(avg(dimensionScores.E) * 10) / 10,
    A: Math.round(avg(dimensionScores.A) * 10) / 10,
    N: Math.round(avg(dimensionScores.N) * 10) / 10,
  };
}

export function getTargetCounts(scores: BigFiveScores): Record<Dimension, number> {
  return {
    O: Math.round(scores.O),
    C: Math.round(scores.C),
    E: Math.round(scores.E),
    A: Math.round(scores.A),
    N: Math.round(scores.N),
  };
}

export function getTotalTarget(scores: BigFiveScores): number {
  const targets = getTargetCounts(scores);
  return DIMENSIONS.reduce((sum, d) => sum + targets[d], 0);
}

export function getInitialHandSize(scores: BigFiveScores): number {
  return getTotalTarget(scores) - 1;
}

export function calculateHandScore(
  hand: GameCard[],
  scores: BigFiveScores
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

export function generateAIScores(): BigFiveScores {
  // Range 2.0-4.0 to keep hand sizes reasonable (targets 2-4, hand 9-19)
  const rand = (min: number, max: number) =>
    Math.round((min + Math.random() * (max - min)) * 10) / 10;

  return {
    O: rand(2.0, 4.0),
    C: rand(2.0, 4.0),
    E: rand(2.0, 4.0),
    A: rand(2.0, 4.0),
    N: rand(2.0, 4.0),
  };
}
