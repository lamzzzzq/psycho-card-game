-- 注册时邮箱验证码：临时存储「学号 → 6位码(哈希) + 邮箱 + 过期 + 尝试次数」。2026-07-21。
-- 应用方式：Supabase Dashboard → SQL Editor 粘贴执行。
--
-- 一个学号同时只保留一个待验证码（重发替换旧的，故 student_id 作主键）。
-- 只有 Edge Function(service_role) 读写；RLS 开启且无任何 policy = anon/authenticated 一律禁止。

CREATE TABLE IF NOT EXISTS email_verify_codes (
  student_id  TEXT PRIMARY KEY,
  email       TEXT NOT NULL,
  code_hash   TEXT NOT NULL,               -- sha256(student_id + ':' + code)
  expires_at  TIMESTAMPTZ NOT NULL,
  attempts    INT NOT NULL DEFAULT 0,       -- 验错累加，超限即作废
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE email_verify_codes ENABLE ROW LEVEL SECURITY;
-- 不建任何 policy：只有 service_role（Edge Function 内）能绕过 RLS 操作。
