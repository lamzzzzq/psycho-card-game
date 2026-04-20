// ===== Big Five Dimensions =====
export type Dimension = 'O' | 'C' | 'E' | 'A' | 'N';

export const DIMENSIONS: Dimension[] = ['O', 'C', 'E', 'A', 'N'];

export interface DimensionMeta {
  key: Dimension;
  name: string;
  nameEn: string;
  colorHex: string;
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
export interface PersonalityCard {
  id: number;
  dimension: Dimension;
  text: string;
  facet: string;
  isDummy?: false;
}

export interface DummyCard {
  id: number;
  text: string;
  isDummy: true;
}

export type GameCard = PersonalityCard | DummyCard;

export function isPersonalityCard(card: GameCard): card is PersonalityCard {
  return !card.isDummy;
}

export function isDummyCard(card: GameCard): card is DummyCard {
  return card.isDummy === true;
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

export interface DeclaredSet {
  dimension: Dimension;
  cards: PersonalityCard[];
  round: number;
}

export interface Player {
  id: PlayerId;
  name: string;
  avatar: string;
  hand: GameCard[];
  isHuman: boolean;
  bigFiveScores: BigFiveScores;
  declaredSets: DeclaredSet[];
  skipNextTurn: boolean;
  revealedHand: boolean;                    // hu-fail: full hand exposed
  revealedSelectedCards?: GameCard[];       // pong-fail: only the attempted cards exposed
}

// ===== Game State =====
export type GamePhase =
  | 'drawing'
  | 'discarding'
  | 'ai-turn'
  | 'claim-window'
  | 'game-over';

export interface GameAction {
  round: number;
  playerId: PlayerId;
  type: 'draw' | 'discard' | 'hu-success' | 'hu-fail' | 'pong-success' | 'pong-fail' | 'skip';
  card?: GameCard;
  dimension?: Dimension;
  cardCount?: number;
  timestamp: number;
}

export interface GameSettings {
  totalRounds: number; // 0 = unlimited (play until someone wins)
  aiDifficulty: AIDifficulty;
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
  pendingDiscard: GameCard | null;
  discardedByIndex: number;
  claimResponses: PlayerId[];
  winner: PlayerId | null;
}
