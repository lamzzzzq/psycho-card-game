-- 忘记密码：验证码流程的临时存储「学号 → 6位码(哈希) + 过期 + 尝试次数」。2026-07-24。
-- 应用方式：Supabase Dashboard → SQL Editor 粘贴执行。
--
-- 背景：原找回密码发「重置链接」，走 admin.generateLink，链接邮件被机构邮箱过滤/没发出。
-- 改为和注册/换绑一致的「验证码」流程（已验证能秒收）：发 6 位码到找回邮箱，
-- 用户输码 + 设新密码，服务端校验码后 updateUserById 改密。
--
-- 一个学号同时只保留一个待用码（重发替换旧的，故 student_id 作主键）。
-- 只有 Edge Function(service_role) 读写；RLS 开启且无任何 policy = anon/authenticated 一律禁止。

CREATE TABLE IF NOT EXISTS password_reset_codes (
  student_id  TEXT PRIMARY KEY,
  code_hash   TEXT NOT NULL,               -- sha256(student_id + ':' + code)
  expires_at  TIMESTAMPTZ NOT NULL,
  attempts    INT NOT NULL DEFAULT 0,       -- 验错累加，超限即作废
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE password_reset_codes ENABLE ROW LEVEL SECURITY;
-- 不建任何 policy：只有 service_role（Edge Function 内）能绕过 RLS 操作。
