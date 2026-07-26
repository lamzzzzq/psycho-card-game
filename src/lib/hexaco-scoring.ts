import { HexacoDimension, HexacoScores, LikertScore, HexacoQuestion } from '@/data/hexaco-types';

// HEXACO-60 計分：與大五完全相同的規則——
//   reversed 題用 (6 - rawScore)，其餘用 rawScore；每維取平均（該維 10 題）。
//   1–5 Likert，維度分數範圍 1.0–5.0。未作答的題不計入該維平均。
// 參考官方 HEXACO-60 scoring key（Ashton & Lee, 2009）與本專案 xlsx（Check by Mengying）反向標記。
export function calculateHexacoScores(
  answers: Record<number, LikertScore>,
  questions: HexacoQuestion[]
): HexacoScores {
  const buckets: Record<HexacoDimension, number[]> = {
    H: [], E: [], X: [], A: [], C: [], O: [],
  };

  for (const q of questions) {
    const raw = answers[q.id];
    if (raw === undefined) continue;
    const score = q.reversed ? 6 - raw : raw;
    buckets[q.dimension].push(score);
  }

  const avg = (arr: number[]) =>
    arr.length === 0 ? 3 : arr.reduce((a, b) => a + b, 0) / arr.length;

  return {
    H: Math.round(avg(buckets.H) * 100) / 100,
    E: Math.round(avg(buckets.E) * 100) / 100,
    X: Math.round(avg(buckets.X) * 100) / 100,
    A: Math.round(avg(buckets.A) * 100) / 100,
    C: Math.round(avg(buckets.C) * 100) / 100,
    O: Math.round(avg(buckets.O) * 100) / 100,
  };
}
