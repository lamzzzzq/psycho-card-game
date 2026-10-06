-- 局末知识小测成绩入库（课堂数据）。2026-10-07。
-- 一次答完 4 题 = 1 行；「再測一次」再答完 = 再 1 行（attempt 区分先后）。中途「離開」不落库。
-- 写入：authenticated only，user_id / student_id 钉死为本人（同 0025 assessment_results）。
-- 读取：不给 anon/authenticated SELECT，老师经 service_role（导出脚本）读。
-- append-only：无 UPDATE/DELETE 策略。

CREATE TABLE IF NOT EXISTS quiz_results (
  id            UUID PRIMARY KEY,                          -- 客户端生成：补传撞 23505 = 早已写过
  student_id    TEXT NOT NULL,
  user_id       UUID NOT NULL,
  model         TEXT NOT NULL CHECK (model IN ('big-five', 'hexaco', 'sd4')),
  mode          TEXT NOT NULL CHECK (mode IN ('single', 'pvp')),
  room_code     TEXT,                                      -- PVP 房号（单机 null），可与 *_game_sessions.room_code 按时间对上
  attempt       INTEGER NOT NULL DEFAULT 1,                -- 同一结算页第几次作答
  score         INTEGER NOT NULL,
  total         INTEGER NOT NULL,
  items         JSONB NOT NULL,                            -- [{source, question, picked, answer, correct}]（英文原文作题目标识）
  locale        TEXT,
  submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- 防手搓离谱行（学生只能改自己的分，风险低；挡住明显造假）
  CONSTRAINT quiz_sane CHECK (
    total BETWEEN 1 AND 10 AND score BETWEEN 0 AND total
    AND jsonb_typeof(items) = 'array' AND jsonb_array_length(items) = total
  )
);
CREATE INDEX IF NOT EXISTS idx_quiz_student ON quiz_results(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_submitted ON quiz_results(submitted_at DESC);

ALTER TABLE quiz_results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS quiz_auth_insert ON quiz_results;
CREATE POLICY quiz_auth_insert ON quiz_results
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND student_id = (SELECT student_id FROM profiles WHERE id = auth.uid())
  );

REVOKE ALL ON quiz_results FROM anon, authenticated;
GRANT INSERT ON quiz_results TO authenticated;
