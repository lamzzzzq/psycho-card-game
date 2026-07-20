-- 账号系统基础：profiles 表（方案 A = 学号登录 + 合成邮箱）。2026-07-20。
-- 应用方式：Supabase Dashboard → SQL Editor 粘贴执行。
--
-- 背景：上 Supabase Auth。学号做登录名，但 GoTrue 的账号钥匙必须是 email，
-- 所以每个账号有一个「合成邮箱」= <student_id>@stu.personalitiesmahjong.com（幕后、不收信、学生无感）。
-- profiles 把 auth.users(id) ↔ 学号 ↔ 找回邮箱 关联起来。
--
-- 注册/找回都走 Edge Function（service_role，绕过 RLS）：
--   注册    = admin.createUser(合成邮箱, 密码, email_confirm:true) → insert profiles
--   找回    = 按 student_id 查 recovery_email → admin.generateLink(recovery) → Resend 发信
-- 所以这里 anon/authenticated 都【不能】INSERT/DELETE profiles，只有本人能读/改自己（且学号不可改）。

CREATE TABLE IF NOT EXISTS profiles (
  id                      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id              TEXT NOT NULL,
  recovery_email          TEXT,
  recovery_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 一个学号一个账号
CREATE UNIQUE INDEX IF NOT EXISTS uq_profiles_student_id ON profiles(student_id);
-- 找回时按 recovery_email 反查（防枚举/去重也用得上）
CREATE INDEX IF NOT EXISTS idx_profiles_recovery_email ON profiles(recovery_email);

-- ── 学号不可改：注册后冻结 student_id ──
CREATE OR REPLACE FUNCTION protect_profile_student_id()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.student_id IS DISTINCT FROM OLD.student_id THEN
    RAISE EXCEPTION 'student_id is immutable';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_protect_student_id ON profiles;
CREATE TRIGGER trg_protect_student_id
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION protect_profile_student_id();

-- ── RLS：本人可读/改自己；无 anon/authenticated 的 INSERT/DELETE（那些只走 Edge Function） ──
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON profiles;
CREATE POLICY profiles_select_own ON profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- 本人可改自己（用于换/验证 recovery_email）；student_id 由上面的 trigger 冻结
DROP POLICY IF EXISTS profiles_update_own ON profiles;
CREATE POLICY profiles_update_own ON profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 说明：没有 INSERT / DELETE 策略 = anon 与 authenticated 都不能建/删 profile。
-- service_role（Edge Function 内）绕过 RLS，负责注册建号与销号。
