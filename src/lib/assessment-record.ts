// 测评结果写入 Supabase：宽表 assessment_results，一次测评 = 一行（答案 + 分数 JSON）。
// INSERT-only，只有后台 service_role 能读。见 supabase/migrations/0004_assessment_results_wide.sql。
import { supabase } from './supabase';
import { BigFiveScores, LikertScore } from '@/types';

const DEVICE_TOKEN_KEY = 'psycho-card-device-token';

// 检查学号是否已完成过测评（重复检测）。走 RPC student_id_exists（SECURITY DEFINER，
// 只回布尔，不暴露分数）。见 supabase/migrations/0005_student_id_exists_rpc.sql。
// 优雅降级：RPC 未建/网络失败 → 返回 false（不弹重复提示，不拦截用户）。
export async function checkStudentIdExists(studentId: string): Promise<boolean> {
  try {
    const sid = studentId?.trim();
    if (!sid) return false;
    const { data, error } = await supabase.rpc('student_id_exists', { p_student_id: sid });
    if (error) {
      console.warn('[assessment-record] student_id_exists rpc failed', error.message);
      return false;
    }
    return data === true;
  } catch (err) {
    console.warn('[assessment-record] checkStudentIdExists exception', err);
    return false;
  }
}

// Restore：按学号取回「最新一次测评」的五维分数（换设备/清缓存后免重做）。
// 走 RPC get_scores_by_student_id（SECURITY DEFINER，只回 scores 不回答案）。
// 见 supabase/migrations/0012_get_scores_by_student_id_rpc.sql。
// 返回 null = 无记录 / RPC 未建 / 网络失败 / 数据不完整（调用方回退到重新测评）。
export async function restoreAssessmentScores(studentId: string): Promise<BigFiveScores | null> {
  try {
    const sid = studentId?.trim();
    if (!sid) return null;
    const { data, error } = await supabase.rpc('get_scores_by_student_id', { p_student_id: sid });
    if (error) {
      console.warn('[assessment-record] get_scores_by_student_id rpc failed', error.message);
      return null;
    }
    if (!data || typeof data !== 'object') return null;
    const s = data as Record<string, unknown>;
    const keys: (keyof BigFiveScores)[] = ['O', 'C', 'E', 'A', 'N'];
    if (!keys.every((k) => typeof s[k] === 'number')) return null;
    return { O: s.O as number, C: s.C as number, E: s.E as number, A: s.A as number, N: s.N as number };
  } catch (err) {
    console.warn('[assessment-record] restoreAssessmentScores exception', err);
    return null;
  }
}

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
      answers,                              // jsonb：{ "1": 4, ..., "50": 5 }（IPIP-50，50 题；手动填分为空 {}）
      scores,                               // jsonb：{ O, C, E, A, N }（注意：N = 神經質，高分=易焦慮）
      answered_count: Object.keys(answers).length,
    });
    if (error) {
      console.warn('[assessment-record] insert result failed', error.message);
    }
  } catch (err) {
    console.warn('[assessment-record] saveAssessmentResult exception', err);
  }
}
