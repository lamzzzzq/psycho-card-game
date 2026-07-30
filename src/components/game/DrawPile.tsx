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
        // 高度定死、寬度由 4/7 比例推出（棄牌堆的塔羅卡同步縮到一樣的高度）：
        // 讓「牌堆 + 下方張數」這一列的總高 = 行動記錄卡（h-126/224），
        // 否則牌堆比記錄卡高、記錄卡下面就空出一條（老闆指出的空白）。
        //   桌面 200 + gap 8 + text-xs 行高 16 = 224 ✓
        //   手機 104 + gap 8 + 10px 行高 ~15 = 127 ≈ 126 ✓
        className={`psy-etched relative flex aspect-[4/7] h-[104px] items-center justify-center rounded-[1.1rem] border transition sm:h-[200px] sm:rounded-[1.35rem] ${
          canDraw ? 'cursor-pointer' : 'cursor-default opacity-60'
        }`}
        style={{
          borderColor: canDraw ? 'rgba(154,116,72,0.72)' : 'rgba(154,116,72,0.2)',
          background: canDraw
            ? 'linear-gradient(180deg, #eaddc4, #d6c39f)'
            : 'linear-gradient(180deg, #f8f1e4, #eaddc4)',
          boxShadow: canDraw
            ? 'inset 0 0 0 1px rgba(255,250,240,0.5), 0 0 24px rgba(195,154,82,0.36), 0 20px 34px rgba(96,72,38,0.26)'
            : 'inset 0 0 0 1px rgba(255,250,240,0.5), 0 18px 30px rgba(96,72,38,0.2)',
        }}
      >
        <div className="text-center">
          <div className={`psy-serif text-[var(--psy-ink-soft)] ${locale === 'en' ? 'text-xs tracking-[0.2em] sm:text-sm' : 'text-sm tracking-[0.2em] sm:text-base'}`}>{locale === 'en' ? 'DRAW' : '抽牌'}</div>
        </div>
        {/* 轮到抽牌：手指 👆 在牌堆内部下缘上下浮动（老板要求收进卡里，不越过格子边界）。
            黄色调浅：降饱和+提亮。 */}
        {canDraw && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute bottom-1.5 left-1/2 z-20 -translate-x-1/2 select-none text-2xl leading-none sm:bottom-2 sm:text-3xl"
            style={{ filter: 'saturate(0.5) brightness(1.15) drop-shadow(0 2px 4px rgba(96,72,38,0.25))' }}
            animate={{ y: [2, -4, 2] }}
            transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
          >
            👆
          </motion.span>
        )}
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
      {/* 英文改成「32 left」語序（原本是 left 32 cards，同事反饋不通順）；中文本來就順，不動。 */}
      <span className="text-[10px] leading-tight text-[var(--psy-muted)] sm:text-xs">
        {locale === 'en' ? `${count} left` : `${tg.remainingPrefix} ${count} ${tg.cardsUnit}`}
      </span>
    </div>
  );
}
