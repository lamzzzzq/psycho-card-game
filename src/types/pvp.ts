import { BigFiveScores, Dimension, GameCard, GameAction } from './index';

// Player identity (persisted to localStorage + Supabase)
export interface PlayerInfo {
  id: string; // student ID (学号) as unique identifier
  studentId: string;
  bigFive: BigFiveScores | null;
}

// Room status
export type RoomStatus = 'waiting' | 'playing' | 'finished';

// Personality deck identifier. Only 'big-five' is implemented for MVP;
// the others appear in the create-room UI as locked previews.
export type DeckId = 'big-five' | 'hexaco' | 'cpai';

// Room settings
export interface RoomSettings {
  totalRounds: number; // 0 = unlimited
  maxPlayers: number; // 3-4
  deck?: DeckId; // optional for backward-compat with existing rooms (= 'big-five')
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
  // Tentative offline: presence dropped but within grace period.
  // UI shows "离线中" badge until host promotes to player-left or
  // the player reconnects (player-online).
  | { type: 'player-offline'; playerId: string }
  | { type: 'player-online'; playerId: string }
  | { type: 'settings-changed'; settings: RoomSettings }
  // toPlayerId, when set, means this payload was tailored for a single
  // recipient — clients with a different myPlayerId MUST ignore it. Used
  // to keep hand cards private per-recipient instead of broadcasting
  // every hand to every viewer.
  | { type: 'game-start'; gameState: SerializedGameState; toPlayerId?: string }
  | { type: 'game-state-update'; gameState: SerializedGameState; toPlayerId?: string }
  | { type: 'action-request'; fromPlayerId: string; action: PvpAction }
  | { type: 'game-over'; winnerId: string }
  | { type: 'big-five-updated'; playerId: string; bigFive: BigFiveScores }
  | { type: 'state-request'; fromPlayerId: string };

// Actions that clients can request
export type PvpAction =
  | { type: 'draw' }
  | { type: 'discard'; cardId: number }
  | { type: 'hu' }
  | { type: 'pong'; dimension: Dimension; handCardIds: number[] }
  | { type: 'self-pong'; dimension: Dimension; cardIds: number[] }
  | { type: 'skip-pong' }
  | { type: 'leave' };

// Serialized game state for broadcast (same shape as GameState)
export interface SerializedGameState {
  phase: string;
  players: SerializedPlayer[];
  drawPileCount: number; // Don't send actual cards to non-host
  discardPile: GameCard[];
  currentPlayerIndex: number;
  currentRound: number;
  actionLog: GameAction[];
  drawnCard: GameCard | null; // Broadcast to all; clients filter by isMyTurn
  pendingDiscard: GameCard | null;
  discardedByIndex: number;
  claimResponses: string[];
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
  revealedCards?: GameCard[];          // full hand, sent when revealedHand is true (hu-fail)
  revealedSelectedCards?: GameCard[];  // subset, sent after pong-fail
  // [DEPRECATED] kept for backwards-compatibility on stale broadcasts.
  frozenUntilDiscarderIndex?: number;
  // Penalty freeze, mirrored from host. Released by the offender's own
  // next clean discard. UI gates claim/pong/hu panels on this.
  frozenUntilOwnDiscard?: boolean;
  // 加重罚停标志：skipPenalizedPlayers 跳过该玩家一次后，若 true 则重新激活
  // skipNextTurn 让下一圈再跳一次。pong-fail/hu-fail/self-pong-fail 时设。
  extraSkipQueued?: boolean;
  // Player quit the room — their seat is permanently skipped by the
  // engine; UI shows "已退出".
  hasLeft?: boolean;
  // Once-per-turn self-pong gate, mirrored for UI to disable the button.
  selfPongUsedThisTurn?: boolean;
}

// Game result for DB
export interface GameResult {
  room_id: string;
  winner_id: string;
  rankings: { playerId: string; declaredCount: number; remainingCards: number }[];
  rounds_played: number;
}
