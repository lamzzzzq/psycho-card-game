-- 收紧 assessment_results 写入：从「只校验 user_id」改为「user_id 和 student_id 都必须是自己」。2026-07-29。
-- 应用方式：Supabase Dashboard → SQL Editor 粘贴执行。
--
-- 背景（0016 的洞）：原策略只有 WITH CHECK (user_id = auth.uid())，student_id 完全不校验。
-- 任何登录用户都可以插入一行 user_id=自己、student_id=别人学号 的记录。后果有两个：
--   1) 数据污染：研究数据里出现归属错误的测评行，且表是 append-only 删不掉。
--   2) 显示篡改：get_scores_by_student_id 取 ORDER BY submitted_at DESC LIMIT 1，
--      伪造行是最新的 → 受害者本人打开报告页看到的就是伪造分数。
--
-- 修法：把 student_id 也钉到调用者自己的 profile 上，与 0015/0024 的读取闸门同一套逻辑。
--
-- ⚠️ 执行前先跑「前置核查」，确认现网没有 student_id 与 profile 不符的历史写入路径。
--    若有残留（例如早期匿名写入的行），它们不受影响（策略只管新写入），但要先弄清成因，
--    否则上线后那条路径会开始静默失败、丢测评数据。

-- ── 前置核查（只读，先单独跑这一段看结果）──
-- 期望：0 行。若有行，说明存在 student_id ≠ 账号学号 的写入，先查清再继续。
--
--   SELECT ar.id, ar.student_id, p.student_id AS profile_student_id, ar.model, ar.submitted_at
--   FROM assessment_results ar
--   JOIN profiles p ON p.id = ar.user_id
--   WHERE ar.user_id IS NOT NULL
--     AND ar.student_id IS DISTINCT FROM p.student_id
--   ORDER BY ar.submitted_at DESC;

-- ── 收紧写入策略 ──
DROP POLICY IF EXISTS ares_auth_insert ON assessment_results;

CREATE POLICY ares_auth_insert ON assessment_results
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND student_id = (SELECT student_id FROM profiles WHERE id = auth.uid())
  );

-- 验证（用普通登录用户的 session 跑，不要用 service_role —— service_role 绕过 RLS）：
--   正常提交自己的测评 → 成功
--   把 student_id 改成别人的再提交 → 应报 42501 new row violates row-level security policy
