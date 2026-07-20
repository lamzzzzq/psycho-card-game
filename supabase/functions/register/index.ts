// Edge Function: register —— 学号注册（方案 A：学号登录 + 合成邮箱）。2026-07-20。
//
// 前端只收集 { student_id, password, recovery_email }，POST 到这里。
// 本函数用 service_role（Supabase 自动注入，绕过 RLS）：
//   1. 服务端再校验一遍学号(9位) / 密码(≥6) / 邮箱格式
//   2. 学号查重（profiles.student_id 唯一）
//   3. admin.createUser(合成邮箱, 密码, email_confirm:true)  —— 合成邮箱 = <学号>@stu.personalitiesmahjong.com
//   4. 写 profiles（recovery_email 先存为未验证）
//   5. 第 4 步失败则回滚删掉刚建的 auth 用户，避免孤儿账号
//
// 注：recovery_email 此时 verified=false。找回密码功能本身不要求先验证；
// 「验证找回邮箱」是后续增强，届时用 Resend 发验证信。
//
// 部署：Supabase Dashboard → Edge Functions → Deploy new function，名字填 register，粘贴本文件。

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const EMAIL_DOMAIN = 'stu.personalitiesmahjong.com'; // 合成邮箱域名（纯占位、不收信）
const STUDENT_ID_LENGTH = 9;
const MIN_PASSWORD = 6;

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

// 与前端 normalizeStudentId 一致：去空白 + 全大寫（大小写不分）
function normalizeStudentId(raw: string): string {
  return raw.replace(/\s+/g, '').toUpperCase();
}
function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
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
  const password = String(body.password ?? '');
  const recoveryEmail = String(body.recovery_email ?? '').trim().toLowerCase();

  // ── 服务端校验（前端也会校一遍，这里是最后一道） ──
  if (studentId.length !== STUDENT_ID_LENGTH) return json(400, { error: 'invalid_student_id' });
  if (password.length < MIN_PASSWORD) return json(400, { error: 'weak_password' });
  if (!isEmail(recoveryEmail)) return json(400, { error: 'invalid_email' });

  const syntheticEmail = `${studentId.toLowerCase()}@${EMAIL_DOMAIN}`;

  // ── 学号查重 ──
  const { data: existing, error: checkErr } = await admin
    .from('profiles')
    .select('id')
    .eq('student_id', studentId)
    .maybeSingle();
  if (checkErr) return json(500, { error: 'check_failed', detail: checkErr.message });
  if (existing) return json(409, { error: 'student_id_taken' });

  // ── 建 auth 用户（合成邮箱，直接标记已确认） ──
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: syntheticEmail,
    password,
    email_confirm: true,
    user_metadata: { student_id: studentId },
  });
  if (createErr || !created?.user) {
    // 合成邮箱已存在等 → 视为学号已注册
    return json(409, { error: 'account_exists', detail: createErr?.message });
  }

  // ── 写 profile（失败则回滚删用户，防孤儿） ──
  const { error: profErr } = await admin.from('profiles').insert({
    id: created.user.id,
    student_id: studentId,
    recovery_email: recoveryEmail,
    recovery_email_verified: false,
  });
  if (profErr) {
    await admin.auth.admin.deleteUser(created.user.id);
    // 唯一索引撞车 = 并发下学号被别人抢先注册
    return json(409, { error: 'student_id_taken', detail: profErr.message });
  }

  return json(200, { ok: true, student_id: studentId });
});
