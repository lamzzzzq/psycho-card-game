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
        // 尺寸與棄牌堆的塔羅卡完全一致（寬 72/96 + TarotCard 的 4/7 比例），
        // 兩堆並排時大小不再不齊（用戶反饋）。
        className={`psy-etched relative flex aspect-[4/7] w-[72px] items-center justify-center rounded-[1.1rem] border transition sm:w-32 sm:rounded-[1.35rem] ${
          canDraw ? 'cursor-pointer' : 'cursor-default opacity-60'
        }`}
        style={{
          borderColor: canDraw ? 'rgba(154,116,72,0.72)' : 'rgba(154,116,72,0.2)',
          background: canDraw
            ? 'linear-gradient(180deg, #eaddc4, #d6c39f)'
            : 'linear-gradient(180deg, #f8f1e4, #eaddc4)',
          boxShadow: canDraw
            ? 'inset 0 0 0 1px rgba(255,250,240,0.5), 0 0 24px rgba(195,154,82,0.36), 0 18px 30px rgba(96,72,38,0.2)'
            : 'inset 0 0 0 1px rgba(255,250,240,0.46), 0 14px 24px rgba(96,72,38,0.14)',
        }}
      >
        <div className="text-center">
          <div className="mb-0.5 text-xl text-[var(--psy-ink)] sm:mb-1 sm:text-2xl">◈</div>
          <div className={`psy-serif text-[var(--psy-ink-soft)] ${locale === 'en' ? 'text-[10px] tracking-[0.18em] sm:text-[11px] sm:tracking-[0.2em]' : 'text-xs tracking-[0.24em] sm:text-sm'}`}>{locale === 'en' ? 'DRAW' : '抽牌'}</div>
        </div>
        {canDraw && (
          <>
            {/* 内圈呼吸描边 */}
            <motion.div
              animate={{ opacity: [0.55, 1, 0.55] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="absolute inset-0 rounded-[1rem] border-2 sm:rounded-[1.25rem]"
              style={{ borderColor: 'rgba(154,116,72,0.56)' }}
            />
            {/* 外圈扩散光环 */}
            <motion.div
              animate={{ opacity: [0.5, 0, 0.5], scale: [1, 1.12, 1] }}
              transition={{ repeat: Infinity, duration: 1.8, ease: 'easeOut' }}
              className="pointer-events-none absolute -inset-1 rounded-[1.25rem] border sm:rounded-[1.4rem]"
              style={{ borderColor: 'rgba(195,154,82,0.48)' }}
            />
          </>
        )}
      </motion.button>
      {/* 轮到抽牌：手指 👆 在「剩餘 X 張」处上下浮动、指回牌堆（老板要求）。黄色调浅：降饱和+提亮。 */}
      {canDraw && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute left-1/2 z-20 -translate-x-1/2 select-none text-2xl sm:text-3xl"
          style={{ bottom: '-0.4rem', filter: 'saturate(0.5) brightness(1.15) drop-shadow(0 2px 4px rgba(96,72,38,0.25))' }}
          animate={{ y: [4, -6, 4] }}
          transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
        >
          👆
        </motion.div>
      )}
      <span className="text-[10px] text-[var(--psy-muted)] sm:text-xs">{tg.remainingPrefix} {count} {tg.cardsUnit}</span>
    </div>
  );
}
