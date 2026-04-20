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
        animate={canDraw ? {
          y: [0, -2, 0],
          x: [0, -1.5, 1.5, -1, 1, 0],
        } : undefined}
        transition={canDraw ? {
          y: { repeat: Infinity, duration: 1.8, ease: 'easeInOut' },
          x: { repeat: Infinity, duration: 1.2, ease: 'easeInOut', repeatDelay: 0.8 },
        } : undefined}
        whileHover={canDraw ? { scale: 1.05 } : undefined}
        whileTap={canDraw ? { scale: 0.95 } : undefined}
        onClick={canDraw ? onDraw : undefined}
        disabled={!canDraw}
        className={`psy-etched relative flex h-28 w-20 items-center justify-center rounded-[1.1rem] border transition sm:h-36 sm:w-24 sm:rounded-[1.25rem] ${
          canDraw ? 'cursor-pointer' : 'cursor-default opacity-60'
        }`}
        style={{
          borderColor: canDraw ? 'rgba(200,155,93,0.42)' : 'rgba(200,155,93,0.16)',
          background: canDraw
            ? 'linear-gradient(180deg, rgba(24,42,59,0.98), rgba(13,24,35,0.98))'
            : 'linear-gradient(180deg, rgba(20,29,40,0.88), rgba(12,18,25,0.88))',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04), 0 18px 34px rgba(0,0,0,0.3)',
        }}
      >
        <div className="text-center">
          <div className="mb-0.5 text-xl text-[var(--psy-ink)] sm:mb-1 sm:text-2xl">◈</div>
          <div className="psy-serif text-[10px] tracking-[0.18em] text-[var(--psy-ink-soft)] sm:text-[11px] sm:tracking-[0.2em]">DRAW</div>
        </div>
        {canDraw && (
          <motion.div
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute inset-0 rounded-[1rem] border sm:rounded-[1.25rem]"
            style={{ borderColor: 'rgba(200,155,93,0.28)' }}
          />
        )}
      </motion.button>
      <span className="text-[10px] text-[var(--psy-muted)] sm:text-xs">剩余 {count} 张</span>
    </div>
  );
}
