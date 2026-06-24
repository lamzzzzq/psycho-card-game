'use client';

import { motion } from 'framer-motion';
import { STRINGS, type Locale } from '@/lib/i18n';

interface DrawPileProps {
  count: number;
  canDraw: boolean;
  onDraw: () => void;
  locale?: Locale;
}

export function DrawPile({ count, canDraw, onDraw, locale = 'zh' }: DrawPileProps) {
  const tg = STRINGS[locale].game;
  return (
    <div className="relative flex flex-col items-center gap-2">
      {/* 轮到抽牌时：在牌堆上方浮一个跳动的👆，强提示「點這裡抽牌」 */}
      {canDraw && (
        <motion.div
          aria-hidden
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: [0, -6, 0] }}
          transition={{ y: { repeat: Infinity, duration: 1, ease: 'easeInOut' }, opacity: { duration: 0.3 } }}
          className="pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold sm:-top-8 sm:text-[11px]"
          style={{
            background: 'rgba(200,155,93,0.96)',
            color: '#1a1206',
            boxShadow: '0 4px 14px rgba(200,155,93,0.45)',
          }}
        >
          👆 {tg.clickToDraw}
        </motion.div>
      )}
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
          borderColor: canDraw ? 'rgba(214,170,98,0.85)' : 'rgba(200,155,93,0.16)',
          background: canDraw
            ? 'linear-gradient(180deg, rgba(30,52,70,0.98), rgba(15,28,40,0.98))'
            : 'linear-gradient(180deg, rgba(20,29,40,0.88), rgba(12,18,25,0.88))',
          boxShadow: canDraw
            ? 'inset 0 0 0 1px rgba(214,170,98,0.35), 0 0 26px rgba(200,155,93,0.42), 0 18px 34px rgba(0,0,0,0.3)'
            : 'inset 0 0 0 1px rgba(255,255,255,0.04), 0 18px 34px rgba(0,0,0,0.3)',
        }}
      >
        <div className="text-center">
          <div className="mb-0.5 text-xl text-[var(--psy-ink)] sm:mb-1 sm:text-2xl">◈</div>
          <div className="psy-serif text-[10px] tracking-[0.18em] text-[var(--psy-ink-soft)] sm:text-[11px] sm:tracking-[0.2em]">DRAW</div>
        </div>
        {canDraw && (
          <>
            {/* 内圈呼吸描边 */}
            <motion.div
              animate={{ opacity: [0.55, 1, 0.55] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute inset-0 rounded-[1rem] border-2 sm:rounded-[1.25rem]"
              style={{ borderColor: 'rgba(214,170,98,0.6)' }}
            />
            {/* 外圈扩散光环 */}
            <motion.div
              animate={{ opacity: [0.5, 0, 0.5], scale: [1, 1.12, 1] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeOut' }}
              className="pointer-events-none absolute -inset-1 rounded-[1.25rem] border sm:rounded-[1.4rem]"
              style={{ borderColor: 'rgba(200,155,93,0.5)' }}
            />
          </>
        )}
      </motion.button>
      <span className="text-[10px] text-[var(--psy-muted)] sm:text-xs">{tg.remainingPrefix} {count} {tg.cardsUnit}</span>
    </div>
  );
}
