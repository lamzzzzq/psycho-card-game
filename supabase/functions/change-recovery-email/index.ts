// Edge Function: change-recovery-email —— 登录用户在 /account 改「找回邮箱」时验证新邮箱。2026-07-21。
//
// 认证态调用（前端已登录，functions.invoke 会带用户 JWT）。两个 action：
//   action='send'  { email }        → 校验、发 6 位码到新邮箱、存 email_verify_codes(按学号)
//   action='verify'{ email, code }  → 验码通过 → profiles.recovery_email=新邮箱 + verified=true
//
// 复用 email_verify_codes 表（按 student_id）。secret：RESEND_API_KEY。
// 部署：Dashboard → Deploy new function，名字 change-recovery-email。

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM = 'Personalities Mahjong <noreply@personalitiesmahjong.com>';
const CODE_TTL_MIN = 10;
const MAX_CODE_ATTEMPTS = 5;

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
function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
function codeEmailHtml(code: string): string {
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#2a241b">
    <h2 style="margin:0 0 12px">驗證你的新信箱 · Verify your new email</h2>
    <p style="line-height:1.6;color:#6b5f4d">在帳號設定頁輸入以下驗證碼以綁定這個找回信箱，${CODE_TTL_MIN} 分鐘內有效。<br>Enter this code in your account settings to set this recovery email. Valid for ${CODE_TTL_MIN} minutes.</p>
    <p style="text-align:center;margin:24px 0;font-size:34px;font-weight:700;letter-spacing:10px;color:#b08a3e">${code}</p>
  </div>`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  // 取调用者（用户 JWT）
  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  if (userErr || !userData?.user) return json(401, { error: 'unauthorized' });
  const userId = userData.user.id;

  const { data: profile } = await admin.from('profiles').select('student_id').eq('id', userId).maybeSingle();
  if (!profile) return json(400, { error: 'no_profile' });
  const studentId: string = profile.student_id;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'bad_json' });
  }
  const action = String(body.action ?? '');
  const email = String(body.email ?? '').trim().toLowerCase();
  if (!isEmail(email)) return json(400, { error: 'invalid_email' });

  // ── 发码 ──
  if (action === 'send') {
    const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
    const code = n.toString().padStart(6, '0');
    const codeHash = await sha256(`${studentId}:${code}`);
    const expiresAt = new Date(Date.now() + CODE_TTL_MIN * 60_000).toISOString();
    const { error: upErr } = await admin
      .from('email_verify_codes')
      .upsert({ student_id: studentId, email, code_hash: codeHash, expires_at: expiresAt, attempts: 0 }, { onConflict: 'student_id' });
    if (upErr) return json(500, { error: 'store_failed', detail: upErr.message });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: email, subject: '驗證碼 · Verify your email', html: codeEmailHtml(code) }),
    }).catch(() => null);
    if (!res || !res.ok) return json(502, { error: 'send_failed' });
    return json(200, { ok: true });
  }

  // ── 验码 → 更新邮箱为已验证 ──
  if (action === 'verify') {
    const code = String(body.code ?? '').trim();
    if (!/^\d{6}$/.test(code)) return json(400, { error: 'invalid_code' });
    const { data: vc } = await admin
      .from('email_verify_codes')
      .select('email, code_hash, expires_at, attempts')
      .eq('student_id', studentId)
      .maybeSingle();
    if (!vc) return json(400, { error: 'code_not_found' });
    if (vc.attempts >= MAX_CODE_ATTEMPTS) return json(400, { error: 'code_locked' });
    if (new Date(vc.expires_at).getTime() < Date.now()) return json(400, { error: 'code_expired' });
    if (vc.email !== email) return json(400, { error: 'code_email_mismatch' });
    const codeHash = await sha256(`${studentId}:${code}`);
    if (codeHash !== vc.code_hash) {
      await admin.from('email_verify_codes').update({ attempts: vc.attempts + 1 }).eq('student_id', studentId);
      return json(400, { error: 'invalid_code' });
    }
    await admin.from('profiles').update({ recovery_email: email, recovery_email_verified: true }).eq('id', userId);
    await admin.from('email_verify_codes').delete().eq('student_id', studentId);
    return json(200, { ok: true });
  }

  return json(400, { error: 'bad_action' });
});
