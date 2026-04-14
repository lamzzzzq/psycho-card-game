import { supabase } from './supabase';
import { Room, RoomSettings, RoomPlayer, PlayerInfo } from '@/types/pvp';

// Generate a random 4-digit room code
function generateRoomCode(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

// Register or update player in DB
export async function upsertPlayer(player: PlayerInfo) {
  const { error } = await supabase
    .from('players')
    .upsert({
      id: player.id,
      student_id: player.studentId,
      big_five: player.bigFive,
    });
  if (error) throw error;
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

  if (roomError || !room) throw new Error('房间不存在或已开始游戏');

  // Check current player count
  const { data: players, error: countError } = await supabase
    .from('room_players')
    .select('seat_index')
    .eq('room_id', room.id);

  if (countError) throw countError;

  const currentCount = players?.length ?? 0;
  const maxPlayers = (room.settings as RoomSettings)?.maxPlayers ?? 4;

  if (currentCount >= maxPlayers) throw new Error('房间已满');

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

// Save game result
export async function saveGameResult(result: {
  room_id: string;
  winner_id: string;
  rankings: any[];
  rounds_played: number;
}) {
  const { error } = await supabase.from('game_results').insert(result);
  if (error) throw error;
}
