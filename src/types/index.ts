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
  // [DEPRECATED — see frozenUntilOwnDiscard]. Kept for serializer
  // backward-compat reads on stale broadcasts. Engine no longer sets
  // it; isFrozen no longer reads it.
  frozenUntilDiscarderIndex?: number;
  // Penalty freeze: stays true from the moment a pong-fail / self-pong-fail
  // / hu-fail happens until the offender themselves completes a full
  // draw + discard. Equivalent to "罚停一整轮" — the offender misses
  // every claim window during the freeze, has their own next turn
  // auto-skipped (via skipNextTurn), then must play one fresh
  // own-turn cleanly before being unfrozen.
  // Cleared in discardCard when the offender's own discard lands.
  frozenUntilOwnDiscard?: boolean;
  // 加重罚停：fail 触发时设 true。skipPenalizedPlayers 跳过该玩家一次后，
  // 检测到此标志 → 重新激活 skipNextTurn=true（让下一轮再跳一次）+ 清此
  // 标志。net effect：罚停期间玩家被 skip 2 个 own-turn 而不是 1 个。
  extraSkipQueued?: boolean;
  // Player has quit the game. Their seat is AI-piloted for the rest of
  // the match. Other players continue until a winner is declared or the
  // last human standing also leaves.
  hasLeft?: boolean;
  // True once the player commits a self-pong on the current turn.
  // Reset by drawCard when the player begins a fresh turn. Enforces
  // the "one self-pong per turn" rule (engine + UI both gate on this).
  selfPongUsedThisTurn?: boolean;
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
  // 'wrong-cards' (cards/count mismatch) | 'already-declared' (该维度已归档)
  failReason?: 'wrong-cards' | 'already-declared';
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
