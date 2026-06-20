-- 测评数据导出视图：latest 取数（覆盖语义）+ 覆盖历史标示（2026-06-20）。
-- 应用方式：Supabase Dashboard → SQL Editor 粘贴执行。老师在后台（service role）读此视图导出。
--
-- 产品决策：同一学号多次提交 → 以「最新一行」为准（覆盖旧记录）。
-- 但导出时要能一眼看出「这个学号被覆盖过」，故附带历史标示字段。
--
-- 表是 append-only（只增不改），所以「覆盖」= 取最新行；旧行保留作审计/追溯。
-- 本视图每个 student_id 只出一行（官方结果 = 最新），并附：
--   submission_count      该学号一共提交过几次
--   has_overwrite_history 是否被覆盖过（次数 > 1 即 true）—— 导出时的清楚标示
--   first_submitted_at    首次提交时间
--   latest_submitted_at   本次（官方）提交时间
--   sources_history       按时间排列的来源序列，如 {manual,assessment,assessment}
--   overwritten_count     被覆盖（作废）的旧行数 = submission_count - 1

-- ⚠️ security_invoker=true：视图按「调用者」身份读底表，而非视图属主。
--   否则视图会绕过 assessment_results 的 RLS，加上 Supabase 默认给 anon 的读权 →
--   anon 能直接读到全部学号明细（泄露）。设为 invoker 后：anon 受 RLS 拦截看 0 行；
--   老师 service_role / postgres 绕过 RLS 仍看全部。
CREATE OR REPLACE VIEW assessment_results_official
WITH (security_invoker = true) AS
SELECT DISTINCT ON (ar.student_id)
  ar.student_id,
  ar.source              AS latest_source,
  ar.scores              AS latest_scores,
  ar.answers             AS latest_answers,
  ar.answered_count      AS latest_answered_count,
  ar.submitted_at        AS latest_submitted_at,
  agg.submission_count,
  (agg.submission_count > 1)        AS has_overwrite_history,
  (agg.submission_count - 1)        AS overwritten_count,
  agg.first_submitted_at,
  agg.sources_history
FROM assessment_results ar
JOIN (
  SELECT
    student_id,
    COUNT(*)                                   AS submission_count,
    MIN(submitted_at)                          AS first_submitted_at,
    array_agg(source ORDER BY submitted_at)    AS sources_history
  FROM assessment_results
  GROUP BY student_id
) agg ON agg.student_id = ar.student_id
ORDER BY ar.student_id, ar.submitted_at DESC;  -- DISTINCT ON 每个学号取最新一行 = 官方结果

-- 防御性显式回收：anon / authenticated 不得读此视图（双保险，配合上面的 security_invoker）。
REVOKE ALL ON public.assessment_results_official FROM anon, authenticated;

-- 仅后台（service role / 表 owner）可读：不授予 anon，避免泄露明细。
-- 全量审计（含被覆盖的旧行）仍直接查 assessment_results。
--
-- 导出示例（老师后台）：
--   select * from assessment_results_official order by has_overwrite_history desc, student_id;
--   -- 只看被覆盖过的学号：
--   select student_id, submission_count, sources_history, first_submitted_at, latest_submitted_at
--   from assessment_results_official where has_overwrite_history;
