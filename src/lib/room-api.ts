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
export async function createRoom(hostId: string, settings: RoomSettings): Promise<Room> {
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
      .insert({ room_id: data.id, player_id: hostId, seat_index: 0 });

    return data as Room;
  }
  throw new Error('Failed to generate unique room code');
}

// Join a room
export async function joinRoom(roomCode: string, playerId: string): Promise<{ room: Room; seatIndex: number }> {
  // Find room
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('*')
    .eq('code', roomCode)
    .eq('status', 'waiting')
    .single();

  if (roomError || !room) throw new Error('房間不存在或已開始遊戲');

  // Check current player count
  const { data: players, error: countError } = await supabase
    .from('room_players')
    .select('seat_index')
    .eq('room_id', room.id);

  if (countError) throw countError;

  const currentCount = players?.length ?? 0;
  const maxPlayers = (room.settings as RoomSettings)?.maxPlayers ?? 4;

  if (currentCount >= maxPlayers) throw new Error('房間已滿');

  // Find next available seat
  const takenSeats = new Set(players?.map((p) => p.seat_index) ?? []);
  let seatIndex = 0;
  while (takenSeats.has(seatIndex)) seatIndex++;

  // Add player to room (upsert: if already seated, keep existing seat)
  const { error: joinError } = await supabase
    .from('room_players')
    .upsert(
      { room_id: room.id, player_id: playerId, seat_index: seatIndex },
      { onConflict: 'room_id,player_id', ignoreDuplicates: true }
    );

  if (joinError) throw joinError;

  return { room: room as Room, seatIndex };
}

// Leave a room
export async function leaveRoom(roomId: string, playerId: string) {
  await supabase
    .from('room_players')
    .delete()
    .eq('room_id', roomId)
    .eq('player_id', playerId);
}

// Leave every room this player is seated in. Used before create/join so
// a player is always in exactly one room at a time.
export async function leaveAllRooms(playerId: string) {
  await supabase.from('room_players').delete().eq('player_id', playerId);
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
  await supabase
    .from('room_players')
    .delete()
    .eq('room_id', roomId)
    .eq('player_id', playerId);
}

// Dissolve room (host only)
export async function dissolveRoom(roomId: string) {
  await supabase.from('room_players').delete().eq('room_id', roomId);
  await supabase.from('rooms').delete().eq('id', roomId);
}

// Update room status
export async function updateRoomStatus(roomId: string, status: string) {
  await supabase.from('rooms').update({ status }).eq('id', roomId);
}

// Get room players with player info
export async function getRoomPlayers(roomId: string): Promise<RoomPlayer[]> {
  const { data, error } = await supabase
    .from('room_players')
    .select(`
      room_id,
      player_id,
      seat_index,
      players (student_id, big_five)
    `)
    .eq('room_id', roomId)
    .order('seat_index');

  if (error) throw error;

  return (data ?? []).map((rp: any) => ({
    room_id: rp.room_id,
    player_id: rp.player_id,
    seat_index: rp.seat_index,
    student_id: rp.players?.student_id,
    big_five: rp.players?.big_five,
  }));
}

