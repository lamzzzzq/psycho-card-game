-- 课堂数据导出视图（老师用，按学号汇总）。2026-10-07。
-- 放在独立 schema class_data：PostgREST 只暴露 public，anon/authenticated 读不到这里，
-- 视图以 owner 身份执行会绕过分数表的 RLS，所以绝不能放进 public。
-- 读法：① scripts/export-class-data.ts 一键导出 Excel；② Dashboard → Table Editor 切 schema=class_data → Export CSV。
-- 口径：只统计 PVP 对局（单机不落库）；「中断局」= winner_player_id IS NULL（房主中途退出）。

CREATE SCHEMA IF NOT EXISTS class_data;
REVOKE ALL ON SCHEMA class_data FROM PUBLIC, anon, authenticated;

-- ── 1) 测评明细：一次测评一行（answers 原样保留，导出脚本展开成逐题列）──
CREATE OR REPLACE VIEW class_data.assessments AS
SELECT
  ar.student_id,
  COALESCE(ar.model, 'big-five') AS model,
  ar.source,
  ar.submitted_at,
  ar.answered_count,
  ar.scores,
  ar.answers,
  ROW_NUMBER() OVER (PARTITION BY ar.student_id, COALESCE(ar.model, 'big-five') ORDER BY ar.submitted_at) AS attempt_no
FROM public.assessment_results ar;

-- ── 2) 对局明细：一人一局一行，三套模型合并 ──
CREATE OR REPLACE VIEW class_data.games AS
SELECT 'big-five' AS model, gp.student_id, gs.id AS session_id, gs.room_code, gs.started_at, gs.ended_at,
       gs.total_rounds, gs.rounds_played, (gs.winner_player_id IS NULL) AS interrupted,
       gp.declared_count, gp.remaining_cards, gp.final_score, gp.rank, gp.is_winner,
       gp.pong_success_count, gp.pong_fail_count, gp.hu_success_count, gp.hu_fail_count,
       (SELECT count(*) FROM public.game_participants x WHERE x.session_id = gs.id) AS players_in_game
FROM public.game_participants gp JOIN public.game_sessions gs ON gs.id = gp.session_id
WHERE gs.mode = 'pvp' AND gp.student_id IS NOT NULL
UNION ALL
SELECT 'hexaco', gp.student_id, gs.id, gs.room_code, gs.started_at, gs.ended_at,
       gs.total_rounds, gs.rounds_played, (gs.winner_player_id IS NULL),
       gp.declared_count, gp.remaining_cards, gp.final_score, gp.rank, gp.is_winner,
       gp.pong_success_count, gp.pong_fail_count, gp.hu_success_count, gp.hu_fail_count,
       (SELECT count(*) FROM public.hexaco_game_participants x WHERE x.session_id = gs.id)
FROM public.hexaco_game_participants gp JOIN public.hexaco_game_sessions gs ON gs.id = gp.session_id
WHERE gs.mode = 'pvp' AND gp.student_id IS NOT NULL
UNION ALL
SELECT 'sd4', gp.student_id, gs.id, gs.room_code, gs.started_at, gs.ended_at,
       gs.total_rounds, gs.rounds_played, (gs.winner_player_id IS NULL),
       gp.declared_count, gp.remaining_cards, gp.final_score, gp.rank, gp.is_winner,
       gp.pong_success_count, gp.pong_fail_count, gp.hu_success_count, gp.hu_fail_count,
       (SELECT count(*) FROM public.sd4_game_participants x WHERE x.session_id = gs.id)
FROM public.sd4_game_participants gp JOIN public.sd4_game_sessions gs ON gs.id = gp.session_id
WHERE gs.mode = 'pvp' AND gp.student_id IS NOT NULL;

-- ── 3) 小测明细 ──
CREATE OR REPLACE VIEW class_data.quizzes AS
SELECT student_id, model, mode, room_code, attempt, score, total, items, locale, submitted_at
FROM public.quiz_results;

-- ── 4) 学生汇总：一个学号一行 ──
CREATE OR REPLACE VIEW class_data.students AS
WITH ids AS (
  SELECT student_id FROM public.profiles WHERE student_id IS NOT NULL
  UNION SELECT student_id FROM public.assessment_results
  UNION SELECT student_id FROM class_data.games
  UNION SELECT student_id FROM public.quiz_results
),
latest AS (
  SELECT DISTINCT ON (student_id, model) student_id, model, scores, submitted_at
  FROM class_data.assessments
  ORDER BY student_id, model, submitted_at DESC
),
acount AS (
  SELECT student_id, model, count(*) AS n FROM class_data.assessments GROUP BY 1, 2
),
g AS (
  SELECT student_id,
         count(*) FILTER (WHERE NOT interrupted)                         AS games_completed,
         count(*) FILTER (WHERE interrupted)                             AS games_interrupted,
         count(*) FILTER (WHERE model = 'big-five')                      AS games_big_five,
         count(*) FILTER (WHERE model = 'hexaco')                        AS games_hexaco,
         count(*) FILTER (WHERE model = 'sd4')                           AS games_sd4,
         count(*) FILTER (WHERE is_winner)                               AS wins,
         sum(declared_count)                                             AS declared_total,
         round(avg(declared_count) FILTER (WHERE NOT interrupted), 2)    AS declared_avg,
         round(avg(rank) FILTER (WHERE NOT interrupted), 2)              AS rank_avg,
         sum(pong_success_count)                                         AS pong_success,
         sum(pong_fail_count)                                            AS pong_fail,
         sum(hu_success_count)                                           AS hu_success,
         sum(hu_fail_count)                                              AS hu_fail,
         max(ended_at)                                                   AS last_game_at
  FROM class_data.games GROUP BY 1
),
q AS (
  -- 答对数按 items[].correct 重算，不信客户端 score 字段
  SELECT r.student_id, count(*) AS quiz_attempts,
         sum((SELECT count(*) FROM jsonb_array_elements(r.items) e WHERE (e->>'correct')::boolean)) AS quiz_correct,
         sum(jsonb_array_length(r.items)) AS quiz_questions,
         max(r.submitted_at) AS last_quiz_at
  FROM public.quiz_results r GROUP BY 1
)
SELECT
  ids.student_id,
  -- 五大（最新一次）
  (bf.scores->>'O')::numeric AS bf_o, (bf.scores->>'C')::numeric AS bf_c, (bf.scores->>'E')::numeric AS bf_e,
  (bf.scores->>'A')::numeric AS bf_a, (bf.scores->>'N')::numeric AS bf_n,
  bf.submitted_at AS bf_latest_at, COALESCE(abf.n, 0) AS bf_attempts,
  -- HEXACO（最新一次）
  (hx.scores->>'H')::numeric AS hx_h, (hx.scores->>'E')::numeric AS hx_e, (hx.scores->>'X')::numeric AS hx_x,
  (hx.scores->>'A')::numeric AS hx_a, (hx.scores->>'C')::numeric AS hx_c, (hx.scores->>'O')::numeric AS hx_o,
  hx.submitted_at AS hx_latest_at, COALESCE(ahx.n, 0) AS hx_attempts,
  -- SD4（最新一次）
  (sd.scores->>'M')::numeric AS sd4_m, (sd.scores->>'N')::numeric AS sd4_n,
  (sd.scores->>'P')::numeric AS sd4_p, (sd.scores->>'S')::numeric AS sd4_s,
  sd.submitted_at AS sd4_latest_at, COALESCE(asd.n, 0) AS sd4_attempts,
  -- 对局（PVP，三模型合计）
  COALESCE(g.games_completed, 0) AS games_completed, COALESCE(g.games_interrupted, 0) AS games_interrupted,
  COALESCE(g.games_big_five, 0) AS games_big_five, COALESCE(g.games_hexaco, 0) AS games_hexaco,
  COALESCE(g.games_sd4, 0) AS games_sd4, COALESCE(g.wins, 0) AS wins,
  COALESCE(g.declared_total, 0) AS declared_total, g.declared_avg, g.rank_avg,
  COALESCE(g.pong_success, 0) AS pong_success, COALESCE(g.pong_fail, 0) AS pong_fail,
  COALESCE(g.hu_success, 0) AS hu_success, COALESCE(g.hu_fail, 0) AS hu_fail,
  -- 小测
  COALESCE(q.quiz_attempts, 0) AS quiz_attempts,
  CASE WHEN q.quiz_questions > 0 THEN round(q.quiz_correct::numeric / q.quiz_questions, 3) END AS quiz_correct_rate,
  GREATEST(bf.submitted_at, hx.submitted_at, sd.submitted_at, g.last_game_at, q.last_quiz_at) AS last_active_at
FROM ids
LEFT JOIN latest bf ON bf.student_id = ids.student_id AND bf.model = 'big-five'
LEFT JOIN latest hx ON hx.student_id = ids.student_id AND hx.model = 'hexaco'
LEFT JOIN latest sd ON sd.student_id = ids.student_id AND sd.model = 'sd4'
LEFT JOIN acount abf ON abf.student_id = ids.student_id AND abf.model = 'big-five'
LEFT JOIN acount ahx ON ahx.student_id = ids.student_id AND ahx.model = 'hexaco'
LEFT JOIN acount asd ON asd.student_id = ids.student_id AND asd.model = 'sd4'
LEFT JOIN g ON g.student_id = ids.student_id
LEFT JOIN q ON q.student_id = ids.student_id;

REVOKE ALL ON ALL TABLES IN SCHEMA class_data FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA class_data TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA class_data TO service_role;
-- 以后新增的视图也自动给 service_role 读、不给 anon/authenticated
ALTER DEFAULT PRIVILEGES IN SCHEMA class_data GRANT SELECT ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA class_data REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
