import { BigFiveScores, Dimension, LikertScore, Question } from '@/types';

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

export function calculateHandScore(
  hand: { dimension: Dimension }[],
  scores: BigFiveScores
): number {
  return Math.round(
    hand.reduce((total, card) => total + scores[card.dimension], 0) * 10
  ) / 10;
}

export function generateAIScores(): BigFiveScores {
  const rand = (min: number, max: number) =>
    Math.round((min + Math.random() * (max - min)) * 10) / 10;

  return {
    O: rand(1.5, 4.5),
    C: rand(1.5, 4.5),
    E: rand(1.5, 4.5),
    A: rand(1.5, 4.5),
    N: rand(1.5, 4.5),
  };
}
