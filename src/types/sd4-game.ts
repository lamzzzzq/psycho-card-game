// ===== SD4 / Dark Tetrad 遊戲類型（與 Big Five / HEXACO 完全物理隔離）=====
// 這是 `src/types/hexaco-game.ts` 的四維平行版本：M/N/P/S，
// 不 import 也不被 Big Five / HEXACO 遊戲代碼 import。改這裡動不到另外兩套一行。
// 測評側的 Sd4Dimension/Sd4Scores 定義在 `src/data/sd4-types.ts`，
// 字面量完全一致（'M'|'N'|'P'|'S'），結構兼容可直接互傳。

export type Dimension = 'M' | 'N' | 'P' | 'S';

export const DIMENSIONS: Dimension[] = ['M', 'N', 'P', 'S'];

export interface DimensionMeta {
  key: Dimension;
  name: string;
  nameEn: string;
  /** 主色（Main Accent）：實色底、描邊、圖標、進度條。 */
  colorHex: string;
  /** 淺色底（Tile Background）：格子/卡片的底色。 */
  tintHex: string;
  /** 深色字（Dark Text / Border）：淺底上的文字與描邊，保證對比度。 */
  inkHex: string;
  /** 壓在主色實底上的文字色。 */
  onAccentHex: string;
  description: string;
}

/** 四維得分（測評 1.0~5.0）。與 data/sd4-types.ts 的 Sd4Scores 結構一致。 */
export type Sd4Scores = Record<Dimension, number>;

// ===== Cards =====
export interface PersonalityCard {
  id: number;
  dimension: Dimension;
  text: string;
  textEn?: string;
  /** 插畫 id：複製牌(id 5000+)用它指回原題圖；缺省=id。SD4 全 28 題有卡圖 /cards/sd4/。 */
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
  descriptionEn: string;
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
  nameEn?: string;              // AI 单机对手的英文名（粤语拼音）
  avatar: string;
  hand: GameCard[];
  isHuman: boolean;
  sd4Scores: Sd4Scores;
  declaredSets: DeclaredSet[];
  skipNextTurn: boolean;
  revealedHand: boolean;                    // hu-fail: full hand exposed
  revealedSelectedCards?: GameCard[];       // pong-fail: only the attempted cards exposed
  // [DEPRECATED — see frozenUntilOwnDiscard]. Kept for serializer
  // backward-compat reads on stale broadcasts.
  frozenUntilDiscarderIndex?: number;
  // Penalty freeze: stays true from the moment a pong-fail / self-pong-fail
  // / hu-fail happens until the offender themselves completes a full
  // draw + discard.（罰停一整輪，語義同 Big Five 版）
  frozenUntilOwnDiscard?: boolean;
  // 加重罰停：罰停期間玩家被 skip 2 個 own-turn 而不是 1 個。
  extraSkipQueued?: boolean;
  // Player has quit; seat becomes AI-piloted.
  hasLeft?: boolean;
  // 本回合用過自摸碰 → 這回合不能再食胡。
  selfPongUsedThisTurn?: boolean;
  // 「欠一張罰棄牌」——食胡失敗 / 自摸碰失敗之後仍要棄一張牌纔算走完這回合。
  owesPenaltyDiscard?: boolean;
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
  failReason?: 'wrong-cards' | 'already-declared';
  clearedPenalty?: boolean;
  timestamp: number;
}

// 看牌難度（同 Big Five 版語義）。
export type RevealDifficulty = 'open' | 'half' | 'hidden';

export interface GameSettings {
  totalRounds: number; // 0 = unlimited
  aiDifficulty: AIDifficulty;
  revealDifficulty?: RevealDifficulty;
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
