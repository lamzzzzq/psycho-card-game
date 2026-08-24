// SD4 测评结果写入 Supabase：复用宽表 assessment_results，model='sd4'，一次测评 = 一行。
// INSERT-only（authenticated 且 user_id=auth.uid()，见 0016）；读回走 RPC(SECURITY DEFINER，登录本人)。
// RPC 已带 p_model 参数（0024），无需新迁移。结构与逻辑对齐 hexaco-record.ts；仅 model / scores 形状不同。
import { supabase } from './supabase';
import { getCurrentStudentId } from './auth';
import { getOrCreateDeviceToken } from './assessment-record';
import { Sd4Scores, LikertScore } from '@/data/sd4-types';

const MODEL = 'sd4';
const SD4_KEYS: (keyof Sd4Scores)[] = ['M', 'N', 'P', 'S'];

// 换设备/清缓存后按学号取回「最新一次 SD4 测评」的四维分数。
// 走 RPC get_scores_by_student_id(p_student_id, p_model='sd4')（只回 scores，不回答案）。
// 返回 null = 无记录 / 网络失败 / 数据不完整。
export async function restoreSd4Scores(studentId: string): Promise<Sd4Scores | null> {
  try {
    const sid = studentId?.trim();
    if (!sid) return null;
    const { data, error } = await supabase.rpc('get_scores_by_student_id', { p_student_id: sid, p_model: MODEL });
    if (error) {
      console.warn('[sd4-record] get_scores_by_student_id rpc failed', error.message);
      return null;
    }
    if (!data || typeof data !== 'object') return null;
    const s = data as Record<string, unknown>;
    if (!SD4_KEYS.every((k) => typeof s[k] === 'number')) return null;
    return { M: s.M as number, N: s.N as number, P: s.P as number, S: s.S as number };
  } catch (err) {
    console.warn('[sd4-record] restoreSd4Scores exception', err);
    return null;
  }
}

// ── 失败缓冲 + 补传（同 hexaco-record 模式）──
type PendingSd4 = {
  id: string;
  studentId: string;
  answers: Record<number, LikertScore>;
  scores: Sd4Scores;
  createdAt: number;
};

const PENDING_KEY = 'psycho-card-pending-sd4';
const MAX_RETRY_AGE_MS = 24 * 60 * 60 * 1000;

function genUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function readPending(): PendingSd4[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function writePending(items: PendingSd4[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(items));
  } catch {}
}
function buffer(item: PendingSd4) {
  const items = readPending().filter((it) => it.id !== item.id);
  items.push(item);
  writePending(items.slice(-10));
}
function removePending(id: string) {
  const items = readPending();
  const next = items.filter((it) => it.id !== id);
  if (next.length !== items.length) writePending(next);
}

// 真正的一次写入。成功（或 23505 = 早已写过）→ true。未登录直接 false（anon 必被 RLS 拒）。
async function insertOnce(item: PendingSd4): Promise<boolean> {
  try {
    const { data: sess } = await supabase.auth.getSession();
    const userId = sess.session?.user.id ?? null;
    if (!userId) return false;
    const { error } = await supabase.from('assessment_results').insert({
      id: item.id,
      student_id: item.studentId,
      user_id: userId,                 // 必须等于 auth.uid()（0016 WITH CHECK）
      device_token: getOrCreateDeviceToken(),
      model: MODEL,                    // 'sd4'（区分大五/HEXACO）
      source: 'assessment',            // SD4 无对局门禁 → 无手动填分入口，恒为 assessment
      answers: item.answers,           // jsonb：{ "1":4, ..., "28":5 }（SD4-28）
      scores: item.scores,             // jsonb：{ M, N, P, S }
      answered_count: Object.keys(item.answers).length,
    });
    if (error && error.code !== '23505') {
      console.warn('[sd4-record] insert failed', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[sd4-record] insertOnce exception', err);
    return false;
  }
}

let retryInFlight = false;
// 补传上次没写进去的 SD4 测评行。答题页登录态就绪后调用一次。
export async function retryPendingSd4Saves(): Promise<void> {
  if (retryInFlight) return;
  retryInFlight = true;
  try {
    const items = readPending();
    if (items.length === 0) return;
    // 共用电脑防串号：只补传当前登录学号自己的缓冲。
    const currentSid = await getCurrentStudentId();
    if (!currentSid) return;
    const now = Date.now();
    for (const item of items) {
      if (now - item.createdAt > MAX_RETRY_AGE_MS) {
        removePending(item.id);
        continue;
      }
      if (item.studentId !== currentSid) continue;
      if (await insertOnce(item)) removePending(item.id);
    }
  } finally {
    retryInFlight = false;
  }
}

// 完成 SD4 测评时调用：把这次的答案 + 四维分数写成一行（model='sd4'）。
// 非阻塞 + try/catch + 失败落缓冲：不影响测评流程。
export async function saveSd4Result(
  studentId: string,
  answers: Record<number, LikertScore>,
  scores: Sd4Scores
): Promise<void> {
  const sid = studentId?.trim();
  if (!sid) return;
  const item: PendingSd4 = { id: genUuid(), studentId: sid, answers, scores, createdAt: Date.now() };
  buffer(item);
  if (await insertOnce(item)) removePending(item.id);
  else console.warn('[sd4-record] save failed — kept in localStorage for retry');
}
