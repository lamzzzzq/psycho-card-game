-- 单会话：给 profiles 记「当前活跃设备 + 活跃时间」，用于登录冲突检测 + 顶号。2026-07-22。
-- 应用方式：Supabase Dashboard → SQL Editor 粘贴执行。
--
-- active_device：占用该账号的设备 token（前端 localStorage 随机 uuid）。
-- active_at    ：该设备最近心跳时间（判断「其它设备是否近期活跃」）。
-- 本人可改自己（profiles_update_own 已覆盖；student_id 仍由 trigger 冻结）。

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_device TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_at TIMESTAMPTZ;
