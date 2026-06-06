-- 题目级 raw 答案存储 + 隐私 RLS（2026-06-06）
-- 应用方式：Supabase Dashboard → SQL Editor 粘贴执行。
--
-- 目标：
--   1. 记录每个学号每道题的真实选择（raw），只有本人（service_role / 后台）能读。
--   2. 堵住「裸学号 anon key 读回任意学生五大人格分数」的隐私洞。
--
-- 原则（见 identity-plan）：隐私靠「客户端只写、不回读」。anon 只能 INSERT，
-- 不给 SELECT 策略 → 前端/任何拿 public anon key 的人都读不到；service_role
-- 绕过 RLS，仅你在 Dashboard / 用 service key 能读。

-- ── 1) 题目级 raw 答案表 ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assessment_responses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL,                 -- 一次测评 = 一个 submission_id（60 行共享）
  student_id    TEXT NOT NULL,
  device_token  TEXT,                          -- 弱提示：本机随机 token（区分换浏览器/设备），可空
  question_id   INTEGER NOT NULL,
  dimension     TEXT NOT NULL,                 -- O / C / E / A / N
  reversed      BOOLEAN NOT NULL,              -- 该题是否反向计分
  raw_choice    SMALLINT NOT NULL,             -- 1..5 玩家原始选择（未做反向换算）
  answered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ar_student    ON assessment_responses(student_id);
CREATE INDEX IF NOT EXISTS idx_ar_submission ON assessment_responses(submission_id);
CREATE INDEX IF NOT EXISTS idx_ar_answered   ON assessment_responses(answered_at DESC);

-- 同学号换设备/浏览器/重测 → 全部 INSERT 保存（不去重、不拒绝），分析时再去重。

ALTER TABLE assessment_responses ENABLE ROW LEVEL SECURITY;
-- 允许匿名 INSERT（前端写入）；不创建 SELECT/UPDATE/DELETE 策略 → anon 读不到。
DROP POLICY IF EXISTS ar_anon_insert ON assessment_responses;
CREATE POLICY ar_anon_insert ON assessment_responses
  FOR INSERT TO anon WITH CHECK (true);

-- ── 2) 锁住分数表的回读（players / big_five_snapshots）────────────────────
-- 这两张表全 App 只「写」不「读」（分数靠 realtime 广播传，不查 DB）。
-- 开 RLS：允许 anon INSERT + UPDATE（upsert 需要），但**不给 SELECT** → 裸学号读不回分数。

ALTER TABLE players ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS players_anon_insert ON players;
DROP POLICY IF EXISTS players_anon_update ON players;
CREATE POLICY players_anon_insert ON players FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY players_anon_update ON players FOR UPDATE TO anon USING (true) WITH CHECK (true);

ALTER TABLE big_five_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bfs_anon_insert ON big_five_snapshots;
CREATE POLICY bfs_anon_insert ON big_five_snapshots FOR INSERT TO anon WITH CHECK (true);

-- ── 注意 ────────────────────────────────────────────────────────────────
-- rooms / room_players / game_sessions / game_participants 维持 anon SELECT
-- （PVP 房间流程 + /stats 依赖读取），本 migration 不动它们。
--
-- ⚠️ Phase 2 待办：game_participants.big_five_scores 是 denormalized 分数列，
--    /stats 读这张表 → anon 仍能间接读到「学号→分数」。彻底堵需要：用视图隐藏该
--    列 / 改 /stats 不再依赖该列后停存 / 或接受这一层残留。锁它会破 /stats，故另排。
