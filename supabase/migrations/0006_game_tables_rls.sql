-- 游戏表 RLS 收口（2026-06-15）。应用方式：Supabase Dashboard → SQL Editor 粘贴执行。
--
-- 解决 Advisor 的 5 个 CRITICAL：
--   1) game_participants / rooms / room_players / game_sessions 「RLS Disabled」
--   2) game_participants 「Sensitive Columns Exposed」（残留 big_five_scores 列）
--
-- ⚠️ 这是【过渡方案】：游戏靠 anon key 直接读写这些表做实时联机，所以策略对 anon 放行
--    （开 RLS 后 Advisor 会从 CRITICAL 降为黄色「RLS Policy Always True」，与分数表现状一致）。
--    真正的隔离（Supabase Anonymous Auth + auth.uid() = players.id）是 ship 给真实学生前的 TODO，
--    见 0001 末尾注释。那个改动大、要回归测联机，留到上线前做。
--
-- service_role（老师后台）始终绕过 RLS，不受影响。

-- ── 0) 堵残留洞：彻底删 game_participants.big_five_scores（0003 第二阶段，新代码已不写它）──
-- 删之前分数副本可被 anon 经 /stats 所在表直接 select 到（学号→OCEAN）。删列即关闭。
ALTER TABLE game_participants DROP COLUMN IF EXISTS big_five_scores;

-- ── 1) rooms：联机需要 anon 完整 CRUD（建房 / 查房 / 改状态 / 清理删除）──
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS rooms_anon_all ON rooms;
CREATE POLICY rooms_anon_all ON rooms
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── 2) room_players：anon 需要 查/加入(insert)/离开(delete)──
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS room_players_anon_all ON room_players;
CREATE POLICY room_players_anon_all ON room_players
  FOR ALL TO anon USING (true) WITH CHECK (true);

-- ── 3) game_sessions：仅 写存档(insert) + 读(/stats 嵌套 join)，无需 update/delete ──
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS game_sessions_anon_select ON game_sessions;
DROP POLICY IF EXISTS game_sessions_anon_insert ON game_sessions;
CREATE POLICY game_sessions_anon_select ON game_sessions
  FOR SELECT TO anon USING (true);
CREATE POLICY game_sessions_anon_insert ON game_sessions
  FOR INSERT TO anon WITH CHECK (true);

-- ── 4) game_participants：仅 写存档(insert) + 读(/stats 排行榜)，无需 update/delete ──
-- 注意：student_id 仍对 anon 可读（/stats 公开排行榜按学号展示，是产品设计）。
-- 若日后要把排行榜匿名化，再单独收紧 SELECT 列权限。
ALTER TABLE game_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS game_participants_anon_select ON game_participants;
DROP POLICY IF EXISTS game_participants_anon_insert ON game_participants;
CREATE POLICY game_participants_anon_select ON game_participants
  FOR SELECT TO anon USING (true);
CREATE POLICY game_participants_anon_insert ON game_participants
  FOR INSERT TO anon WITH CHECK (true);
