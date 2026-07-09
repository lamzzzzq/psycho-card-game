'use client';

import { motion } from 'framer-motion';
import { GameCard } from '@/types';
import { TarotCard } from './TarotCard';
import { cardToTarotProps } from './cardToTarotProps';
import type { Locale } from '@/lib/i18n';

interface FlyingCardProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  card?: GameCard;
  text?: string;
  locale?: Locale;
  onComplete: () => void;
}

export function FlyingCard({ from, to, card, text, locale = 'zh', onComplete }: FlyingCardProps) {
  // A restrained arc: it reads as a card transfer without crossing the table
  // like a giant modal or dragging the player's eye out of the current scene.
  const midX = (from.x + to.x) / 2;
  const midY = Math.min(from.y, to.y) - 36;

  return (
    <motion.div
      className="pointer-events-none fixed z-[80]"
      initial={{
        left: from.x - 48,
        top: from.y - 84,
        scale: 0.9,
        opacity: 1,
        rotate: 0,
      }}
      animate={{
        left: [from.x - 48, midX - 48, to.x - 48],
        top: [from.y - 84, midY - 84, to.y - 84],
        scale: [0.9, 0.76, 0.58],
        opacity: [1, 0.96, 0],
        rotate: [0, 5, 0],
      }}
      transition={{
        duration: 0.42,
        times: [0, 0.5, 1],
        ease: 'easeInOut',
      }}
      onAnimationComplete={onComplete}
    >
      {card ? (
        <TarotCard {...cardToTarotProps(card, locale)} width={96} />
      ) : (
        <div className="psy-panel psy-etched flex h-24 w-16 items-center justify-center rounded-xl p-2 text-center shadow-[0_12px_24px_rgba(96,72,38,0.24)]">
          <p className="psy-serif text-[9px] leading-tight text-[var(--psy-ink)]">{text}</p>
        </div>
      )}
    </motion.div>
  );
}
