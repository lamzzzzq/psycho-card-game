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

  // 某維一題都沒作答 → 回退中間值 3。正常流程（答滿 60 題才允許提交）不會走到，
  // 走到就說明題庫維度標記或答案傳遞出了問題——靜默給 3 會讓錯誤看起來像正常分數，
  // 所以留一條 warn 便於發現。行為保持不變（不拋錯，免得毀掉整份報告）。
  const avg = (arr: number[], dim: HexacoDimension) => {
    if (arr.length === 0) {
      console.warn(`[hexaco-scoring] 維度 ${dim} 無任何作答，回退中間值 3（正常流程不應出現）`);
      return 3;
    }
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  };

  return {
    H: Math.round(avg(buckets.H, 'H') * 100) / 100,
    E: Math.round(avg(buckets.E, 'E') * 100) / 100,
    X: Math.round(avg(buckets.X, 'X') * 100) / 100,
    A: Math.round(avg(buckets.A, 'A') * 100) / 100,
    C: Math.round(avg(buckets.C, 'C') * 100) / 100,
    O: Math.round(avg(buckets.O, 'O') * 100) / 100,
  };
}
