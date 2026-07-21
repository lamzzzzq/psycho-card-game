// Edge Function: register —— 学号注册（方案 A：学号登录 + 合成邮箱 + 注册时邮箱验证码）。
// 2026-07-21 更新：要求先通过 send-verify-code 拿到邮箱验证码，注册时校验，通过则 recovery_email_verified=true。
//
// 前端传 { student_id, password, recovery_email, code }。本函数(service_role)：
//   1. 服务端校验学号(9)/密码(≥6)/邮箱格式
//   2. 校验邮箱验证码（email_verify_codes：邮箱匹配 + 未过期 + 次数未超 + 哈希一致）
//   3. 学号查重
//   4. admin.createUser(合成邮箱, 密码, email_confirm:true)
//   5. 写 profiles（recovery_email_verified=true），删掉验证码行
//   6. 失败回滚删用户，避免孤儿
//
// 部署：Dashboard → Edge Functions → register → 粘贴本文件重新 Deploy。

import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const EMAIL_DOMAIN = 'stu.personalitiesmahjong.com';
const STUDENT_ID_LENGTH = 9;
const MIN_PASSWORD = 6;
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

// 按合成邮箱找 auth 用户（GoTrue admin 没有按邮箱查询的接口，翻页找；课堂规模够用）
async function findUserIdByEmail(email: string): Promise<string | null> {
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return null;
    const hit = data.users.find((u) => u.email?.toLowerCase() === email);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  return null;
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
  const code = String(body.code ?? '').trim();

  if (studentId.length !== STUDENT_ID_LENGTH) return json(400, { error: 'invalid_student_id' });
  if (password.length < MIN_PASSWORD) return json(400, { error: 'weak_password' });
  if (!isEmail(recoveryEmail)) return json(400, { error: 'invalid_email' });
  if (!/^\d{6}$/.test(code)) return json(400, { error: 'invalid_code' });

  // ── 校验邮箱验证码 ──
  const { data: vc } = await admin
    .from('email_verify_codes')
    .select('email, code_hash, expires_at, attempts')
    .eq('student_id', studentId)
    .maybeSingle();
  if (!vc) return json(400, { error: 'code_not_found' });
  if (vc.attempts >= MAX_CODE_ATTEMPTS) return json(400, { error: 'code_locked' });
  if (new Date(vc.expires_at).getTime() < Date.now()) return json(400, { error: 'code_expired' });
  if (vc.email !== recoveryEmail) return json(400, { error: 'code_email_mismatch' });
  const codeHash = await sha256(`${studentId}:${code}`);
  if (codeHash !== vc.code_hash) {
    await admin.from('email_verify_codes').update({ attempts: vc.attempts + 1 }).eq('student_id', studentId);
    return json(400, { error: 'invalid_code' });
  }

  // ── 学号查重 ──
  const { data: existing } = await admin.from('profiles').select('id').eq('student_id', studentId).maybeSingle();
  if (existing) return json(409, { error: 'student_id_taken' });

  // ── 建 auth 用户 ──
  const synthEmail = `${studentId.toLowerCase()}@${EMAIL_DOMAIN}`;
  let userId: string;
  let createdFresh = true;
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: synthEmail,
    password,
    email_confirm: true,
    user_metadata: { student_id: studentId },
  });
  if (created?.user) {
    userId = created.user.id;
  } else {
    // profiles 查无此学号、createUser 却撞邮箱重复 → 之前注册半途失败留下的孤儿
    // auth 用户（写 profile 失败且 deleteUser 回滚也失败 / 函数中途崩溃）。
    // 不自愈的话该学号永远 account_exists 又登不进去。自愈：找到孤儿 →
    // 重设为本次密码 → 走下面补写 profile，完成注册。
    const dup =
      createErr &&
      ((createErr as { code?: string }).code === 'email_exists' ||
        /already|registered|exists/i.test(createErr.message ?? ''));
    if (!dup) return json(409, { error: 'account_exists', detail: createErr?.message });
    const orphanId = await findUserIdByEmail(synthEmail);
    if (!orphanId) return json(409, { error: 'account_exists', detail: createErr?.message });
    const { data: orphanProfile } = await admin.from('profiles').select('id').eq('id', orphanId).maybeSingle();
    if (orphanProfile) return json(409, { error: 'account_exists' }); // 有 profile = 真已注册（学号查重竞态兜底）
    const { error: pwErr } = await admin.auth.admin.updateUserById(orphanId, {
      password,
      user_metadata: { student_id: studentId },
    });
    if (pwErr) return json(500, { error: 'unknown', detail: pwErr.message });
    userId = orphanId;
    createdFresh = false;
  }

  // ── 写 profile（邮箱已验证），失败回滚 ──
  const { error: profErr } = await admin.from('profiles').insert({
    id: userId,
    student_id: studentId,
    recovery_email: recoveryEmail,
    recovery_email_verified: true,
  });
  if (profErr) {
    if (createdFresh) await admin.auth.admin.deleteUser(userId);
    return json(409, { error: 'student_id_taken', detail: profErr.message });
  }

  // 清掉验证码
  await admin.from('email_verify_codes').delete().eq('student_id', studentId);

  return json(200, { ok: true, student_id: studentId });
});
