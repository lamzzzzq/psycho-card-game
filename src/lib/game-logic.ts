import {
  GameState,
  GameSettings,
  Player,
  BigFiveScores,
  GameCard,
  PlayerId,
  GameAction,
} from '@/types';
import { AI_PERSONAS } from '@/data/ai-personas';
import { generateAIScores, calculateHandScore } from './scoring';
import { createShuffledDeck, dealCards } from './card-engine';

export function initializeGame(
  humanScores: BigFiveScores,
  settings: GameSettings
): GameState {
  const deck = createShuffledDeck();
  const { hands, remaining } = dealCards(deck, 4, 5);

  const players: Player[] = [
    {
      id: 'human',
      name: '你',
      avatar: '🧑',
      hand: hands[0],
      isHuman: true,
      bigFiveScores: humanScores,
    },
    ...AI_PERSONAS.map((persona, i) => ({
      id: persona.id as PlayerId,
      name: persona.name,
      avatar: persona.avatar,
      hand: hands[i + 1],
      isHuman: false,
      bigFiveScores: generateAIScores(),
    })),
  ];

  return {
    phase: 'drawing',
    settings,
    players,
    drawPile: remaining,
    discardPile: [],
    currentPlayerIndex: 0,
    currentRound: 1,
    actionLog: [],
    drawnCard: null,
    winner: null,
  };
}

export function drawCard(state: GameState): GameState {
  let drawPile = state.drawPile;
  let discardPile = state.discardPile;

  if (drawPile.length === 0) {
    if (discardPile.length === 0) {
      // No cards left anywhere — skip draw, keep current state
      return state;
    }
    // Reshuffle discard pile into draw pile
    drawPile = [...discardPile];
    for (let i = drawPile.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [drawPile[i], drawPile[j]] = [drawPile[j], drawPile[i]];
    }
    discardPile = [];
  }

  const [drawnCard, ...remaining] = drawPile;
  const action: GameAction = {
    round: state.currentRound,
    playerId: state.players[state.currentPlayerIndex].id,
    type: 'draw',
    timestamp: Date.now(),
  };

  return {
    ...state,
    drawPile: remaining,
    discardPile,
    drawnCard,
    phase: state.players[state.currentPlayerIndex].isHuman ? 'discarding' : 'ai-turn',
    actionLog: [...state.actionLog, action],
  };
}

export function discardCard(state: GameState, cardId: number): GameState {
  if (!state.drawnCard) return state;

  const playerIndex = state.currentPlayerIndex;
  const player = state.players[playerIndex];
  const drawnCard = state.drawnCard;

  // All 6 cards: current hand + drawn card
  const allCards = [...player.hand, drawnCard];
  const cardToDiscard = allCards.find((c) => c.id === cardId)!;
  const newHand = allCards.filter((c) => c.id !== cardId);

  const action: GameAction = {
    round: state.currentRound,
    playerId: player.id,
    type: 'discard',
    card: cardToDiscard,
    timestamp: Date.now(),
  };

  const newPlayers = state.players.map((p, i) =>
    i === playerIndex ? { ...p, hand: newHand } : p
  );

  // Advance to next player or next round
  const nextPlayerIndex = (playerIndex + 1) % 4;
  const isRoundEnd = nextPlayerIndex === 0;
  const nextRound = isRoundEnd ? state.currentRound + 1 : state.currentRound;
  const isGameOver = isRoundEnd && nextRound > state.settings.totalRounds;

  return {
    ...state,
    players: newPlayers,
    discardPile: [...state.discardPile, cardToDiscard],
    drawnCard: null,
    currentPlayerIndex: nextPlayerIndex,
    currentRound: nextRound,
    phase: isGameOver ? 'game-over' : 'drawing',
    actionLog: [...state.actionLog, action],
    winner: isGameOver ? determineWinner(newPlayers) : null,
  };
}

function determineWinner(players: Player[]): PlayerId {
  let bestPlayer = players[0];
  let bestScore = calculateHandScore(bestPlayer.hand, bestPlayer.bigFiveScores);

  for (let i = 1; i < players.length; i++) {
    const score = calculateHandScore(players[i].hand, players[i].bigFiveScores);
    if (score > bestScore) {
      bestScore = score;
      bestPlayer = players[i];
    }
  }

  return bestPlayer.id;
}

export function getPlayerScore(player: Player): number {
  return calculateHandScore(player.hand, player.bigFiveScores);
}

export function getRankings(players: Player[]): Player[] {
  return [...players].sort(
    (a, b) => getPlayerScore(b) - getPlayerScore(a)
  );
}
