import { SerializedGameState, SerializedPlayer } from '@/types/pvp';
import { GameCard } from '@/types';

interface RawGameState {
  phase: string;
  players: any[];
  drawPile: GameCard[];
  discardPile: GameCard[];
  currentPlayerIndex: number;
  currentRound: number;
  actionLog: any[];
  drawnCard: GameCard | null;
  pendingDiscard: GameCard | null;
  discardedByIndex: number;
  winner: string | null;
  claimResponses?: string[];
  settings?: { totalRounds: number; [key: string]: any };
}

/**
 * Serialize game state for broadcast.
 * viewerPlayerId = null → hide all hands (for generic broadcast)
 * viewerPlayerId = specific id → reveal that player's hand
 */
export function serializeGameState(state: RawGameState, viewerPlayerId: string | null): SerializedGameState {
  const serializedPlayers: SerializedPlayer[] = state.players.map(p => {
    const isViewer = viewerPlayerId !== null && p.id === viewerPlayerId;
    const base: SerializedPlayer = {
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      handCount: p.hand?.length ?? 0,
      bigFiveScores: p.bigFiveScores,
      declaredSets: p.declaredSets ?? [],
      skipNextTurn: p.skipNextTurn ?? false,
      revealedHand: p.revealedHand ?? false,
    };

    if (isViewer || viewerPlayerId === '__all__') {
      base.hand = p.hand;
    }

    if (p.revealedHand) {
      base.revealedCards = p.hand;
    }

    return base;
  });

  const currentPlayer = state.players[state.currentPlayerIndex];
  const isCurrentViewer = viewerPlayerId !== null && currentPlayer?.id === viewerPlayerId;
  // Broadcast mode (__all__) ships drawnCard to every client; each UI then
  // filters by isMyTurn so opponents don't see it. This matches how hands
  // are already handled (broadcast everything, client-side visibility gate).
  const includeDrawnCard = viewerPlayerId === '__all__' || isCurrentViewer;

  return {
    phase: state.phase,
    players: serializedPlayers,
    drawPileCount: state.drawPile?.length ?? 0,
    discardPile: state.discardPile ?? [],
    currentPlayerIndex: state.currentPlayerIndex,
    currentRound: state.currentRound,
    actionLog: state.actionLog ?? [],
    drawnCard: includeDrawnCard ? state.drawnCard : null,
    pendingDiscard: state.pendingDiscard,
    discardedByIndex: state.discardedByIndex,
    claimResponses: state.claimResponses ?? [],
    winner: state.winner,
    totalRounds: state.settings?.totalRounds ?? 0,
  };
}
