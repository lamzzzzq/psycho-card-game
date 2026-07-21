-- 堵洞：测评分数读取从「传学号谁都能查」收紧为「仅登录本人可查自己」。2026-07-21。
-- 应用方式：Supabase Dashboard → SQL Editor 粘贴执行。
--
-- 背景：0012 的 get_scores_by_student_id / 0009 的 student_id_exists 是 SECURITY DEFINER，
-- 且授权给 anon —— 任何人输入某学号即可读到该学号的五维分数（无门槛）。上了账号系统后堵掉：
--   通过 profiles 桥接：只有【登录用户】且【该学号就是自己账号的学号】时才返回，否则空/false。
-- 安全性靠 auth.uid()（SECURITY DEFINER 内仍读调用者 JWT）+ profiles 反查，避免横向越权。
--
-- 顺带给 assessment_results 加 user_id（绑定到账号，供分析 + 后续收紧写入）。本步仅加列(可空)，
-- 不改写入策略（写入收紧留待代码上线带 user_id 后的下一步），确保对现网零破坏。

-- ── 1) user_id 列（可空，绑定账号）──
ALTER TABLE assessment_results ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_ares_user ON assessment_results(user_id);

-- ── 2) student_id_exists：仅登录本人可查自己的学号是否有记录 ──
CREATE OR REPLACE FUNCTION public.student_id_exists(p_student_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM assessment_results ar
    WHERE ar.student_id = p_student_id
      -- 越权闸门：p_student_id 必须等于调用者自己账号的学号，否则恒 false
      AND p_student_id = (SELECT student_id FROM profiles WHERE id = auth.uid())
  );
$$;
REVOKE ALL ON FUNCTION public.student_id_exists(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.student_id_exists(TEXT) FROM anon;      -- 撤销匿名执行
GRANT EXECUTE ON FUNCTION public.student_id_exists(TEXT) TO authenticated;

-- ── 3) get_scores_by_student_id：仅登录本人可取自己学号的最新分数 ──
CREATE OR REPLACE FUNCTION public.get_scores_by_student_id(p_student_id TEXT)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ar.scores
  FROM assessment_results ar
  WHERE ar.student_id = p_student_id
    AND p_student_id = (SELECT student_id FROM profiles WHERE id = auth.uid())
  ORDER BY ar.submitted_at DESC
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_scores_by_student_id(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_scores_by_student_id(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_scores_by_student_id(TEXT) TO authenticated;

-- 说明：匿名调用 auth.uid() 为 null → 闸门恒 false / 空。别人的学号 ≠ 自己 → 同样查不到。洞已堵。
