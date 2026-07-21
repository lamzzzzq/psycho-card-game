-- 发信限流表：send-verify-code / change-recovery-email / password-recovery 三个
-- Edge Function 此前无任何频率限制，anon key 是公开的，脚本可循环调用轰炸任意
-- 邮箱并烧掉 Resend 配额。2026-07-21。
-- 应用方式：Supabase Dashboard → SQL Editor 粘贴执行。
--
-- 每个 key（'<用途>:<学号>'，用途 = verify | change | recovery）记录最近一次
-- 发送时间和当日次数；函数内检查 60s 冷却 + 每日上限（见各函数 allowSend）。

CREATE TABLE IF NOT EXISTS email_send_limits (
  key          TEXT PRIMARY KEY,       -- '<用途>:<学号>'
  last_sent_at TIMESTAMPTZ NOT NULL,
  day          DATE NOT NULL,          -- 当日计数窗口
  day_count    INT NOT NULL DEFAULT 1
);

ALTER TABLE email_send_limits ENABLE ROW LEVEL SECURITY;
-- 不建任何 policy：只有 service_role（Edge Function 内）能读写。
