-- 收紧 assessment_results 写入：从「anon 可插任意行」改为「仅登录用户、且 user_id = 自己」。2026-07-21。
-- 应用方式：Supabase Dashboard → SQL Editor 粘贴执行。
--
-- ⚠️ 顺序要求：必须在【带 user_id 的写入代码上线之后】再跑本步。
--    否则旧代码(insert 不带 user_id)的写入会被新策略拒绝 → 丢测评数据。
--    （0015 已加 user_id 列且不改写入策略，就是为了留出这个安全的上线窗口。）
--
-- 效果：匿名不能再写；登录用户只能插入 user_id = 自己 的行，无法伪造他人学号的记录。

DROP POLICY IF EXISTS ares_anon_insert ON assessment_results;

CREATE POLICY ares_auth_insert ON assessment_results
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
