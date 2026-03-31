import { GameCard, PersonalityCard, DummyCard, BigFiveScores } from '@/types';
import { QUESTIONS } from '@/data/questions';
import { DUMMY_CARD_TEXTS } from '@/data/dummy-cards';
import { shuffle } from './utils';
import { getInitialHandSize } from './scoring';

export function generatePersonalityCards(): PersonalityCard[] {
  return QUESTIONS.map((q) => ({
    id: q.id,
    dimension: q.dimension,
    text: q.text,
    facet: q.facet,
  }));
}

export function generateDummyCards(): DummyCard[] {
  return DUMMY_CARD_TEXTS.map((text, i) => ({
    id: 1000 + i,
    text,
    isDummy: true as const,
  }));
}

export function generateDeck(): GameCard[] {
  return [...generatePersonalityCards(), ...generateDummyCards()];
}

export function createShuffledDeck(): GameCard[] {
  return shuffle(generateDeck());
}

export function dealCardsVariable(
  deck: GameCard[],
  playerScores: BigFiveScores[]
): { hands: GameCard[][]; remaining: GameCard[] } {
  const hands: GameCard[][] = [];
  let index = 0;

  for (const scores of playerScores) {
    const handSize = getInitialHandSize(scores);
    hands.push(deck.slice(index, index + handSize));
    index += handSize;
  }

  return { hands, remaining: deck.slice(index) };
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
