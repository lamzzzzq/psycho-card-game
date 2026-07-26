-- HEXACO 测评接入宽表 assessment_results：加 model 列区分量表，RPC 加 p_model 参数。2026-07-27。
-- 应用方式：Supabase Dashboard → SQL Editor 粘贴执行。
--
-- 背景：HEXACO(6 维 H/E/X/A/C/O) 与大五(5 维 O/C/E/A/N) 复用同一张宽表，靠 model 列区分：
--   'big-five'（默认，含全部历史行）| 'hexaco'。
-- scores JSONB 形状随 model 不同（大五 O/C/E/A/N；HEXACO H/E/X/A/C/O）。
-- 写入策略沿用 0016（authenticated 且 user_id = auth.uid()），HEXACO 行只是多带 model='hexaco'。
--
-- RPC 改造要点：给 student_id_exists / get_scores_by_student_id 加 p_model TEXT DEFAULT 'big-five'，
--   并按 model 过滤。旧的单参调用（PostgREST 只传 p_student_id）→ 默认 'big-five'，行为不变。
--   ⚠️ 必须先 DROP 旧的单参签名，否则单参调用会在两个重载间歧义报错。
--   自我闸门（p_student_id 必须等于调用者自己账号学号）沿用 0015，防横向越权。

-- ── 1) model 列（NOT NULL DEFAULT 'big-five'：现有行自动回填为大五）──
ALTER TABLE assessment_results ADD COLUMN IF NOT EXISTS model TEXT NOT NULL DEFAULT 'big-five';
CREATE INDEX IF NOT EXISTS idx_ares_student_model ON assessment_results(student_id, model);

-- ── 2) student_id_exists(p_student_id, p_model='big-five')：仅登录本人可查自己该量表是否有记录 ──
DROP FUNCTION IF EXISTS public.student_id_exists(TEXT);
CREATE OR REPLACE FUNCTION public.student_id_exists(p_student_id TEXT, p_model TEXT DEFAULT 'big-five')
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM assessment_results ar
    WHERE ar.student_id = p_student_id
      AND ar.model = p_model
      -- 越权闸门：p_student_id 必须等于调用者自己账号的学号，否则恒 false
      AND p_student_id = (SELECT student_id FROM profiles WHERE id = auth.uid())
  );
$$;
REVOKE ALL ON FUNCTION public.student_id_exists(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.student_id_exists(TEXT, TEXT) TO authenticated;

-- ── 3) get_scores_by_student_id(p_student_id, p_model='big-five')：仅登录本人取自己该量表最新分数 ──
DROP FUNCTION IF EXISTS public.get_scores_by_student_id(TEXT);
CREATE OR REPLACE FUNCTION public.get_scores_by_student_id(p_student_id TEXT, p_model TEXT DEFAULT 'big-five')
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT scores
  FROM assessment_results ar
  WHERE ar.student_id = p_student_id
    AND ar.model = p_model
    -- 自我闸门：只能取自己账号学号的分数
    AND p_student_id = (SELECT student_id FROM profiles WHERE id = auth.uid())
  ORDER BY submitted_at DESC   -- 取最新一次
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.get_scores_by_student_id(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_scores_by_student_id(TEXT, TEXT) TO authenticated;
