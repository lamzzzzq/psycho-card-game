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

// 注册：调 register Edge Function。错误码见函数：
//   invalid_student_id | weak_password | invalid_email | student_id_taken | account_exists | ...
export async function registerStudent(input: {
  studentId: string;
  password: string;
  recoveryEmail: string;
}): Promise<AuthResult> {
  const { data, error } = await supabase.functions.invoke('register', {
    body: {
      student_id: normalizeStudentId(input.studentId),
      password: input.password,
      recovery_email: input.recoveryEmail.trim().toLowerCase(),
    },
  });

  if (error) {
    // 非 2xx：supabase-js 把 Response 放在 error.context，从 body 里取错误码
    let code = 'request_failed';
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') {
        const body = (await ctx.json()) as { error?: string };
        if (body?.error) code = body.error;
      }
    } catch {
      /* 读不出 body 就用兜底码 */
    }
    return { ok: false, error: code };
  }

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
