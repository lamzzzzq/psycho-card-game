-- 防并发抢同一座位（2026-06-15）。应用方式：Supabase Dashboard → SQL Editor 粘贴执行。
--
-- 背景：joinRoom 客户端先读座位占用、再插入，是 TOCTOU 竞态。两人同时抢最后一个座位
-- 会拿到相同 seat_index，开局 slice 静默踢掉一人。加 UNIQUE(room_id, seat_index) 后，
-- 第二个插入会 23505，joinRoom 据此重算下一个空位重试（见 room-api.ts joinRoom）。
--
-- 先去重已有的重复座位行（保留物理最早一行），再加约束。幂等：可重复执行。

DELETE FROM room_players a
USING room_players b
WHERE a.ctid < b.ctid
  AND a.room_id = b.room_id
  AND a.seat_index = b.seat_index;

ALTER TABLE room_players DROP CONSTRAINT IF EXISTS room_players_room_seat_unique;
ALTER TABLE room_players ADD CONSTRAINT room_players_room_seat_unique UNIQUE (room_id, seat_index);
