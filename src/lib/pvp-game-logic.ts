/**
 * PVP game logic wrapper.
 * Bridges the existing single-player game-logic (which uses PlayerId union)
 * with PVP's UUID-based player IDs, using safe casts.
 */
import {
  GameState,
  Player,
  PlayerId,
  BigFiveScores,
  Dimension,
} from '@/types';
import { RoomPlayer, RoomSettings, PvpAction } from '@/types/pvp';
import {
  drawCard,
  discardCard,
  attemptHu,
  pongCard,
  selfPongCard,
  skipPong,
  getDeclaredDimensions,
  markPlayerLeft,
} from './game-logic';
import { createShuffledDeck, dealCardsVariable } from './card-engine';
import { getTargetCounts } from './scoring';

// ── Initialize ───────────────────────────────────────────────────────────────

export function initializePvpGame(
  orderedPlayers: RoomPlayer[],
  bigFiveMap: Record<string, BigFiveScores>,
  settings: RoomSettings
): GameState {
  const allScores = orderedPlayers.map(p => bigFiveMap[p.player_id] ?? randomBigFive());

  const deck = createShuffledDeck(allScores.length);
  const { hands, remaining } = dealCardsVariable(deck, allScores);

  const players: Player[] = orderedPlayers.map((p, i) => ({
    id: p.player_id as PlayerId,   // UUID cast — safe at runtime
    name: p.student_id ?? p.player_id ?? `玩家${i + 1}`,
    avatar: p.avatar ?? '🧑',
    hand: hands[i],
    isHuman: true,                 // All PVP players are human (no AI logic runs)
    bigFiveScores: allScores[i],
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
  action: PvpAction,
  orderedPlayers: RoomPlayer[]
): GameState {
  const playerIndex = orderedPlayers.findIndex(p => p.player_id === fromPlayerId);
  const currentPlayerId = orderedPlayers[state.currentPlayerIndex]?.player_id;

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
    if (playerIndex < 0) return state;
    const pid = orderedPlayers[playerIndex].player_id as PlayerId;
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

function randomBigFive(): BigFiveScores {
  return {
    O: +(Math.random() * 4 + 1).toFixed(2),
    C: +(Math.random() * 4 + 1).toFixed(2),
    E: +(Math.random() * 4 + 1).toFixed(2),
    A: +(Math.random() * 4 + 1).toFixed(2),
    N: +(Math.random() * 4 + 1).toFixed(2),
  };
}
