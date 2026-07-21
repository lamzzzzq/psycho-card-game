// Edge Function: send-verify-code —— 注册前把 6 位验证码发到邮箱。2026-07-21。
//
// 前端传 { student_id, email }。本函数：
//   1. 校验学号(9)/邮箱格式；学号已注册则直接 409（早提示）
//   2. 生成 6 位码，哈希后连同邮箱/过期(10min)写入 email_verify_codes（按学号 upsert，替换旧码）
//   3. Resend 把明文码发到该邮箱
// 注册时由 register 函数校验此码（见 register/index.ts）。
//
// secret：RESEND_API_KEY。部署：Dashboard → Deploy new function，名字 send-verify-code。

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM = 'Personalities Mahjong <noreply@personalitiesmahjong.com>';
const STUDENT_ID_LENGTH = 9;
const CODE_TTL_MIN = 10;
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
function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
// 发送节流：60s 冷却 + 每日上限（key = '<用途>:<学号>'，表见 0020_email_send_limits.sql）。
// 读-改-写非原子，并发下可能多放行一两次 —— 对防邮件轰炸/烧配额足够。
// 表读失败（如 migration 未跑）放行并记日志：限流失效好过发信全挂。
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
    <h2 style="margin:0 0 12px">你的驗證碼 · Your verification code</h2>
    <p style="line-height:1.6;color:#6b5f4d">在「人格麻將」註冊頁輸入以下驗證碼，${CODE_TTL_MIN} 分鐘內有效。<br>Enter this code on the Personalities Mahjong sign-up page. Valid for ${CODE_TTL_MIN} minutes.</p>
    <p style="text-align:center;margin:24px 0;font-size:34px;font-weight:700;letter-spacing:10px;color:#b08a3e">${code}</p>
    <p style="font-size:12px;color:#9a8c74;line-height:1.6">若不是你本人操作，請忽略此郵件。<br>If you didn't request this, ignore this email.</p>
  </div>`;
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
  const email = String(body.email ?? '').trim().toLowerCase();
  if (studentId.length !== STUDENT_ID_LENGTH) return json(400, { error: 'invalid_student_id' });
  if (!isEmail(email)) return json(400, { error: 'invalid_email' });

  // 学号已注册 → 早提示（注册页可引导去登录/找回）
  const { data: existing } = await admin.from('profiles').select('id').eq('student_id', studentId).maybeSingle();
  if (existing) return json(409, { error: 'student_id_taken' });

  // 限流：60s 冷却 + 每日上限，防脚本轰炸任意邮箱
  if (!(await allowSend(`verify:${studentId}`))) return json(429, { error: 'too_many_requests' });

  // 6 位码
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  const code = n.toString().padStart(6, '0');
  const codeHash = await sha256(`${studentId}:${code}`);
  const expiresAt = new Date(Date.now() + CODE_TTL_MIN * 60_000).toISOString();

  const { error: upErr } = await admin
    .from('email_verify_codes')
    .upsert({ student_id: studentId, email, code_hash: codeHash, expires_at: expiresAt, attempts: 0 }, { onConflict: 'student_id' });
  if (upErr) return json(500, { error: 'store_failed', detail: upErr.message });

  // 发信
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: email, subject: '驗證碼 · Your code', html: codeEmailHtml(code) }),
  }).catch(() => null);
  if (!res || !res.ok) return json(502, { error: 'send_failed' });

  return json(200, { ok: true });
});
