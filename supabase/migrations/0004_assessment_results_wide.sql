-- 测评数据改宽表：一次测评 = 一行（答案 JSON + 分数 JSON），替代旧的逐题长表。
-- 2026-06-10。应用方式：Supabase Dashboard → SQL Editor 粘贴执行。
--
-- 隐私同旧表：anon 只能 INSERT、无 SELECT（读不到）；只增不改（append-only、防篡改）。
-- 老师在后台（service role）读全部明细。

CREATE TABLE IF NOT EXISTS assessment_results (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id     TEXT NOT NULL,
  device_token   TEXT,                               -- 弱提示：本机随机 token
  source         TEXT NOT NULL DEFAULT 'assessment', -- 'assessment'（答 60 题）| 'manual'（手动填分）
  answers        JSONB NOT NULL DEFAULT '{}'::jsonb, -- {"1":4,"2":3,...,"60":5}（手动填分时为空 {}）
  scores         JSONB NOT NULL,                     -- {"O":3.2,"C":4.1,"E":2.8,"A":3.5,"N":3.0}
  answered_count INTEGER NOT NULL DEFAULT 0,         -- 实际作答题数（完整测评 = 60）
  submitted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ares_student   ON assessment_results(student_id);
CREATE INDEX IF NOT EXISTS idx_ares_submitted ON assessment_results(submitted_at DESC);

-- 同学号重测/换设备各写一行（不去重），分析时再按 student_id + 取最早/最新一条。
ALTER TABLE assessment_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ares_anon_insert ON assessment_results;
CREATE POLICY ares_anon_insert ON assessment_results
  FOR INSERT TO anon WITH CHECK (true);

-- 弃用旧的逐题长表（结构换宽表后不再写入它）。
DROP TABLE IF EXISTS assessment_responses;

-- 取数示例（老师后台，service role）：
--   select student_id, scores, answered_count, submitted_at
--   from assessment_results where source = 'assessment' order by submitted_at;
--   -- 看某题：select student_id, answers->>'5' as q5 from assessment_results;
