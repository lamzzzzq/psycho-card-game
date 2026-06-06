// 题目级 raw 答案写入 Supabase（INSERT-only，只有后台 service_role 能读）。
// 见 supabase/migrations/0002_assessment_responses_and_rls.sql + identity-plan 记忆。
import { supabase } from './supabase';
import { QUESTIONS } from '@/data/questions';
import { LikertScore } from '@/types';

const DEVICE_TOKEN_KEY = 'psycho-card-device-token';

// 本机随机 token：弱提示字段，区分换浏览器/设备（localStorage 按浏览器隔离，
// 清缓存/换浏览器会重新生成 —— 这是预期，不拿它挡写入）。
export function getOrCreateDeviceToken(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    let t = localStorage.getItem(DEVICE_TOKEN_KEY);
    if (!t) {
      t = crypto.randomUUID();
      localStorage.setItem(DEVICE_TOKEN_KEY, t);
    }
    return t;
  } catch {
    return 'no-storage';
  }
}

// 完成测评时调用：把 60 道题的真实选择批量 INSERT。
// 同学号换设备/浏览器/重测都会各写一份（不去重），分析时再去重。
// 非阻塞 + try/catch：表没建好 / 网络失败都不影响测评流程。
export async function saveAssessmentResponses(
  studentId: string,
  answers: Record<number, LikertScore>
): Promise<void> {
  try {
    const sid = studentId?.trim();
    if (!sid) return;
    const submissionId = crypto.randomUUID();
    const deviceToken = getOrCreateDeviceToken();
    const byId = new Map(QUESTIONS.map((q) => [q.id, q]));

    const rows = Object.entries(answers)
      .map(([qid, choice]) => {
        const q = byId.get(Number(qid));
        if (!q) return null;
        return {
          submission_id: submissionId,
          student_id: sid,
          device_token: deviceToken,
          question_id: q.id,
          dimension: q.dimension,
          reversed: q.reversed,
          raw_choice: choice,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    if (rows.length === 0) return;

    const { error } = await supabase.from('assessment_responses').insert(rows);
    if (error) {
      console.warn('[assessment-record] insert raw responses failed', error.message);
    }
  } catch (err) {
    console.warn('[assessment-record] saveAssessmentResponses exception', err);
  }
}
