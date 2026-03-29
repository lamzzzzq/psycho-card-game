import { GameCard } from '@/types';
import { QUESTIONS } from '@/data/questions';
import { shuffle } from './utils';

export function generateDeck(): GameCard[] {
  return QUESTIONS.map((q) => ({
    id: q.id,
    dimension: q.dimension,
    text: q.text,
    facet: q.facet,
  }));
}

export function createShuffledDeck(): GameCard[] {
  return shuffle(generateDeck());
}

export function dealCards(
  deck: GameCard[],
  playerCount: number,
  cardsPerPlayer: number
): { hands: GameCard[][]; remaining: GameCard[] } {
  const hands: GameCard[][] = [];
  let index = 0;

  for (let p = 0; p < playerCount; p++) {
    hands.push(deck.slice(index, index + cardsPerPlayer));
    index += cardsPerPlayer;
  }

  return { hands, remaining: deck.slice(index) };
}
