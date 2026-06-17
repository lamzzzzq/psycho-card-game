import { supabase } from './supabase';
import { Room, RoomSettings, RoomPlayer, PlayerInfo } from '@/types/pvp';

// Generate a random 4-digit room code
function generateRoomCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// Register or update player in DB.
// 注意：players 开了 INSERT-only RLS（隐私，锁了 SELECT）。Supabase 的 .upsert()
// 编译成 INSERT ON CONFLICT DO UPDATE，需要 SELECT 权限读冲突行 → 会被 RLS 拒（401）。
// 所以改成「先 INSERT，遇唯一冲突(23505)再 plain UPDATE」——两步都不需要 SELECT 策略。
export async function upsertPlayer(player: PlayerInfo) {
  const { error } = await supabase
    .from('players')
    .insert({
      id: player.id,
      student_id: player.studentId,
      big_five: player.bigFive,
    });
  if (!error) return;
  if (error.code === '23505') {
    // 已存在 → 更新最新分数
    const { error: updateError } = await supabase
      .from('players')
      .update({ student_id: player.studentId, big_five: player.bigFive })
      .eq('id', player.id);
    if (updateError) throw updateError;
    return;
  }
  throw error;
}

// Create a new room
export async function createRoom(hostId: string, settings: RoomSettings, avatar?: string): Promise<Room> {
  // Try up to 5 times to get a unique code
  for (let i = 0; i < 5; i++) {
    const code = generateRoomCode();
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        code,
        host_id: hostId,
        status: 'waiting',
        settings,
      })
      .select()
      .single();

    if (error?.code === '23505') continue; // Duplicate code, retry
    if (error) throw error;

    // Add host as first player (seat 0)
    await supabase
      .from('room_players')
      .insert({ room_id: data.id, player_id: hostId, seat_index: 0, avatar: avatar ?? null });

    return data as Room;
  }
  throw new Error('Failed to generate unique room code');
}

// Join a room
export async function joinRoom(roomCode: string, playerId: string, avatar?: string): Promise<{ room: Room; seatIndex: number }> {
  // Find room
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('*')
    .eq('code', roomCode)
    .eq('status', 'waiting')
    .single();

  if (roomError || !room) throw new Error('房間不存在或已開始遊戲');

  const maxPlayers = (room.settings as RoomSettings)?.maxPlayers ?? 4;

  // 并发抢座位竞态：先读占用、再插入是 TOCTOU。配合 UNIQUE(room_id, seat_index)
  // (migration 0008)，座位被别人抢走会 23505 → 重算下一个空位重试。
  for (let attempt = 0; attempt <= maxPlayers; attempt++) {
    const { data: players, error: countError } = await supabase
      .from('room_players')
      .select('seat_index, player_id')
      .eq('room_id', room.id);
    if (countError) throw countError;

    // 已在房里(刷新/重连/再次加入) → 保留原座位，不重复插入。
    const mine = players?.find((p) => p.player_id === playerId);
    if (mine) return { room: room as Room, seatIndex: mine.seat_index };

    const currentCount = players?.length ?? 0;
    if (currentCount >= maxPlayers) throw new Error('房間已滿');

    // Find next available seat
    const takenSeats = new Set(players?.map((p) => p.seat_index) ?? []);
    let seatIndex = 0;
    while (takenSeats.has(seatIndex)) seatIndex++;

    // 普通 insert（非 upsert/DO NOTHING）：这样座位被并发抢走会真正抛 23505，
    // 由循环重算下一个空位重试（DO NOTHING 会吞掉冲突→静默拿到没插入的座位）。
    const { error: joinError } = await supabase
      .from('room_players')
      .insert({ room_id: room.id, player_id: playerId, seat_index: seatIndex, avatar: avatar ?? null });

    if (!joinError) return { room: room as Room, seatIndex };
    if (joinError.code === '23505') continue; // 座位/玩家冲突 → 重读(命中 mine 或换座)重试
    throw joinError;
  }

  throw new Error('房間已滿');
}

// Leave a room
export async function leaveRoom(roomId: string, playerId: string) {
  const { error } = await supabase
    .from('room_players')
    .delete()
    .eq('room_id', roomId)
    .eq('player_id', playerId);
  if (error) console.warn('[room-api] leaveRoom failed:', error.message);
}

// Leave every room this player is seated in. Used before create/join so
// a player is always in exactly one room at a time.
export async function leaveAllRooms(playerId: string) {
  const { error } = await supabase.from('room_players').delete().eq('player_id', playerId);
  if (error) console.warn('[room-api] leaveAllRooms failed:', error.message);
}

// 房間過期閾值：超過這個時間還停在 waiting/playing 的房間視爲廢棄
// （關頁面沒點退出留下的殭屍房）。真實對局 session 撐死 1 小時，6 小時很安全。
// 用於「已在房間內」判定，避免幾周前的舊房永久把玩家卡在外面。
export const STALE_ROOM_MS = 6 * 60 * 60 * 1000;

// Find the player's currently-active room (if any). Used to detect
// student-ID collisions: if a different device tries to create/join
// with the same ID while a room is still active, we surface a clear
// error instead of silently kicking the original session.
// 只認「6 小時內創建」的房間爲活躍，過期房一律忽略。
export async function getPlayerActiveRoom(
  playerId: string
): Promise<{ code: string; status: string; roomId: string } | null> {
  const cutoff = new Date(Date.now() - STALE_ROOM_MS).toISOString();
  const { data, error } = await supabase
    .from('room_players')
    .select('room_id, rooms!inner(code, status, created_at)')
    .eq('player_id', playerId)
    .in('rooms.status', ['waiting', 'playing'])
    .gte('rooms.created_at', cutoff)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  // supabase's inner-join types it as an array; we limited to 1 row so
  // take element 0. Defensive against either shape.
  const row = data as unknown as { room_id: string; rooms: { code: string; status: string } | { code: string; status: string }[] };
  const rooms = Array.isArray(row.rooms) ? row.rooms[0] : row.rooms;
  if (!rooms) return null;
  return { code: rooms.code, status: rooms.status, roomId: row.room_id };
}

// Kick a player (host only)
export async function kickPlayer(roomId: string, playerId: string) {
  const { error } = await supabase
    .from('room_players')
    .delete()
    .eq('room_id', roomId)
    .eq('player_id', playerId);
  if (error) console.warn('[room-api] kickPlayer failed:', error.message);
}

// Dissolve room (host only). 非原子：两步 delete 各自观测错误，避免半解散的 orphan
// 静默残留（room_players 删了但 rooms 没删，或反之）。
export async function dissolveRoom(roomId: string) {
  const { error: rpErr } = await supabase.from('room_players').delete().eq('room_id', roomId);
  if (rpErr) console.warn('[room-api] dissolveRoom: room_players delete failed:', rpErr.message);
  const { error: rErr } = await supabase.from('rooms').delete().eq('id', roomId);
  if (rErr) console.warn('[room-api] dissolveRoom: rooms delete failed:', rErr.message);
}

// Update room status. 观测错误并重试一次：开局时若 'playing' 没写进去，房间会停留
// 在 'waiting'，joinRoom 的 status 过滤就挡不住迟到玩家 → 进入已开始的局。
export async function updateRoomStatus(roomId: string, status: string) {
  const { error } = await supabase.from('rooms').update({ status }).eq('id', roomId);
  if (error) {
    console.warn('[room-api] updateRoomStatus failed, retrying once:', error.message);
    const { error: retryErr } = await supabase.from('rooms').update({ status }).eq('id', roomId);
    if (retryErr) console.warn('[room-api] updateRoomStatus retry failed:', retryErr.message);
  }
}

// Get room players with player info
export async function getRoomPlayers(roomId: string): Promise<RoomPlayer[]> {
  const { data, error } = await supabase
    .from('room_players')
    .select(`
      room_id,
      player_id,
      seat_index,
      avatar,
      players (student_id, big_five)
    `)
    .eq('room_id', roomId)
    .order('seat_index');

  if (error) throw error;

  return (data ?? []).map((rp: any) => ({
    room_id: rp.room_id,
    player_id: rp.player_id,
    seat_index: rp.seat_index,
    avatar: rp.avatar ?? undefined,
    student_id: rp.players?.student_id,
    big_five: rp.players?.big_five,
  }));
}

