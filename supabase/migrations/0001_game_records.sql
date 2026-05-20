-- 课堂数据持久化：学号 ↔ 当局 BigFive 快照 ↔ 当局成绩
-- 应用方式：在 Supabase Dashboard → SQL Editor 粘贴执行。
--
-- 注意：players.id 在现有 schema 里是 TEXT（= 学号），不是 UUID。所有引用
-- player 的外键统一用 TEXT。rooms.id 保留 UUID。
--
-- 此 migration 用 DROP IF EXISTS 是为了 idempotent — 这 3 张是新表，跑前
-- 没有真实数据，重跑安全。**不要**在生产数据已经写入后再跑这个 DROP。

DROP TABLE IF EXISTS game_participants;
DROP TABLE IF EXISTS game_sessions;
DROP TABLE IF EXISTS big_five_snapshots;

-- 1) Big Five 历史快照（不覆盖，每次测评/对局都可存一份）
CREATE TABLE big_five_snapshots (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id   TEXT REFERENCES players(id) ON DELETE CASCADE,
  student_id  TEXT NOT NULL,
  scores      JSONB NOT NULL,                                  -- {O, C, E, A, N}
  source      TEXT NOT NULL DEFAULT 'assessment',              -- 'assessment' | 'manual' | 'game-start'
  taken_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_bfs_player  ON big_five_snapshots(player_id);
CREATE INDEX idx_bfs_student ON big_five_snapshots(student_id);
CREATE INDEX idx_bfs_taken   ON big_five_snapshots(taken_at DESC);

-- 2) 一局游戏的元数据
CREATE TABLE game_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode              TEXT NOT NULL,                              -- 'single' | 'pvp'
  room_id           UUID REFERENCES rooms(id) ON DELETE SET NULL,
  room_code         TEXT,                                       -- snapshot of rooms.code
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at          TIMESTAMPTZ,
  total_rounds      INTEGER NOT NULL,                           -- 0 = unlimited
  rounds_played     INTEGER,
  winner_player_id  TEXT                                        -- nullable: 平局 / 全弃 / hasLeft
);
CREATE INDEX idx_gs_room    ON game_sessions(room_id);
CREATE INDEX idx_gs_winner  ON game_sessions(winner_player_id);
CREATE INDEX idx_gs_ended   ON game_sessions(ended_at DESC);

-- 3) 一行一人一局（核心查询表）
CREATE TABLE game_participants (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id               UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  player_id                TEXT REFERENCES players(id) ON DELETE SET NULL,    -- null = AI 玩家
  student_id               TEXT,                                                -- null = AI 玩家
  seat_index               INTEGER NOT NULL,
  is_ai                    BOOLEAN NOT NULL DEFAULT FALSE,
  big_five_snapshot_id     UUID REFERENCES big_five_snapshots(id) ON DELETE SET NULL,
  big_five_scores          JSONB NOT NULL,                                      -- 反规范化快照，便于查询
  declared_count           INTEGER NOT NULL DEFAULT 0,
  remaining_cards          INTEGER NOT NULL DEFAULT 0,
  final_score              INTEGER NOT NULL DEFAULT 0,
  rank                     INTEGER NOT NULL,                                    -- 1-based
  is_winner                BOOLEAN NOT NULL DEFAULT FALSE,
  hu_success_count         INTEGER NOT NULL DEFAULT 0,
  hu_fail_count            INTEGER NOT NULL DEFAULT 0,
  pong_success_count       INTEGER NOT NULL DEFAULT 0,
  pong_fail_count          INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX idx_gp_session ON game_participants(session_id);
CREATE INDEX idx_gp_student ON game_participants(student_id);
CREATE INDEX idx_gp_player  ON game_participants(player_id);

-- 学号 + 时间 倒序查询索引（课堂场景常用：某学号最近玩了哪几局）
CREATE INDEX idx_gp_student_session ON game_participants(student_id, session_id);

-- RLS 暂不开（沿用现有 anon-key 直读模式）。
-- TODO: ship 给学校前要开 RLS + Supabase Anonymous Auth，绑 auth.uid() = players.id。
