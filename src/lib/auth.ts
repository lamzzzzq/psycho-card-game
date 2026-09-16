// 账号系统前端助手（方案 A：学号登录 + 合成邮箱）。2026-07-20。
// 登录用学号，但 Supabase 账号钥匙是合成邮箱 <学号>@stu.personalitiesmahjong.com。
// 注册走 register Edge Function（服务端建号）；登录/登出走 supabase.auth 内置。

import { supabase } from '@/lib/supabase';
import { normalizeStudentId } from '@/lib/utils';
import { getDeviceToken } from '@/lib/deviceToken';

// 单会话：「其它设备近期活跃」的判定窗口（心跳每 60s，窗口略大于 2 个心跳）
const ACTIVE_WINDOW_MS = 150_000;

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

// 登录失败要分两类（2026-09-15 压测）：密码真错 vs 服务器忙不过来。
// 上课全班同时登录会把 Auth 服务打满，Supabase 回 504/429（300 人实测 162 次）。
// 这类错误原先一律报「學號或密碼錯誤」，学生会以为自己密码错，反复改密码、举手叫老师。
// 改为：密码错立刻返回；服务器忙则自动退避重试，页面显示「伺服器忙碌」。
const SIGN_IN_BACKOFF_MS = [3000, 5000, 8000, 12000, 15000, 20000, 20000, 20000];
export const SIGN_IN_MAX_RETRIES = SIGN_IN_BACKOFF_MS.length;

// 错误分三类，别再「任何失败都说密码错」：
//   busy      服务器忙 —— 值得重试。auth-js 把 502/503/504 包成 AuthRetryableFetchError；
//             其余 5xx / 网关 HTML 错误页解析失败会变成 status 为 undefined 的 AuthUnknownError。
//   ratelimit 被限流(429) —— 窗口是 5 分钟，退避重试打不穿，重试只会把全班的配额挤得更死。
//   wrong     学号或密码真的错了（400/401 + code invalid_credentials）。
type SignInFailure = 'busy' | 'ratelimit' | 'wrong' | 'unknown';
function classifySignInError(error: unknown): SignInFailure {
  const e = error as { status?: number; name?: string; code?: string } | null;
  if (!e) return 'unknown';
  if (e.status === 429) return 'ratelimit';
  if (e.name === 'AuthRetryableFetchError' || e.name === 'AuthUnknownError') return 'busy';
  const s = e.status ?? 0;
  if (s === 408 || s >= 500) return 'busy';
  if (s === 400 || s === 401 || e.code === 'invalid_credentials') return 'wrong';
  return 'unknown';
}

// 登录：学号 → 合成邮箱 → 密码登录。
// onBusy 每次进入重试等待时回调（第几次 / 共几次）；maxRetries 可调小（注册后自动登录只试 2 次）。
export async function signInWithStudentId(
  studentId: string,
  password: string,
  opts?: { onBusy?: (attempt: number, total: number) => void; maxRetries?: number },
): Promise<AuthResult> {
  const max = Math.min(opts?.maxRetries ?? SIGN_IN_MAX_RETRIES, SIGN_IN_MAX_RETRIES);
  for (let i = 0; ; i++) {
    const { error } = await supabase.auth.signInWithPassword({
      email: syntheticEmail(studentId),
      password,
    });
    if (!error) return { ok: true };
    const kind = classifySignInError(error);
    if (kind === 'wrong') return { ok: false, error: 'invalid_credentials' };
    if (kind === 'ratelimit') return { ok: false, error: 'login_too_many' };
    if (kind === 'unknown') return { ok: false, error: 'unknown' };
    if (i >= max) return { ok: false, error: 'server_busy' };
    opts?.onBusy?.(i + 1, max);
    // 加随机抖动，避免全班的重试再次撞在同一秒
    await new Promise((r) => setTimeout(r, SIGN_IN_BACKOFF_MS[i] + Math.random() * 2000));
  }
}

export async function signOutUser(): Promise<void> {
  await supabase.auth.signOut();
}

// ── 单会话 ──

// 当前登录用户 id（未登录 null）
export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

// 登录冲突检测：是否有「其它设备近期活跃」占用该账号
export async function isSessionActiveElsewhere(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('active_device, active_at')
    .eq('id', userId)
    .maybeSingle();
  if (!data?.active_device || !data.active_at) return false;
  if (data.active_device === getDeviceToken()) return false;
  return Date.now() - new Date(data.active_at).getTime() < ACTIVE_WINDOW_MS;
}

// 占用会话（把 active_device 设为本机 + 刷新时间）
export async function claimSession(userId: string): Promise<void> {
  await supabase
    .from('profiles')
    .update({ active_device: getDeviceToken(), active_at: new Date().toISOString() })
    .eq('id', userId);
}

// 心跳：仍是本机 → 刷新时间返回 ok；被别的设备顶了 → 'taken_over'
export async function heartbeatSession(userId: string): Promise<'ok' | 'taken_over'> {
  const { data } = await supabase
    .from('profiles')
    .select('active_device')
    .eq('id', userId)
    .maybeSingle();
  if (data && data.active_device && data.active_device !== getDeviceToken()) {
    return 'taken_over';
  }
  await supabase
    .from('profiles')
    .update({ active_device: getDeviceToken(), active_at: new Date().toISOString() })
    .eq('id', userId);
  return 'ok';
}

// /account 改找回邮箱：发码到新邮箱（认证态）
export async function sendEmailChangeCode(email: string): Promise<AuthResult> {
  const { data, error } = await supabase.functions.invoke('change-recovery-email', {
    body: { action: 'send', email: email.trim().toLowerCase() },
  });
  if (error) return { ok: false, error: await readFnError(error) };
  if ((data as { ok?: boolean })?.ok) return { ok: true };
  return { ok: false, error: (data as { error?: string })?.error ?? 'unknown' };
}

// /account 改找回邮箱：验码 → 更新为已验证
export async function verifyEmailChange(email: string, code: string): Promise<AuthResult> {
  const { data, error } = await supabase.functions.invoke('change-recovery-email', {
    body: { action: 'verify', email: email.trim().toLowerCase(), code: code.trim() },
  });
  if (error) return { ok: false, error: await readFnError(error) };
  if ((data as { ok?: boolean })?.ok) return { ok: true };
  return { ok: false, error: (data as { error?: string })?.error ?? 'unknown' };
}

// 忘记密码（验证码流程 第一步）：请求把 6 位重置码发到该学号账号的找回邮箱。
// 防枚举：无论学号是否存在，函数都返回成功，前端统一提示「若存在则已发送」。
export async function requestPasswordRecovery(studentId: string): Promise<void> {
  await supabase.functions.invoke('password-recovery', {
    body: { student_id: normalizeStudentId(studentId), action: 'send' },
  });
}

// 忘记密码（验证码流程 第二步）：带验证码 + 新密码 → 校验后改密。
// 错误码：invalid_code | code_not_found | code_expired | code_locked | weak_password | ...
export async function resetPasswordWithCode(
  studentId: string,
  code: string,
  newPassword: string,
): Promise<AuthResult> {
  const { data, error } = await supabase.functions.invoke('password-recovery', {
    body: {
      student_id: normalizeStudentId(studentId),
      action: 'verify',
      code: code.trim(),
      password: newPassword,
    },
  });
  if (error) return { ok: false, error: await readFnError(error) };
  if ((data as { ok?: boolean })?.ok) return { ok: true };
  return { ok: false, error: (data as { error?: string })?.error ?? 'unknown' };
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
