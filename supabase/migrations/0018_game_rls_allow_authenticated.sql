-- 修 bug：游戏/快照表的 RLS 策略原本只给 anon，上了账号系统后请求角色变 authenticated，
-- 不匹配 → 建房/存档时报「new row violates row-level security policy」。2026-07-21。
-- 应用方式：Supabase Dashboard → SQL Editor 粘贴执行。
--
-- 修法：把这些「过渡期宽松策略」的适用角色从 anon 扩到 (anon, authenticated)，逻辑不变(USING/CHECK true)。
-- 真正的 auth.uid() 隔离仍是 TODO（改动大、要回归测联机），此处只解锁登录用户、不改安全模型。
-- service_role（老师后台）始终绕过 RLS，不受影响。

-- ── players（0002：INSERT + UPDATE）──
DROP POLICY IF EXISTS players_anon_insert ON players;
DROP POLICY IF EXISTS players_anon_update ON players;
CREATE POLICY players_rw_insert ON players FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY players_rw_update ON players FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- ── big_five_snapshots（0002：INSERT）──
DROP POLICY IF EXISTS bfs_anon_insert ON big_five_snapshots;
CREATE POLICY bfs_rw_insert ON big_five_snapshots FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ── rooms（0006：ALL）──
DROP POLICY IF EXISTS rooms_anon_all ON rooms;
CREATE POLICY rooms_rw_all ON rooms FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ── room_players（0006：ALL）──
DROP POLICY IF EXISTS room_players_anon_all ON room_players;
CREATE POLICY room_players_rw_all ON room_players FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- ── game_sessions（0006：SELECT + INSERT）──
DROP POLICY IF EXISTS game_sessions_anon_select ON game_sessions;
DROP POLICY IF EXISTS game_sessions_anon_insert ON game_sessions;
CREATE POLICY game_sessions_rw_select ON game_sessions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY game_sessions_rw_insert ON game_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ── game_participants（0006：SELECT + INSERT）──
DROP POLICY IF EXISTS game_participants_anon_select ON game_participants;
DROP POLICY IF EXISTS game_participants_anon_insert ON game_participants;
CREATE POLICY game_participants_rw_select ON game_participants FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY game_participants_rw_insert ON game_participants FOR INSERT TO anon, authenticated WITH CHECK (true);
