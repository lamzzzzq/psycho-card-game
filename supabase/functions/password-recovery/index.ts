// Edge Function: password-recovery —— 忘记密码：按学号把重置链接发到「找回邮箱」。2026-07-21。
//
// 前端只传 { student_id }。本函数用 service_role：
//   1. 按学号查 profiles.recovery_email
//   2. admin.generateLink({type:'recovery', email:合成邮箱}) 拿到重置链接（redirectTo=/reset-password）
//   3. 用 Resend 把链接发到 recovery_email
//   4. 无论学号是否存在，一律返回 {ok:true}（防枚举：不泄露某学号是否注册过）
//
// 需要的 secret：RESEND_API_KEY（Supabase → Edge Functions → Secrets）。
// 部署：Supabase Dashboard → Edge Functions → Deploy new function，名字 password-recovery，粘贴本文件。

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;

const FROM = 'Personalities Mahjong <noreply@personalitiesmahjong.com>';
const RESET_REDIRECT = 'https://personalitiesmahjong.com/reset-password';
const EMAIL_DOMAIN = 'stu.personalitiesmahjong.com';
const STUDENT_ID_LENGTH = 9;

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}
function normalizeStudentId(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase();
}

function emailHtml(link: string): string {
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#2a241b">
    <h2 style="margin:0 0 12px">重設你的密碼 · Reset your password</h2>
    <p style="line-height:1.6;color:#6b5f4d">你（或有人）為你的「人格麻將」帳號申請了重設密碼。點下面的按鈕設定新密碼，連結一段時間後會失效。</p>
    <p style="line-height:1.6;color:#6b5f4d">You (or someone) requested a password reset for your Personalities Mahjong account. Click below to set a new password. This link expires after a while.</p>
    <p style="text-align:center;margin:28px 0">
      <a href="${link}" style="background:#b08a3e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:600;display:inline-block">重設密碼 · Reset password</a>
    </p>
    <p style="font-size:12px;color:#9a8c74;line-height:1.6">若不是你本人操作，請忽略此郵件，你的密碼不會改變。<br>If you didn't request this, ignore this email — your password won't change.</p>
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
  // 学号格式不对：也返回通用成功（不泄露），直接结束
  if (studentId.length !== STUDENT_ID_LENGTH) return json(200, { ok: true });

  // 查 recovery_email
  const { data: profile } = await admin
    .from('profiles')
    .select('recovery_email')
    .eq('student_id', studentId)
    .maybeSingle();

  // 有账号 + 有找回邮箱才真正发信；否则静默（防枚举）
  if (profile?.recovery_email) {
    const syntheticEmail = `${studentId.toLowerCase()}@${EMAIL_DOMAIN}`;
    const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
      type: 'recovery',
      email: syntheticEmail,
      options: { redirectTo: RESET_REDIRECT },
    });

    const actionLink = linkData?.properties?.action_link;
    if (!linkErr && actionLink) {
      // 通过 Resend 发到找回邮箱
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM,
          to: profile.recovery_email,
          subject: '重設你的密碼 · Reset your password',
          html: emailHtml(actionLink),
        }),
      }).catch((e) => console.warn('[password-recovery] resend send failed', e));
    } else if (linkErr) {
      console.warn('[password-recovery] generateLink failed', linkErr.message);
    }
  }

  // 一律通用成功
  return json(200, { ok: true });
});
