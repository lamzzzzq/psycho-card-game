-- 堵洞：profiles_update_own 是整行 UPDATE 权限，trigger 只冻结了 student_id ——
-- 登录用户可在控制台直接 update({recovery_email: 任意邮箱, recovery_email_verified: true})，
-- 完全绕过 change-recovery-email 的两步验证码，verified 标记不可信，还能配合
-- password-recovery 给任意第三方邮箱投递重置邮件。2026-07-21。
-- 应用方式：Supabase Dashboard → SQL Editor 粘贴执行。
--
-- 修法：列级权限。authenticated 只保留 avatar 一列的 UPDATE（/account 改头像是
-- 前端唯一合法的直改），recovery_email / recovery_email_verified 只能走
-- Edge Function（service_role 不受此限制）。行级策略 profiles_update_own 不动，
-- 仍然只能改自己那一行。

REVOKE UPDATE ON profiles FROM anon, authenticated;
GRANT UPDATE (avatar) ON profiles TO authenticated;
