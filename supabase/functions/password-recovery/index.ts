// Edge Function: password-recovery —— 忘记密码（验证码流程）。2026-07-24 改版。
//
// 原来发「重置链接」(admin.generateLink + hashed_token)，链接邮件被机构邮箱过滤/没发出。
// 改为和注册/换绑一致的「验证码」流程（已验证能秒收）：
//   action='send'  ：按学号查 profiles.recovery_email → 生成 6 位码(哈希存 password_reset_codes)
//                    → Resend 把明文码发到找回邮箱。无论学号是否存在一律 {ok:true}（防枚举）。
//   action='verify'：校验 {student_id, code, password} → 码对(未过期/未超次) → admin.updateUserById 改密
//                    → 删码。返回 {ok:true} 或错误码。
//
// secret：RESEND_API_KEY。部署：Dashboard → Edge Functions → password-recovery → 粘贴重新 Deploy。
// 依赖表：password_reset_codes（见 0023_password_reset_codes.sql）、email_send_limits（0020）。

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;

const FROM = 'Personalities Mahjong <noreply@personalitiesmahjong.com>';
const STUDENT_ID_LENGTH = 9;
const MIN_PASSWORD = 6;
const CODE_TTL_MIN = 10;
const MAX_CODE_ATTEMPTS = 5;
const SEND_COOLDOWN_MS = 60_000;
const DAILY_SEND_CAP = 10;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });
}
function normalizeStudentId(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase();
}
async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// 发送节流：60s 冷却 + 每日上限（key = '<用途>:<学号>'，表见 0020_email_send_limits.sql）。
async function allowSend(key: string): Promise<boolean> {
  const now = Date.now();
  const today = new Date(now).toISOString().slice(0, 10);
  const { data, error: selErr } = await admin
    .from('email_send_limits')
    .select('last_sent_at, day, day_count')
    .eq('key', key)
    .maybeSingle();
  if (selErr) {
    console.warn('[send-limit] read failed, allowing', selErr.message);
    return true;
  }
  if (data) {
    if (now - new Date(data.last_sent_at).getTime() < SEND_COOLDOWN_MS) return false;
    if (data.day === today && data.day_count >= DAILY_SEND_CAP) return false;
  }
  await admin.from('email_send_limits').upsert({
    key,
    last_sent_at: new Date(now).toISOString(),
    day: today,
    day_count: data && data.day === today ? data.day_count + 1 : 1,
  }, { onConflict: 'key' });
  return true;
}

function codeEmailHtml(code: string): string {
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#2a241b">
    <h2 style="margin:0 0 12px">重設你的密碼 · Reset your password</h2>
    <p style="line-height:1.6;color:#6b5f4d">你（或有人）為你的「人格麻將」帳號申請了重設密碼。在重設頁輸入以下驗證碼，${CODE_TTL_MIN} 分鐘內有效。<br>You (or someone) requested a password reset. Enter this code on the reset page. Valid for ${CODE_TTL_MIN} minutes.</p>
    <p style="text-align:center;margin:24px 0;font-size:34px;font-weight:700;letter-spacing:10px;color:#b08a3e">${code}</p>
    <p style="font-size:12px;color:#9a8c74;line-height:1.6">若不是你本人操作，請忽略此郵件，你的密碼不會改變。<br>If you didn't request this, ignore this email — your password won't change.</p>
  </div>`;
}

// ── action=send：发码到找回邮箱（防枚举：一律 {ok:true}）──
async function handleSend(studentId: string): Promise<Response> {
  if (studentId.length !== STUDENT_ID_LENGTH) return json(200, { ok: true });
  // 限流也返回通用成功（不能让 429 变成「该学号存在」的探针）
  if (!(await allowSend(`reset:${studentId}`))) return json(200, { ok: true });

  const { data: profile } = await admin
    .from('profiles')
    .select('recovery_email')
    .eq('student_id', studentId)
    .maybeSingle();

  if (!profile) {
    console.warn('[password-recovery] no profile for student_id', studentId);
    return json(200, { ok: true });
  }
  if (!profile.recovery_email) {
    console.warn('[password-recovery] profile has no recovery_email', studentId);
    return json(200, { ok: true });
  }

  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  const code = n.toString().padStart(6, '0');
  const codeHash = await sha256(`${studentId}:${code}`);
  const expiresAt = new Date(Date.now() + CODE_TTL_MIN * 60_000).toISOString();

  const { error: upErr } = await admin
    .from('password_reset_codes')
    .upsert({ student_id: studentId, code_hash: codeHash, expires_at: expiresAt, attempts: 0 }, { onConflict: 'student_id' });
  if (upErr) {
    console.warn('[password-recovery] store code failed', upErr.message);
    return json(200, { ok: true }); // 防枚举，静默
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM,
      to: profile.recovery_email,
      subject: '重設你的密碼 · Reset your password',
      html: codeEmailHtml(code),
    }),
  }).catch((e) => {
    console.warn('[password-recovery] resend fetch threw', String(e));
    return null;
  });
  if (!res) {
    console.warn('[password-recovery] resend send failed (no response)');
  } else if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.warn('[password-recovery] resend rejected', res.status, detail);
  } else {
    console.log('[password-recovery] code sent to recovery_email', { studentId, status: res.status });
  }
  return json(200, { ok: true });
}

// ── action=verify：验码 + 改密 ──
async function handleVerify(studentId: string, code: string, password: string): Promise<Response> {
  if (studentId.length !== STUDENT_ID_LENGTH) return json(400, { error: 'invalid_student_id' });
  if (password.length < MIN_PASSWORD) return json(400, { error: 'weak_password' });
  if (!/^\d{6}$/.test(code)) return json(400, { error: 'invalid_code' });

  const { data: rc } = await admin
    .from('password_reset_codes')
    .select('code_hash, expires_at, attempts')
    .eq('student_id', studentId)
    .maybeSingle();
  if (!rc) return json(400, { error: 'code_not_found' });
  if (rc.attempts >= MAX_CODE_ATTEMPTS) return json(400, { error: 'code_locked' });
  if (new Date(rc.expires_at).getTime() < Date.now()) return json(400, { error: 'code_expired' });
  const codeHash = await sha256(`${studentId}:${code}`);
  if (codeHash !== rc.code_hash) {
    await admin.from('password_reset_codes').update({ attempts: rc.attempts + 1 }).eq('student_id', studentId);
    return json(400, { error: 'invalid_code' });
  }

  // 找到该学号的 auth 用户 id（= profiles.id）
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('student_id', studentId)
    .maybeSingle();
  if (!profile?.id) return json(400, { error: 'code_not_found' });

  const { error: pwErr } = await admin.auth.admin.updateUserById(profile.id, { password });
  if (pwErr) {
    console.warn('[password-recovery] updateUserById failed', pwErr.message);
    return json(500, { error: 'unknown', detail: pwErr.message });
  }

  // 用完即删（防重放）
  await admin.from('password_reset_codes').delete().eq('student_id', studentId);
  return json(200, { ok: true });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'bad_json' });
  }

  const studentId = normalizeStudentId(String(body.student_id ?? ''));
  const action = String(body.action ?? 'send');

  if (action === 'verify') {
    const code = String(body.code ?? '').trim();
    const password = String(body.password ?? '');
    return await handleVerify(studentId, code, password);
  }
  // 默认 / 'send'
  return await handleSend(studentId);
});
