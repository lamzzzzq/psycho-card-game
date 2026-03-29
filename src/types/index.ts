// ===== Big Five Dimensions =====
export type Dimension = 'O' | 'C' | 'E' | 'A' | 'N';

export const DIMENSIONS: Dimension[] = ['O', 'C', 'E', 'A', 'N'];

export interface DimensionMeta {
  key: Dimension;
  name: string;
  nameEn: string;
  color: string;
  colorHex: string;
  bgColor: string;
  description: string;
  highLabel: string;
  lowLabel: string;
}

// ===== Assessment =====
export interface Question {
  id: number;
  dimension: Dimension;
  text: string;
  reversed: boolean;
  facet: string;
}

export type LikertScore = 1 | 2 | 3 | 4 | 5;

export interface BigFiveScores {
  O: number;
  C: number;
  E: number;
  A: number;
  N: number;
}

// ===== Cards =====
export interface GameCard {
  id: number;
  dimension: Dimension;
  text: string;
  facet: string;
}

// ===== Players =====
export type PlayerId = 'human' | 'ai-1' | 'ai-2' | 'ai-3';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export interface AIPersona {
  id: PlayerId;
  name: string;
  avatar: string;
  description: string;
  difficulty: AIDifficulty;
}

export interface Player {
  id: PlayerId;
  name: string;
  avatar: string;
  hand: GameCard[];
  isHuman: boolean;
  bigFiveScores: BigFiveScores;
}

// ===== Game State =====
export type GamePhase =
  | 'drawing'
  | 'discarding'
  | 'ai-turn'
  | 'round-end'
  | 'game-over';

export interface GameAction {
  round: number;
  playerId: PlayerId;
  type: 'draw' | 'discard';
  card?: GameCard;
  timestamp: number;
}

export type InfoMode = 'hidden' | 'public';

export interface GameSettings {
  totalRounds: number;
  aiDifficulty: AIDifficulty;
  infoMode: InfoMode;
}

export interface GameState {
  phase: GamePhase;
  settings: GameSettings;
  players: Player[];
  drawPile: GameCard[];
  discardPile: GameCard[];
  currentPlayerIndex: number;
  currentRound: number;
  actionLog: GameAction[];
  drawnCard: GameCard | null;
  winner: PlayerId | null;
}
