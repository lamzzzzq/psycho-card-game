'use client';

import { GameCard } from '@/types';
import { Card } from './Card';

interface DiscardPileProps {
  topCard: GameCard | null;
  count: number;
}

export function DiscardPile({ topCard, count }: DiscardPileProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      {topCard ? (
        <Card card={topCard} />
      ) : (
        <div className="w-24 h-36 rounded-xl border-2 border-dashed border-gray-800 flex items-center justify-center">
          <span className="text-xs text-gray-700">弃牌堆</span>
        </div>
      )}
      <span className="text-xs text-gray-600">已弃 {count} 张</span>
    </div>
  );
}
