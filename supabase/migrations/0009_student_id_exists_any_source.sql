-- 学号重复检测：改为「不分来源」（2026-06-20）。应用方式：Supabase Dashboard → SQL Editor 粘贴执行。
--
-- 背景：0005 版本的 student_id_exists 只数 source='assessment'（答满 50 题），
-- 故意排除了 'manual'（手动填分）。但产品决策已改为「只要提交过就算有记录」——
-- 不管答满 50 题、还是在测评页/PVP 大厅手动填了五大人格分数，都算一条记录，
-- 之后再有人用这个学号测评都要弹「已有记录，完成即覆盖」提示。
--
-- 故这里去掉 source 过滤：任何一行（assessment 或 manual）都视为「已有记录」。
-- 隐私权衡不变：SECURITY DEFINER 只回布尔，不暴露分数/答案明细。

CREATE OR REPLACE FUNCTION public.student_id_exists(p_student_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM assessment_results
    WHERE student_id = p_student_id
    -- 不再按 source 过滤：assessment 与 manual 都算「有记录」。
  );
$$;

-- 权限不变：只给 anon 执行权（不开放表读取）。
REVOKE ALL ON FUNCTION public.student_id_exists(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.student_id_exists(TEXT) TO anon;
