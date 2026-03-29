'use client';

import { motion } from 'framer-motion';

interface DrawPileProps {
  count: number;
  canDraw: boolean;
  onDraw: () => void;
}

export function DrawPile({ count, canDraw, onDraw }: DrawPileProps) {
  return (
    <div className="flex flex-col items-center gap-2">
      <motion.button
        whileHover={canDraw ? { scale: 1.05 } : undefined}
        whileTap={canDraw ? { scale: 0.95 } : undefined}
        onClick={canDraw ? onDraw : undefined}
        disabled={!canDraw}
        className={`relative w-24 h-36 rounded-xl border-2 flex items-center justify-center shadow-lg transition ${
          canDraw
            ? 'border-purple-500 bg-purple-950/30 cursor-pointer hover:border-purple-400'
            : 'border-gray-700 bg-gray-900 cursor-default opacity-50'
        }`}
      >
        <div className="text-center">
          <div className="text-3xl mb-1">🧠</div>
          <div className="text-xs text-gray-400">抽牌</div>
        </div>
        {canDraw && (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute inset-0 rounded-xl border-2 border-purple-400/30"
          />
        )}
      </motion.button>
      <span className="text-xs text-gray-600">剩余 {count} 张</span>
    </div>
  );
}
