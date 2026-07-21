-- 修 bug：authenticated 角色缺 profiles 的 UPDATE 授权（42501 permission denied for table profiles），
-- 导致登录用户改自己 profiles 行全部 403：头像保存、找回邮箱(客户端)、单会话 claim/心跳都写不进。2026-07-22。
-- 应用方式：Supabase Dashboard → SQL Editor 粘贴执行。
--
-- 只加表级 UPDATE 权限；具体「只能改自己、student_id 不可改」仍由 RLS(profiles_update_own) + trigger 保护。

GRANT SELECT, UPDATE ON profiles TO authenticated;
