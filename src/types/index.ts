// ===== Big Five Dimensions =====
export type Dimension = 'O' | 'C' | 'E' | 'A' | 'N';

export const DIMENSIONS: Dimension[] = ['O', 'C', 'E', 'A', 'N'];

export interface DimensionMeta {
  key: Dimension;
  name: string;
  nameEn: string;
  colorHex: string;
  description: string;
}

// ===== Assessment =====
export interface Question {
  id: number;
  dimension: Dimension;
  text: string;
  /** 英文題面（雙語：locale=en 時顯示） */
  textEn: string;
  reversed: boolean;
  /** IPIP-50 不提供逐題 facet，保留可選以兼容舊資料 */
  facet?: string;
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
  textEn?: string;
  facet?: string;
  /** 插画 id：复制牌(id 5000+)用它指回原题图 /cards/{imageId}.webp；缺省=id。 */
  imageId?: number;
  isDummy?: false;
}

export interface DummyCard {
  id: number;
  text: string;          // 知识牌：术语(term) — 繁中
  textEn?: string;       // 术语 — 英文
  definition?: string;   // 一句话定义（正文）— 繁中
  definitionEn?: string; // 定义 — 英文
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
  nameEn: string;
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
  nameEn?: string;              // AI 单机对手的英文名（粤语拼音）；PVP 玩家用自填昵称，无此字段
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
  // draw + discard. Equivalent to "罰停一整輪" — the offender misses
  // every claim window during the freeze, has their own next turn
  // auto-skipped (via skipNextTurn), then must play one fresh
  // own-turn cleanly before being unfrozen.
  // Cleared in discardCard when the offender's own discard lands.
  frozenUntilOwnDiscard?: boolean;
  // 加重罰停：fail 觸發時設 true。skipPenalizedPlayers 跳過該玩家一次後，
  // 檢測到此標誌 → 重新激活 skipNextTurn=true（讓下一輪再跳一次）+ 清此
  // 標誌。net effect：罰停期間玩家被 skip 2 個 own-turn 而不是 1 個。
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
  // 'wrong-cards' (cards/count mismatch) | 'already-declared' (該維度已歸檔)
  failReason?: 'wrong-cards' | 'already-declared';
  // discard 動作清除了該玩家的罰停凍結（解凍輪出牌）→ 日誌標「解除罰停」。
  clearedPenalty?: boolean;
  timestamp: number;
}

// 揭示難度（人格 tag 何時可見）：
//  open   = 明牌：自己手牌 + 所有棄牌都顯示人格；無需「查看」。
//  half   = 半公開：每回合可查看手上至多 4 張，看過永久顯示（直到打出）；棄牌不顯示。
//  hidden = 隱藏（預設/現狀）：每回合看 2 張、一輪後消失；棄牌不顯示。
export type RevealDifficulty = 'open' | 'half' | 'hidden';

export interface GameSettings {
  totalRounds: number; // 0 = unlimited (play until someone wins)
  aiDifficulty: AIDifficulty;
  revealDifficulty?: RevealDifficulty; // 缺省 = 'hidden'
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
