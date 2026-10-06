// 局末知识小测成绩写入 Supabase：quiz_results，一次答完 = 一行。
// INSERT-only，只有后台 service_role 能读。见 supabase/migrations/0029_quiz_results.sql。
// 缓冲 + 补传同 assessment-record：先落 localStorage、成功再移除，下次结算页打开时补传。
import { supabase } from './supabase';
import { getCurrentStudentId } from './auth';
import type { QuizModel } from '@/data/quiz-dimension-questions';

export type QuizItem = {
  source: 'card' | 'dimension';
  question: string;   // 题干英文原文（作题目标识）
  picked: string;     // 学生选的选项（英文）
  answer: string;     // 正解（英文）
  correct: boolean;
};

type PendingQuiz = {
  id: string;
  studentId: string;
  model: QuizModel;
  mode: 'single' | 'pvp';
  roomCode: string | null;
  attempt: number;
  score: number;
  total: number;
  items: QuizItem[];
  locale: string;
  createdAt: number;
};

const PENDING_QUIZ_KEY = 'psycho-card-pending-quizzes';
const MAX_RETRY_AGE_MS = 24 * 60 * 60 * 1000;

function genUuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

function readPending(): PendingQuiz[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PENDING_QUIZ_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writePending(items: PendingQuiz[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PENDING_QUIZ_KEY, JSON.stringify(items));
  } catch {}
}

function removePending(id: string) {
  const items = readPending();
  const next = items.filter((it) => it.id !== id);
  if (next.length !== items.length) writePending(next);
}

// 成功（或 23505 = 早已写过）→ true。未登录不发请求，留缓冲等登录后补传。
async function insertOnce(item: PendingQuiz): Promise<boolean> {
  try {
    const { data: sess } = await supabase.auth.getSession();
    const userId = sess.session?.user.id ?? null;
    if (!userId) return false;
    const { error } = await supabase.from('quiz_results').insert({
      id: item.id,
      student_id: item.studentId,
      user_id: userId,
      model: item.model,
      mode: item.mode,
      room_code: item.roomCode,
      attempt: item.attempt,
      score: item.score,
      total: item.total,
      items: item.items,
      locale: item.locale,
    });
    if (error && error.code !== '23505') {
      console.warn('[quiz-record] insert failed', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[quiz-record] insertOnce exception', err);
    return false;
  }
}

let retryInFlight = false;
// 补传上次没写进去的小测。共用电脑防串号：只补当前登录学号自己的。
export async function retryPendingQuizSaves(): Promise<void> {
  if (retryInFlight) return;
  retryInFlight = true;
  try {
    const items = readPending();
    if (items.length === 0) return;
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

/** 从当前路径推断模式和房号：/pvp/game/ABCD、/hexaco-pvp/game/ABCD、/sd4-pvp/game/ABCD = PVP。 */
export function quizContextFromPath(pathname: string | null): { mode: 'single' | 'pvp'; roomCode: string | null } {
  const m = pathname?.match(/^\/(?:hexaco-|sd4-)?pvp\/game\/([^/?#]+)/);
  return m ? { mode: 'pvp', roomCode: decodeURIComponent(m[1]) } : { mode: 'single', roomCode: null };
}

// 答完一轮时调用。非阻塞、从不抛错：未登录（单机可不登录）直接不记。
export async function saveQuizResult(input: {
  model: QuizModel;
  mode: 'single' | 'pvp';
  roomCode: string | null;
  attempt: number;
  items: QuizItem[];
  locale: string;
}): Promise<void> {
  try {
    const studentId = await getCurrentStudentId();
    if (!studentId) return;
    const item: PendingQuiz = {
      id: genUuid(),
      studentId,
      model: input.model,
      mode: input.mode,
      roomCode: input.roomCode,
      attempt: input.attempt,
      score: input.items.filter((i) => i.correct).length,
      total: input.items.length,
      items: input.items,
      locale: input.locale,
      createdAt: Date.now(),
    };
    writePending([...readPending().filter((it) => it.id !== item.id), item].slice(-20));
    if (await insertOnce(item)) removePending(item.id);
  } catch (err) {
    console.warn('[quiz-record] saveQuizResult exception', err);
  }
}
