'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { GameCard } from '@/types';
import { Card } from './Card';
import { useRef } from 'react';

interface PlayerHandProps {
  cards: GameCard[];
  drawnCard: GameCard | null;
  isDiscarding: boolean;
  onDiscardCard: (cardId: number) => void;
  onCardHover: (el: HTMLElement | null) => void;
}

export function PlayerHand({
  cards,
  drawnCard,
  isDiscarding,
  onDiscardCard,
  onCardHover,
}: PlayerHandProps) {
  const allCards = drawnCard ? [...cards, drawnCard] : cards;

  return (
    <div className="space-y-3">
      {isDiscarding && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-sm text-yellow-400"
        >
          点击一张牌弃掉
        </motion.p>
      )}
      <div className="flex justify-center gap-2 flex-wrap">
        <AnimatePresence>
          {allCards.map((card) => (
            <motion.div
              key={card.id}
              data-card-id={card.id}
              layout
              initial={{ opacity: 0, y: 30, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -80, scale: 0.6, transition: { duration: 0.4 } }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              onMouseEnter={(e) => {
                if (isDiscarding) onCardHover(e.currentTarget as HTMLElement);
              }}
              onMouseLeave={() => {
                if (isDiscarding) onCardHover(null);
              }}
            >
              <Card
                card={card}
                onClick={isDiscarding ? () => onDiscardCard(card.id) : undefined}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
