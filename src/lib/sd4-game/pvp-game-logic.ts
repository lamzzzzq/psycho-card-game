/**
 * SD4 PVP game logic wrapper（src/lib/pvp-game-logic.ts 的四維物理隔離副本）。
 * Bridges the existing single-player game-logic (which uses PlayerId union)
 * with PVP's UUID-based player IDs, using safe casts.
 */
import {
  GameState,
  Player,
  PlayerId,
  Sd4Scores,
} from '@/types/sd4-game';
import { RoomPlayer, RoomSettings, PvpAction } from '@/types/sd4-pvp';
import {
  drawCard,
  discardCard,
  attemptHu,
  pongCard,
  selfPongCard,
  skipPong,
  markPlayerLeft,
} from '@/lib/sd4-game/game-logic';
import { createShuffledDeck, dealCardsVariable } from '@/lib/sd4-game/card-engine';

// ── Initialize ───────────────────────────────────────────────────────────────

export function initializePvpGame(
  orderedPlayers: RoomPlayer[],
  sd4Map: Record<string, Sd4Scores>,
  settings: RoomSettings
): GameState {
  const allScores = orderedPlayers.map(p => sd4Map[p.player_id] ?? randomSd4());

  const deck = createShuffledDeck(allScores.length);
  const { hands, remaining } = dealCardsVariable(deck, allScores);

  const players: Player[] = orderedPlayers.map((p, i) => ({
    id: p.player_id as PlayerId,   // UUID cast — safe at runtime
    name: p.student_id ?? p.player_id ?? `玩家${i + 1}`,
    avatar: p.avatar ?? '🧑',
    hand: hands[i],
    isHuman: true,                 // All PVP players are human (no AI logic runs)
    sd4Scores: allScores[i],
    declaredSets: [],
    skipNextTurn: false,
    revealedHand: false,
  }));

  return {
    phase: 'drawing',
    settings: { totalRounds: settings.totalRounds, aiDifficulty: 'easy', revealDifficulty: settings.difficulty ?? 'hidden' },
    players,
    drawPile: remaining,
    discardPile: [],
    currentPlayerIndex: 0,
    currentRound: 1,
    actionLog: [],
    drawnCard: null,
    pendingDiscard: null,
    discardedByIndex: -1,
    claimResponses: [],
    winner: null,
  };
}

// ── Apply action ─────────────────────────────────────────────────────────────

export function applyPvpAction(
  state: GameState,
  fromPlayerId: string,
  action: PvpAction
): GameState {
  // ⚠️ 索引一律以引擎自己的 state.players 為準（座位穩定，hasLeft 只標記
  // 不刪位）。不能用房間名冊：玩家中途被剔除後名冊會縮短，用名冊算出的
  // index 會錯位指到別人的座位（碰/胡動到別人的手牌、當前玩家被誤攔）。
  const playerIndex = state.players.findIndex(p => p.id === fromPlayerId);
  if (playerIndex < 0) return state;
  const currentPlayerId = state.players[state.currentPlayerIndex]?.id;

  // Non-current-player can pong, skip-pong, hu, or leave during claim-window
  const isCurrentPlayer = fromPlayerId === currentPlayerId;
  const inClaimWindow = state.phase === 'claim-window';

  // 'leave' can be invoked at any time by any player.
  if (action.type !== 'leave') {
    if (
      !isCurrentPlayer &&
      action.type !== 'pong' &&
      action.type !== 'skip-pong' &&
      action.type !== 'hu'
    ) {
      return state;
    }
    if (action.type === 'pong' && !inClaimWindow) return state;
    if (action.type === 'skip-pong' && !inClaimWindow) return state;
    if (action.type === 'self-pong' && !isCurrentPlayer) return state;
    // 非當前玩家的「胡」只在 claim-window 內合法。窗口剛關閉時遲到的胡若放行，
    // fail 分支會把當前玩家的 drawnCard 塞進胡失敗者手牌，並從錯誤座位推進回合。
    if (action.type === 'hu' && !inClaimWindow && !isCurrentPlayer) return state;
    // 弃牌者不能「胡」自己刚打出的牌（claim-window 期间）——否则会被错误计入
    // claimResponses，扰乱窗口结算。自摸胡走的是 draw 路径，不经此处。
    if (action.type === 'hu' && inClaimWindow && playerIndex === state.discardedByIndex) return state;
  }

  // Lock out players who already responded in this claim window
  if (
    inClaimWindow &&
    (action.type === 'pong' || action.type === 'skip-pong' || action.type === 'hu') &&
    !isCurrentPlayer
  ) {
    const pid = state.players[playerIndex].id;
    if (state.claimResponses.includes(pid)) return state;
  }

  switch (action.type) {
    case 'draw':
      if (state.phase !== 'drawing') return state;
      return drawCard(state);

    case 'discard':
      if (state.phase !== 'discarding') return state;
      return discardCard(state, action.cardId);

    case 'hu':
      return attemptHu(state, playerIndex);

    case 'pong':
      return pongCard(state, playerIndex, action.dimension, action.handCardIds);

    case 'self-pong':
      return selfPongCard(state, playerIndex, action.dimension, action.cardIds);

    case 'skip-pong':
      return skipPong(state, playerIndex);

    case 'leave':
      return markPlayerLeft(state, fromPlayerId);

    default:
      return state;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// 未完成 SD4 測評的玩家用隨機分兜底（同大五 randomBigFive 的規則）。
function randomSd4(): Sd4Scores {
  const r = () => +(Math.random() * 4 + 1).toFixed(2);
  return { M: r(), N: r(), P: r(), S: r() };
}
