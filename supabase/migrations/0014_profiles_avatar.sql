-- 账号头像：给 profiles 加 avatar（emoji），供账号入口徽标 + /account 展示。2026-07-21。
-- 应用方式：Supabase Dashboard → SQL Editor 粘贴执行。
-- 默认 😀（= src/data/avatars.ts 的 DEFAULT_AVATAR）；用户在 /account 里改。
-- 本人可改自己（已有 profiles_update_own 策略覆盖；student_id 仍由 trigger 冻结）。

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar TEXT NOT NULL DEFAULT '😀';
