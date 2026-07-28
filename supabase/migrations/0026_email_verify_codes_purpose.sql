-- email_verify_codes 加 purpose 列：把「注册验证」与「换绑找回邮箱」两条流程显式分开。2026-07-29。
-- 应用方式：Supabase Dashboard → SQL Editor 粘贴执行。
--
-- 背景：这张表被两个 Edge Function 共用，都按 student_id upsert：
--   send-verify-code       （注册前发码，未登录可调）
--   change-recovery-email  （换绑找回邮箱，要 JWT）
-- 目前不会串，靠的是一个【隐式】前提：send-verify-code 对已注册学号直接返 409，
-- 所以两者写入的 student_id 空间不重叠。逻辑成立，但这个安全性没有写在任何约束里 ——
-- 哪天 send-verify-code 放宽了那个 409（例如支持「重发」），跨用途误用立刻成立。
--
-- 这里把前提显式化：写入带 purpose，验码时校验 purpose 必须匹配，不匹配一律拒绝。
--
-- 刻意不改主键（仍是 student_id 单列）：改成 (student_id, purpose) 复合主键的话，
-- Edge Function 的 upsert onConflict 也得同步改，migration 与 function 部署必须严格
-- 按序，中间任一步错位就会静默丢码。加一列 + 代码里校验能达到同样的防串效果，
-- 且向后兼容（旧版 function 不写 purpose 也不会报错，走 DEFAULT）。

ALTER TABLE email_verify_codes
  ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'register';

COMMENT ON COLUMN email_verify_codes.purpose IS
  '验证码用途：register（注册）| change-email（换绑找回邮箱）。验码时必须匹配，防跨流程误用。';

-- 存量行不用管：验证码 TTL 只有 10 分钟，跑完这条 migration 时早已过期。
