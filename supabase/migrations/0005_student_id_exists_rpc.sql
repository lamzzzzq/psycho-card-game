-- 学号重复检测 RPC（2026-06-15）。应用方式：Supabase Dashboard → SQL Editor 粘贴执行。
--
-- 背景：assessment_results 表 anon 只能 INSERT、无 SELECT（隐私），前端无法直接查学号是否存在。
-- 这个 SECURITY DEFINER 函数只回传「该学号是否已有测评记录」的布尔值，不暴露任何分数/答案明细。
-- 用途：输入页提示「此学号已被使用」，但允许用户坚持使用（不强制拦截）。
--
-- 隐私权衡：anon 可逐个枚举学号来探知「谁完成过测评」（仅参与与否，非分数）。课堂工具可接受。

CREATE OR REPLACE FUNCTION public.student_id_exists(p_student_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM assessment_results
    WHERE student_id = p_student_id
      AND source = 'assessment'   -- 只算真正答过题的，手动填分不计入重复
  );
$$;

-- 只授予 anon 执行权限（不开放表读取）
REVOKE ALL ON FUNCTION public.student_id_exists(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.student_id_exists(TEXT) TO anon;
