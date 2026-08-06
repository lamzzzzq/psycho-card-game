-- HEXACO 联机（2026-08-06）：分数同步列 + 对局记录平行三表。
-- 应用方式：Supabase Dashboard → SQL Editor 粘贴执行。
--
-- 设计（对齐 0001 + 0006/0018 的大五模式，物理隔离不动大五表）：
--   * players.hexaco       —— 房间同步六维分数（与 big_five 平行；两套牌各写各的列，
--                              INSERT 冲突后的 plain UPDATE 只 set 自己的列，互不覆盖）
--   * hexaco_snapshots     —— 学号 ↔ 当局 HEXACO 分数快照（INSERT-only，无 SELECT，防
--                              anon 读「学号→分数」，同 big_five_snapshots 隐私模型）
--   * hexaco_game_sessions —— 一局元数据（winner_player_id=null = 中断局）
--   * hexaco_game_participants —— 一行一人一局（分数只留 snapshot FK，不反规范化）
-- 不复用大五三表 + model 列：老师端 /stats 及既有查询都对着大五表，掺行进去会污染
-- 课堂数据口径（0729 清测试数据的教训）。
--
-- RLS 沿用「过渡期宽松」模式（0018）：sessions/participants = SELECT+INSERT，
-- snapshots = INSERT-only，角色 (anon, authenticated)。service_role 不受影响。

-- ── 1) players.hexaco ──
ALTER TABLE players ADD COLUMN IF NOT EXISTS hexaco JSONB;

-- ── 2) HEXACO 分数快照 ──
CREATE TABLE IF NOT EXISTS hexaco_snapshots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   TEXT REFERENCES players(id) ON DELETE CASCADE,
  student_id  TEXT NOT NULL,
  scores      JSONB NOT NULL,                                  -- {H, E, X, A, C, O}
  source      TEXT NOT NULL DEFAULT 'game-start',              -- 'assessment' | 'manual' | 'game-start'
  taken_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hxs_player  ON hexaco_snapshots(player_id);
CREATE INDEX IF NOT EXISTS idx_hxs_student ON hexaco_snapshots(student_id);
CREATE INDEX IF NOT EXISTS idx_hxs_taken   ON hexaco_snapshots(taken_at DESC);

ALTER TABLE hexaco_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hxs_rw_insert ON hexaco_snapshots;
CREATE POLICY hxs_rw_insert ON hexaco_snapshots
  FOR INSERT TO anon, authenticated WITH CHECK (true);
-- 无 SELECT 策略：anon/authenticated 读不到（学号→分数 不可枚举），只有 service_role 可查。

-- ── 3) HEXACO 对局元数据 ──
CREATE TABLE IF NOT EXISTS hexaco_game_sessions (
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
CREATE INDEX IF NOT EXISTS idx_hgs_room   ON hexaco_game_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_hgs_winner ON hexaco_game_sessions(winner_player_id);
CREATE INDEX IF NOT EXISTS idx_hgs_ended  ON hexaco_game_sessions(ended_at DESC);

ALTER TABLE hexaco_game_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hgs_rw_select ON hexaco_game_sessions;
DROP POLICY IF EXISTS hgs_rw_insert ON hexaco_game_sessions;
CREATE POLICY hgs_rw_select ON hexaco_game_sessions
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY hgs_rw_insert ON hexaco_game_sessions
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ── 4) HEXACO 对局参与者（一行一人一局）──
CREATE TABLE IF NOT EXISTS hexaco_game_participants (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id           UUID NOT NULL REFERENCES hexaco_game_sessions(id) ON DELETE CASCADE,
  player_id            TEXT REFERENCES players(id) ON DELETE SET NULL,
  student_id           TEXT,
  seat_index           INTEGER NOT NULL,
  is_ai                BOOLEAN NOT NULL DEFAULT FALSE,          -- PVP 恒 false，留列对齐大五结构
  hexaco_snapshot_id   UUID REFERENCES hexaco_snapshots(id) ON DELETE SET NULL,
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
CREATE INDEX IF NOT EXISTS idx_hgp_session ON hexaco_game_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_hgp_student ON hexaco_game_participants(student_id);
CREATE INDEX IF NOT EXISTS idx_hgp_player  ON hexaco_game_participants(player_id);
CREATE INDEX IF NOT EXISTS idx_hgp_student_session ON hexaco_game_participants(student_id, session_id);

ALTER TABLE hexaco_game_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS hgp_rw_select ON hexaco_game_participants;
DROP POLICY IF EXISTS hgp_rw_insert ON hexaco_game_participants;
CREATE POLICY hgp_rw_select ON hexaco_game_participants
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY hgp_rw_insert ON hexaco_game_participants
  FOR INSERT TO anon, authenticated WITH CHECK (true);
