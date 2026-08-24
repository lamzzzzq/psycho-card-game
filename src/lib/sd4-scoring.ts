import { Sd4Dimension, Sd4Scores, LikertScore, Sd4Question } from '@/data/sd4-types';

// SD4 計分：全部正向計分（無反向題，xlsx 明示），每維取平均（該維 7 題）。
//   1–5 Likert，維度分數範圍 1.0–5.0。未作答的題不計入該維平均。
// 結構對齊 hexaco-scoring.ts，僅去掉 reversed 分支。
export function calculateSd4Scores(
  answers: Record<number, LikertScore>,
  questions: Sd4Question[]
): Sd4Scores {
  const buckets: Record<Sd4Dimension, number[]> = { M: [], N: [], P: [], S: [] };

  for (const q of questions) {
    const raw = answers[q.id];
    if (raw === undefined) continue;
    buckets[q.dimension].push(raw);
  }

  // 某維一題都沒作答 → 回退中間值 3。正常流程（答滿 28 題才允許提交）不會走到，
  // 走到就說明題庫維度標記或答案傳遞出了問題——留 warn 便於發現，行為不拋錯（同 HEXACO）。
  const avg = (arr: number[], dim: Sd4Dimension) => {
    if (arr.length === 0) {
      console.warn(`[sd4-scoring] 維度 ${dim} 無任何作答，回退中間值 3（正常流程不應出現）`);
      return 3;
    }
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  };

  return {
    M: Math.round(avg(buckets.M, 'M') * 100) / 100,
    N: Math.round(avg(buckets.N, 'N') * 100) / 100,
    P: Math.round(avg(buckets.P, 'P') * 100) / 100,
    S: Math.round(avg(buckets.S, 'S') * 100) / 100,
  };
}
