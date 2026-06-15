-- 头像入库（2026-06-15）。应用方式：Supabase Dashboard → SQL Editor 粘贴执行。
--
-- 背景：玩家选的 emoji 头像之前只走实时 broadcast、不存库（players 表对 anon 只写不读，
-- 存那里也读不到）。刷新/重连/非现场加载时 RoomPlayer.avatar 丢失 → 游戏里显示默认 🧑。
-- 解法：存进 room_players（anon 可读），getRoomPlayers 直接读，头像就稳了。
--
-- 这是【纯加列】，向后兼容：旧代码不引用该列，跑完不影响线上。请【先跑本 SQL，再部署新代码】。

ALTER TABLE room_players ADD COLUMN IF NOT EXISTS avatar TEXT;
