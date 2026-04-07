import { BigFiveScores, Dimension, GameCard, GameAction } from './index';

// Player identity (persisted to localStorage + Supabase)
export interface PlayerInfo {
  id: string; // student ID (学号) as unique identifier
  studentId: string;
  bigFive: BigFiveScores | null;
}

// Room status
export type RoomStatus = 'waiting' | 'playing' | 'finished';

// Room settings
export interface RoomSettings {
  totalRounds: number; // 0 = unlimited
  maxPlayers: number; // 3-4
}

// Room data from DB
export interface Room {
  id: string;
  code: string;
  host_id: string;
  status: RoomStatus;
  settings: RoomSettings;
  created_at: string;
}

// Room player (join table)
export interface RoomPlayer {
  room_id: string;
  player_id: string;
  seat_index: number;
  // Joined from players table
  student_id?: string;
  big_five?: BigFiveScores | null;
}

// Realtime message types
export type RealtimeMessage =
  | { type: 'player-joined'; player: PlayerInfo; seatIndex: number }
  | { type: 'player-left'; playerId: string }
  | { type: 'player-kicked'; playerId: string }
  | { type: 'room-dissolved' }
  | { type: 'settings-changed'; settings: RoomSettings }
  | { type: 'game-start'; gameState: SerializedGameState }
  | { type: 'game-state-update'; gameState: SerializedGameState }
  | { type: 'action-request'; fromPlayerId: string; action: PvpAction }
  | { type: 'game-over'; winnerId: string }
  | { type: 'big-five-updated'; playerId: string; bigFive: BigFiveScores };

// Actions that clients can request
export type PvpAction =
  | { type: 'draw' }
  | { type: 'discard'; cardId: number }
  | { type: 'hu' }
  | { type: 'pong'; dimension: Dimension; handCardIds: number[] }
  | { type: 'skip-pong' };

// Serialized game state for broadcast (same shape as GameState)
export interface SerializedGameState {
  phase: string;
  players: SerializedPlayer[];
  drawPileCount: number; // Don't send actual cards to non-host
  discardPile: GameCard[];
  currentPlayerIndex: number;
  currentRound: number;
  actionLog: GameAction[];
  drawnCard: GameCard | null; // Only sent to the current player
  pendingDiscard: GameCard | null;
  discardedByIndex: number;
  winner: string | null;
  totalRounds: number;
}

export interface SerializedPlayer {
  id: string;
  name: string;
  avatar: string;
  handCount: number; // Don't reveal hand to other players
  hand?: GameCard[]; // Only sent to the player themselves
  bigFiveScores: BigFiveScores;
  declaredSets: any[];
  skipNextTurn: boolean;
  revealedHand: boolean;
  revealedCards?: GameCard[]; // Sent when revealedHand is true
}

// Game result for DB
export interface GameResult {
  room_id: string;
  winner_id: string;
  rankings: { playerId: string; declaredCount: number; remainingCards: number }[];
  rounds_played: number;
}
