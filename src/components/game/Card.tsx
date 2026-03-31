'use client';

import { motion } from 'framer-motion';
import { GameCard, isDummyCard, isPersonalityCard } from '@/types';
import { DIMENSION_META } from '@/data/dimensions';

interface CardProps {
  card: GameCard;
  faceUp?: boolean;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

export function Card({ card, faceUp = true, selected = false, onClick, compact = false }: CardProps) {
  if (!faceUp) {
    return (
      <div
        className={`${compact ? 'w-14 h-20' : 'w-24 h-36'} rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 border-2 border-gray-600 flex items-center justify-center shadow-lg`}
      >
        <span className={`${compact ? 'text-lg' : 'text-2xl'} opacity-40`}>🧠</span>
      </div>
    );
  }

  const dummy = isDummyCard(card);
  const dimMeta = !dummy && isPersonalityCard(card) ? DIMENSION_META[card.dimension] : null;

  return (
    <motion.div
      whileHover={onClick ? { y: -8, scale: 1.03 } : undefined}
      whileTap={onClick ? { scale: 0.97 } : undefined}
      onClick={onClick}
      className={`${compact ? 'w-14 h-20 p-1.5' : 'w-24 h-36 p-2.5'} rounded-xl border-2 flex flex-col justify-between shadow-lg transition-colors ${
        onClick ? 'cursor-pointer' : ''
      } ${
        selected
          ? 'border-emerald-400 bg-emerald-950/30 ring-2 ring-emerald-400/50'
          : dummy
          ? 'border-gray-600 bg-gray-800/50 border-dashed'
          : 'border-gray-700 bg-gray-900 hover:border-gray-500'
      }`}
    >
      {/* Dummy card indicator only — personality cards show NO dimension hint */}
      {dummy && !compact && (
        <div className="flex items-center gap-1">
          <span className="text-[8px] text-gray-500">💡 冷知识</span>
        </div>
      )}
      {!dummy && !compact && <div />}

      <p className={`${compact ? 'text-[7px] leading-tight' : 'text-[10px] leading-relaxed'} ${
        dummy ? 'text-gray-500 italic' : 'text-gray-300'
      } text-center`}>
        {compact ? (card.text.length > 12 ? card.text.slice(0, 12) + '...' : card.text) : card.text}
      </p>

      {/* Bottom spacer */}
      <div />
    </motion.div>
  );
}
