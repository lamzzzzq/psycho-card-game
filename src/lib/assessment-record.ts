// 测评结果写入 Supabase：宽表 assessment_results，一次测评 = 一行（答案 + 分数 JSON）。
// INSERT-only，只有后台 service_role 能读。见 supabase/migrations/0004_assessment_results_wide.sql。
import { supabase } from './supabase';
import { getCurrentStudentId } from './auth';
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

// ── 失败缓冲 + 补传（同 game-record 模式）──
// 测评写入是全站唯一 authenticated-only 的写路径（0016 后 anon 无 INSERT 策略）：
// 提交瞬间 session 失效（refresh token 过期/另一标签页登出）会被 RLS 拒绝，
// 而 50 题答案是 append-only 表里补不回来的数据 —— 所以失败必须落 localStorage，
// 下次登录态就绪时 retryPendingAssessmentSaves() 补传。
type PendingAssessment = {
  id: string;                // 客户端生成的行 id：补传撞 23505 = 其实已写成功，据此去重
  studentId: string;
  answers: Record<number, LikertScore>;
  scores: BigFiveScores;
  source: 'assessment' | 'manual';
  createdAt: number;         // unix ms；超过时效丢弃，避免旧数据某天被翻出来污染课堂数据
};

const PENDING_ASSESS_KEY = 'psycho-card-pending-assessments';
const MAX_RETRY_AGE_MS = 24 * 60 * 60 * 1000;

// id 必须是合法 UUID（表主键是 UUID 类型）：randomUUID 只在 secure context 存在，
// 兜底手搓 UUIDv4 —— 拼接字符串会 22P02、每次补传都失败、24h 后静默丢数据。
function genUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function readPendingAssessments(): PendingAssessment[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PENDING_ASSESS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writePendingAssessments(items: PendingAssessment[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PENDING_ASSESS_KEY, JSON.stringify(items));
  } catch {}
}

function bufferAssessment(item: PendingAssessment) {
  const items = readPendingAssessments().filter((it) => it.id !== item.id);
  items.push(item);
  writePendingAssessments(items.slice(-10));
}

function removePendingAssessment(id: string) {
  const items = readPendingAssessments();
  const next = items.filter((it) => it.id !== id);
  if (next.length !== items.length) writePendingAssessments(next);
}

// 真正的一次写入。成功（或 23505 = 早已写过）→ true。
// 未登录直接 false 不发请求：anon 必被 RLS 拒，留在缓冲等登录后补传。
async function insertAssessmentOnce(item: PendingAssessment): Promise<boolean> {
  try {
    const { data: sess } = await supabase.auth.getSession();
    const userId = sess.session?.user.id ?? null;
    if (!userId) return false;
    const { error } = await supabase.from('assessment_results').insert({
      id: item.id,
      student_id: item.studentId,
      user_id: userId,                      // 补传时重取：必须等于 auth.uid()（0016 WITH CHECK）
      device_token: getOrCreateDeviceToken(),
      source: item.source,
      answers: item.answers,                // jsonb：{ "1": 4, ..., "50": 5 }（IPIP-50，50 题；手动填分为空 {}）
      scores: item.scores,                  // jsonb：{ O, C, E, A, N }（注意：N = 神經質，高分=易焦慮）
      answered_count: Object.keys(item.answers).length,
    });
    if (error && error.code !== '23505') {
      console.warn('[assessment-record] insert result failed', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[assessment-record] insertAssessmentOnce exception', err);
    return false;
  }
}

let assessRetryInFlight = false;
// 补传上次没写进去的测评行。测评页/PVP 大厅登录态就绪后调用一次。
export async function retryPendingAssessmentSaves(): Promise<void> {
  if (assessRetryInFlight) return;
  assessRetryInFlight = true;
  try {
    const items = readPendingAssessments();
    if (items.length === 0) return;
    // 共用电脑防串号：只补传「当前登录学号」自己的缓冲。别人的留在缓冲等本人
    // 登录（到期自动丢弃），否则会以 user_id=B、student_id=A 的错配行落库。
    const currentSid = await getCurrentStudentId();
    if (!currentSid) return;
    const now = Date.now();
    for (const item of items) {
      if (now - item.createdAt > MAX_RETRY_AGE_MS) {
        removePendingAssessment(item.id);
        continue;
      }
      if (item.studentId !== currentSid) continue;
      if (await insertAssessmentOnce(item)) removePendingAssessment(item.id);
    }
  } finally {
    assessRetryInFlight = false;
  }
}

// 完成测评（或手动填分）时调用：把这一次的答案 + 算好的五维分数写成一行。
// 同学号换设备/浏览器/重测都各写一行（按 student_id 归属，不去重；device_token 区分来源）。
// 非阻塞 + try/catch：表没建好 / 网络失败都不影响测评流程（数据落缓冲，之后补传）。
export async function saveAssessmentResult(
  studentId: string,
  answers: Record<number, LikertScore>,
  scores: BigFiveScores,
  source: 'assessment' | 'manual' = 'assessment'
): Promise<void> {
  const sid = studentId?.trim();
  if (!sid) return;
  const item: PendingAssessment = {
    id: genUuid(),
    studentId: sid,
    answers,
    scores,
    source,
    createdAt: Date.now(),
  };
  // 先落缓冲、成功再移除：提交后立刻关页面 in-flight 请求会死掉，缓冲先行保证必能补传。
  bufferAssessment(item);
  if (await insertAssessmentOnce(item)) removePendingAssessment(item.id);
  else console.warn('[assessment-record] save failed — kept in localStorage for retry');
}
