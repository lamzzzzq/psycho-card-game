-- Restore 功能：按学号取回「最新一次测评」的五维分数（2026-07-02）。
-- 应用方式：Supabase Dashboard → SQL Editor 粘贴执行。
--
-- 背景：assessment_results 表 anon 只能 INSERT、无 SELECT（隐私、append-only）。
-- 学生换设备后想「恢复」自己的分数而不用重做，需要一条受控读回路径。
-- 这个 SECURITY DEFINER 函数只回传该学号【最新一行】的 scores JSONB（O/C/E/A/N），
-- 不返回任何答题明细(answers)，把暴露面降到最小。
--
-- 隐私权衡（用户已确认接受，课堂工具）：任何人输入某学号即可读到该学号的五维分数
-- （无 PIN）。若日后要收紧，可在此加校验（device_token / PIN / 生日）。

CREATE OR REPLACE FUNCTION public.get_scores_by_student_id(p_student_id TEXT)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT scores
  FROM assessment_results
  WHERE student_id = p_student_id
    AND source = 'assessment'   -- 只恢复真正答过题的完整记录（手动填分不算）
  ORDER BY submitted_at DESC     -- 取最新一次
  LIMIT 1;
$$;

-- 只授予 anon 执行权限（不开放表读取）
REVOKE ALL ON FUNCTION public.get_scores_by_student_id(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_scores_by_student_id(TEXT) TO anon;
