-- SD4 / Dark Tetrad 联机（2026-08-31）：分数同步列 + 对局记录平行三表。
-- 0027_hexaco_pvp.sql 的四维平行版本（物理隔离，不动大五/HEXACO 表）。
-- 应用方式：Supabase Management API database/query 执行（本仓库归档为准）。
--
-- 设计（对齐 0027 的 HEXACO 模式）：
--   * players.sd4          —— 房间同步四维分数（与 big_five / hexaco 平行；三套牌各写各的列，
--                              INSERT 冲突后的 plain UPDATE 只 set 自己的列，互不覆盖）
--   * sd4_snapshots        —— 学号 ↔ 当局 SD4 分数快照（INSERT-only，无 SELECT，防
--                              anon 读「学号→分数」，同 big_five/hexaco snapshots 隐私模型）
--   * sd4_game_sessions    —— 一局元数据（winner_player_id=null = 中断局）
--   * sd4_game_participants —— 一行一人一局（分数只留 snapshot FK，不反规范化）
-- 不复用大五三表 + model 列：老师端 /stats 及既有查询都对着大五表，掺行进去会污染
-- 课堂数据口径（0729 清测试数据的教训；0027 同款决策）。
--
-- RLS 沿用「过渡期宽松」模式（0018）：sessions/participants = SELECT+INSERT，
-- snapshots = INSERT-only，角色 (anon, authenticated)。service_role 不受影响。

-- ── 1) players.sd4 ──
ALTER TABLE players ADD COLUMN IF NOT EXISTS sd4 JSONB;

-- ── 2) SD4 分数快照 ──
CREATE TABLE IF NOT EXISTS sd4_snapshots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   TEXT REFERENCES players(id) ON DELETE CASCADE,
  student_id  TEXT NOT NULL,
  scores      JSONB NOT NULL,                                  -- {M, N, P, S}
  source      TEXT NOT NULL DEFAULT 'game-start',              -- 'assessment' | 'manual' | 'game-start'
  taken_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sds_player  ON sd4_snapshots(player_id);
CREATE INDEX IF NOT EXISTS idx_sds_student ON sd4_snapshots(student_id);
CREATE INDEX IF NOT EXISTS idx_sds_taken   ON sd4_snapshots(taken_at DESC);

ALTER TABLE sd4_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sds_rw_insert ON sd4_snapshots;
CREATE POLICY sds_rw_insert ON sd4_snapshots
  FOR INSERT TO anon, authenticated WITH CHECK (true);
-- 无 SELECT 策略：anon/authenticated 读不到（学号→分数 不可枚举），只有 service_role 可查。

-- ── 3) SD4 对局元数据 ──
CREATE TABLE IF NOT EXISTS sd4_game_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode              TEXT NOT NULL,                              -- 'single' | 'pvp'（当前只写 'pvp'；单机不落库）
  room_id           UUID REFERENCES rooms(id) ON DELETE SET NULL,
  room_code         TEXT,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at          TIMESTAMPTZ,
  total_rounds      INTEGER NOT NULL,                           -- 0 = unlimited
  rounds_played     INTEGER,
  winner_player_id  TEXT                                        -- null = 中断局 / 平局
);
CREATE INDEX IF NOT EXISTS idx_sgs_room   ON sd4_game_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_sgs_winner ON sd4_game_sessions(winner_player_id);
CREATE INDEX IF NOT EXISTS idx_sgs_ended  ON sd4_game_sessions(ended_at DESC);

ALTER TABLE sd4_game_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sgs_rw_select ON sd4_game_sessions;
DROP POLICY IF EXISTS sgs_rw_insert ON sd4_game_sessions;
CREATE POLICY sgs_rw_select ON sd4_game_sessions
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY sgs_rw_insert ON sd4_game_sessions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ── 4) SD4 对局参与者（一行一人一局）──
CREATE TABLE IF NOT EXISTS sd4_game_participants (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id           UUID NOT NULL REFERENCES sd4_game_sessions(id) ON DELETE CASCADE,
  player_id            TEXT REFERENCES players(id) ON DELETE SET NULL,
  student_id           TEXT,
  seat_index           INTEGER NOT NULL,
  is_ai                BOOLEAN NOT NULL DEFAULT FALSE,          -- PVP 恒 false，留列对齐大五结构
  sd4_snapshot_id      UUID REFERENCES sd4_snapshots(id) ON DELETE SET NULL,
  declared_count       INTEGER NOT NULL DEFAULT 0,
  remaining_cards      INTEGER NOT NULL DEFAULT 0,
  final_score          INTEGER NOT NULL DEFAULT 0,
  rank                 INTEGER NOT NULL,
  is_winner            BOOLEAN NOT NULL DEFAULT FALSE,
  hu_success_count     INTEGER NOT NULL DEFAULT 0,
  hu_fail_count        INTEGER NOT NULL DEFAULT 0,
  pong_success_count   INTEGER NOT NULL DEFAULT 0,
  pong_fail_count      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_sgp_session ON sd4_game_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_sgp_student ON sd4_game_participants(student_id);
CREATE INDEX IF NOT EXISTS idx_sgp_player  ON sd4_game_participants(player_id);
CREATE INDEX IF NOT EXISTS idx_sgp_student_session ON sd4_game_participants(student_id, session_id);

ALTER TABLE sd4_game_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sgp_rw_select ON sd4_game_participants;
DROP POLICY IF EXISTS sgp_rw_insert ON sd4_game_participants;
CREATE POLICY sgp_rw_select ON sd4_game_participants
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY sgp_rw_insert ON sd4_game_participants
  FOR INSERT TO anon, authenticated WITH CHECK (true);
