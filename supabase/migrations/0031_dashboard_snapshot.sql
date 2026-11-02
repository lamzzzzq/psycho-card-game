-- 老师统计 dashboard 的取数函数（独立 Vercel 站，服务端用 service_role 调用）。2026-11-02。
-- 只读：一次返回 dashboard 需要的全部数据（JSON），数据源 = 0030 的 class_data 视图 + profiles。
-- 权限：SECURITY DEFINER，只授权 service_role；anon/authenticated 无 EXECUTE（学生端调不到）。
-- 排除压测机器人学号（ZSMK 开头）。

CREATE OR REPLACE FUNCTION public.dashboard_snapshot()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, class_data
AS $$
  SELECT jsonb_build_object(
    'generated_at', now(),
    'profiles', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('student_id', p.student_id, 'created_at', p.created_at) ORDER BY p.created_at)
      FROM public.profiles p
      WHERE p.student_id IS NOT NULL AND p.student_id !~ '^ZSMK'
    ), '[]'::jsonb),
    'students', COALESCE((
      SELECT jsonb_agg(to_jsonb(s) ORDER BY s.student_id)
      FROM class_data.students s
      WHERE s.student_id !~ '^ZSMK'
    ), '[]'::jsonb),
    'assessments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'student_id', a.student_id, 'model', a.model, 'source', a.source, 'submitted_at', a.submitted_at,
        'attempt_no', a.attempt_no, 'answered_count', a.answered_count, 'scores', a.scores, 'answers', a.answers
      ) ORDER BY a.submitted_at)
      FROM class_data.assessments a
      WHERE a.student_id !~ '^ZSMK'
    ), '[]'::jsonb),
    'games', COALESCE((
      SELECT jsonb_agg(to_jsonb(g) ORDER BY g.ended_at DESC, g.session_id, g.rank)
      FROM class_data.games g
      WHERE g.student_id !~ '^ZSMK'
    ), '[]'::jsonb),
    'quizzes', COALESCE((
      SELECT jsonb_agg(to_jsonb(q) ORDER BY q.submitted_at DESC)
      FROM class_data.quizzes q
      WHERE q.student_id !~ '^ZSMK'
    ), '[]'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION public.dashboard_snapshot() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_snapshot() TO service_role;

-- 轻量实时面板（高频刷新用）：在线人数 / 开着的房间 / 最近打完的局 / 今天新增。只读。
-- 在线 = profiles.active_at 3 分钟内（登录后网页每 60s 心跳一次）。
-- rooms 不会物理删除，「开着的房间」只算 6 小时内建的（与游戏里房间 6h 过期一致）。
CREATE OR REPLACE FUNCTION public.dashboard_live()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, class_data
AS $$
  WITH r AS (
    SELECT r.id, r.status, COALESCE(r.settings->>'deck', 'big-five') AS deck
    FROM public.rooms r
    WHERE r.created_at > now() - interval '6 hours' AND r.host_id !~ '^ZSMK'
  ), today AS (
    SELECT (date_trunc('day', now() AT TIME ZONE 'Asia/Hong_Kong')) AT TIME ZONE 'Asia/Hong_Kong' AS t0
  )
  SELECT jsonb_build_object(
    'generated_at', now(),
    'online_3m', (SELECT count(*) FROM public.profiles WHERE active_at > now() - interval '3 minutes' AND student_id !~ '^ZSMK'),
    'online_15m', (SELECT count(*) FROM public.profiles WHERE active_at > now() - interval '15 minutes' AND student_id !~ '^ZSMK'),
    'rooms', COALESCE((SELECT jsonb_object_agg(deck || ':' || status, n) FROM (SELECT deck, status, count(*) n FROM r GROUP BY 1, 2) x), '{}'::jsonb),
    'players_in_open_rooms', (SELECT count(*) FROM public.room_players rp JOIN r ON r.id = rp.room_id WHERE r.status IN ('waiting', 'playing')),
    'games_15m', COALESCE((SELECT jsonb_object_agg(model, n) FROM (SELECT model, count(DISTINCT session_id) n FROM class_data.games WHERE ended_at > now() - interval '15 minutes' AND student_id !~ '^ZSMK' GROUP BY 1) x), '{}'::jsonb),
    'games_today', COALESCE((SELECT jsonb_object_agg(model, n) FROM (SELECT model, count(DISTINCT session_id) n FROM class_data.games, today WHERE ended_at >= today.t0 AND student_id !~ '^ZSMK' GROUP BY 1) x), '{}'::jsonb),
    'registered_total', (SELECT count(*) FROM public.profiles WHERE student_id !~ '^ZSMK'),
    'registered_today', (SELECT count(*) FROM public.profiles, today WHERE created_at >= today.t0 AND student_id !~ '^ZSMK'),
    'assessments_today', COALESCE((SELECT jsonb_object_agg(model, n) FROM (SELECT COALESCE(model, 'big-five') model, count(*) n FROM public.assessment_results, today WHERE submitted_at >= today.t0 AND student_id !~ '^ZSMK' GROUP BY 1) x), '{}'::jsonb),
    'quizzes_today', (SELECT count(*) FROM public.quiz_results, today WHERE submitted_at >= today.t0 AND student_id !~ '^ZSMK'),
    -- 进行中的房间明细（2026-11-02 课堂加）：等待中 / 对局中，含人数
    'open_rooms', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'code', r2.code, 'deck', COALESCE(r2.settings->>'deck', 'big-five'), 'status', r2.status,
        'total_rounds', r2.settings->>'totalRounds', 'created_at', r2.created_at,
        'players', (SELECT count(*) FROM public.room_players rp WHERE rp.room_id = r2.id)
      ) ORDER BY r2.status DESC, r2.created_at)
      FROM public.rooms r2
      WHERE r2.created_at > now() - interval '6 hours' AND r2.host_id !~ '^ZSMK' AND r2.status IN ('waiting', 'playing')
    ), '[]'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION public.dashboard_live() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dashboard_live() TO service_role;
