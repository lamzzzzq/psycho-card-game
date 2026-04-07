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
  skipPong,
  getDeclaredDimensions,
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

  const deck = createShuffledDeck();
  const { hands, remaining } = dealCardsVariable(deck, allScores);

  const players: Player[] = orderedPlayers.map((p, i) => ({
    id: p.player_id as PlayerId,   // UUID cast — safe at runtime
    name: p.student_id ?? `玩家${i + 1}`,
    avatar: '🧑',
    hand: hands[i],
    isHuman: true,                 // All PVP players are human (no AI logic runs)
    bigFiveScores: allScores[i],
    declaredSets: [],
    skipNextTurn: false,
    revealedHand: false,
  }));

  return {
    phase: 'drawing',
    settings: { totalRounds: settings.totalRounds, aiDifficulty: 'easy' },
    players,
    drawPile: remaining,
    discardPile: [],
    currentPlayerIndex: 0,
    currentRound: 1,
    actionLog: [],
    drawnCard: null,
    pendingDiscard: null,
    discardedByIndex: -1,
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

  // Non-current-player can pong, skip-pong, or hu during claim-window
  const isCurrentPlayer = fromPlayerId === currentPlayerId;
  const inClaimWindow = state.phase === 'claim-window';

  if (!isCurrentPlayer && action.type !== 'pong' && action.type !== 'skip-pong' && action.type !== 'hu') {
    return state;
  }
  if (action.type === 'pong' && !inClaimWindow) return state;
  if (action.type === 'skip-pong' && !inClaimWindow) return state;

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

    case 'skip-pong':
      return skipPong(state);

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
