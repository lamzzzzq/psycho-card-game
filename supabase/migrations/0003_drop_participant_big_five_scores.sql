-- 移除 game_participants 冗余分数列（隐私残留收口，2026-06-06）
--
-- 背景：game_participants 是 anon 可读的（/stats 公开页依赖它）。其中
--   big_five_scores 是反规范化的分数副本 → anon 经 /stats 能读到「学号→OCEAN」。
-- 分数权威副本在 big_five_snapshots（已锁 SELECT），game_participants.big_five_snapshot_id
-- 是指向它的外键 → 老师可在 Supabase 后台 join 取分数，无需这个冗余列。
--
-- ⚠️ big_five_scores 是 NOT NULL，且新旧代码对它的写入不同 → 必须按下面顺序执行，
--    否则部署窗口内 game 存档会报错。

-- ── 阶段 1：部署新代码【之前】执行（兼容：让旧代码仍能写、新代码可省略）──
ALTER TABLE game_participants ALTER COLUMN big_five_scores DROP NOT NULL;

-- ── 阶段 2：新代码部署完成、确认线上不再写该列【之后】执行（彻底删列，关闭泄漏）──
-- ALTER TABLE game_participants DROP COLUMN IF EXISTS big_five_scores;

-- 取分数的后台查询（老师用，service role 在 Dashboard 跑）：
--   select gp.student_id, gp.session_id, s.scores
--   from game_participants gp
--   join big_five_snapshots s on s.id = gp.big_five_snapshot_id
--   where not gp.is_ai;
