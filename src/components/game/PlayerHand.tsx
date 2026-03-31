'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { GameCard } from '@/types';
import { Card } from './Card';

interface PlayerHandProps {
  cards: GameCard[];
  drawnCard: GameCard | null;
  isDiscarding: boolean;
  isDeclaring?: boolean;
  selectedCardIds?: number[];
  onDiscardCard: (cardId: number) => void;
  onToggleSelect?: (cardId: number) => void;
  onCardHover: (el: HTMLElement | null) => void;
}

export function PlayerHand({
  cards,
  drawnCard,
  isDiscarding,
  isDeclaring = false,
  selectedCardIds = [],
  onDiscardCard,
  onToggleSelect,
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
      {isDeclaring && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-sm text-purple-400"
        >
          点击选择要 DECLARE 的牌
        </motion.p>
      )}
      <div className="flex justify-center gap-2 flex-wrap">
        <AnimatePresence>
          {allCards.map((card) => {
            const isSelected = selectedCardIds.includes(card.id);
            return (
              <motion.div
                key={card.id}
                data-card-id={card.id}
                layout
                initial={{ opacity: 0, y: 30, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  y: isSelected ? -12 : 0,
                  scale: 1,
                }}
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
                  selected={isSelected}
                  onClick={
                    isDeclaring && onToggleSelect
                      ? () => onToggleSelect(card.id)
                      : isDiscarding
                      ? () => onDiscardCard(card.id)
                      : undefined
                  }
                />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
