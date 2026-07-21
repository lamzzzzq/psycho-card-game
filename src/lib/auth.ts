// 账号系统前端助手（方案 A：学号登录 + 合成邮箱）。2026-07-20。
// 登录用学号，但 Supabase 账号钥匙是合成邮箱 <学号>@stu.personalitiesmahjong.com。
// 注册走 register Edge Function（服务端建号）；登录/登出走 supabase.auth 内置。

import { supabase } from '@/lib/supabase';
import { normalizeStudentId } from '@/lib/utils';

const EMAIL_DOMAIN = 'stu.personalitiesmahjong.com';
export const MIN_PASSWORD = 6;

// 学号 → 合成邮箱（与 register Edge Function 里完全一致：normalize 后取小写）
export function syntheticEmail(studentId: string): string {
  return `${normalizeStudentId(studentId).toLowerCase()}@${EMAIL_DOMAIN}`;
}

export type AuthResult = { ok: true } | { ok: false; error: string };

// 从 functions.invoke 的错误里取出后端返回的错误码
async function readFnError(error: unknown): Promise<string> {
  let code = 'request_failed';
  try {
    const ctx = (error as { context?: Response }).context;
    if (ctx && typeof ctx.json === 'function') {
      const b = (await ctx.json()) as { error?: string };
      if (b?.error) code = b.error;
    }
  } catch {
    /* 读不出就用兜底码 */
  }
  return code;
}

// 发送邮箱验证码（注册第一步）。错误码：invalid_student_id | invalid_email | student_id_taken | send_failed | ...
export async function sendVerifyCode(studentId: string, email: string): Promise<AuthResult> {
  const { data, error } = await supabase.functions.invoke('send-verify-code', {
    body: { student_id: normalizeStudentId(studentId), email: email.trim().toLowerCase() },
  });
  if (error) return { ok: false, error: await readFnError(error) };
  if ((data as { ok?: boolean })?.ok) return { ok: true };
  return { ok: false, error: (data as { error?: string })?.error ?? 'unknown' };
}

// 注册（第二步）：带验证码。错误码见 register 函数：
//   invalid_* | weak_password | code_* | invalid_code | student_id_taken | account_exists | ...
export async function registerStudent(input: {
  studentId: string;
  password: string;
  recoveryEmail: string;
  code: string;
}): Promise<AuthResult> {
  const { data, error } = await supabase.functions.invoke('register', {
    body: {
      student_id: normalizeStudentId(input.studentId),
      password: input.password,
      recovery_email: input.recoveryEmail.trim().toLowerCase(),
      code: input.code.trim(),
    },
  });

  if (error) return { ok: false, error: await readFnError(error) };
  if ((data as { ok?: boolean })?.ok) return { ok: true };
  return { ok: false, error: (data as { error?: string })?.error ?? 'unknown' };
}

// 登录：学号 → 合成邮箱 → 密码登录
export async function signInWithStudentId(
  studentId: string,
  password: string,
): Promise<AuthResult> {
  const { error } = await supabase.auth.signInWithPassword({
    email: syntheticEmail(studentId),
    password,
  });
  if (error) return { ok: false, error: 'invalid_credentials' };
  return { ok: true };
}

export async function signOutUser(): Promise<void> {
  await supabase.auth.signOut();
}

// 忘记密码：请求把重置链接发到该学号账号的找回邮箱。
// 防枚举：无论学号是否存在，函数都返回成功，前端统一提示「若存在则已发送」。
export async function requestPasswordRecovery(studentId: string): Promise<void> {
  await supabase.functions.invoke('password-recovery', {
    body: { student_id: normalizeStudentId(studentId) },
  });
}

// 取当前登录用户的学号（从 profiles 读；未登录返回 null）
export async function getCurrentStudentId(): Promise<string | null> {
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) return null;
  const { data } = await supabase
    .from('profiles')
    .select('student_id')
    .eq('id', sess.session.user.id)
    .maybeSingle();
  return data?.student_id ?? null;
}
