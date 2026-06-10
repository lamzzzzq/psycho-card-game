// 测评结果写入 Supabase：宽表 assessment_results，一次测评 = 一行（答案 + 分数 JSON）。
// INSERT-only，只有后台 service_role 能读。见 supabase/migrations/0004_assessment_results_wide.sql。
import { supabase } from './supabase';
import { BigFiveScores, LikertScore } from '@/types';

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

// 完成测评（或手动填分）时调用：把这一次的答案 + 算好的五维分数写成一行。
// 同学号换设备/浏览器/重测都各写一行（按 student_id 归属，不去重；device_token 区分来源）。
// 非阻塞 + try/catch：表没建好 / 网络失败都不影响测评流程。
export async function saveAssessmentResult(
  studentId: string,
  answers: Record<number, LikertScore>,
  scores: BigFiveScores,
  source: 'assessment' | 'manual' = 'assessment'
): Promise<void> {
  try {
    const sid = studentId?.trim();
    if (!sid) return;
    const { error } = await supabase.from('assessment_results').insert({
      student_id: sid,
      device_token: getOrCreateDeviceToken(),
      source,
      answers,                              // jsonb：{ "1": 4, ..., "60": 5 }（手动填分为空 {}）
      scores,                               // jsonb：{ O, C, E, A, N }
      answered_count: Object.keys(answers).length,
    });
    if (error) {
      console.warn('[assessment-record] insert result failed', error.message);
    }
  } catch (err) {
    console.warn('[assessment-record] saveAssessmentResult exception', err);
  }
}
