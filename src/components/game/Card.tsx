'use client';

import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { GameCard, isDummyCard, isPersonalityCard } from '@/types';
import { DIMENSION_META } from '@/data/dimensions';

interface CardProps {
  card: GameCard;
  faceUp?: boolean;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
  tiny?: boolean;
  showDimension?: boolean;
  tagDimension?: import('@/types').Dimension | null;
}

export function Card({ card, faceUp = true, selected = false, onClick, compact = false, tiny = false, showDimension = false, tagDimension = null }: CardProps) {
  // Hooks must run unconditionally — keep them above any early return so
  // the hook count stays stable when faceUp flips (e.g. revealing an
  // opponent's hand after hu-fail).
  const cardRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const springConfig = { stiffness: 260, damping: 22, mass: 0.5 };
  const sx = useSpring(mx, springConfig);
  const sy = useSpring(my, springConfig);
  const rotateY = useTransform(sx, [0, 1], [-18, 18]);
  const rotateX = useTransform(sy, [0, 1], [14, -14]);

  if (!faceUp) {
    return (
      <div
        className={`${tiny ? 'w-11 h-16 rounded-[0.95rem]' : compact ? 'w-[4.55rem] h-[6.8rem] rounded-[1.08rem]' : 'w-24 h-36 rounded-[1.2rem]'} border flex items-center justify-center shadow-[0_20px_45px_rgba(0,0,0,0.35)]`}
        style={{
          background:
            'linear-gradient(180deg, rgba(25,39,56,0.98), rgba(14,24,35,0.98))',
          borderColor: 'rgba(194, 159, 109, 0.32)',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04), 0 18px 36px rgba(0,0,0,0.34)',
        }}
      >
        <div className="flex flex-col items-center gap-1">
          <span className={`${tiny ? 'text-sm' : compact ? 'text-xl' : 'text-2xl'} opacity-70`}>◈</span>
          {!compact && !tiny && <span className="psy-serif text-[9px] tracking-[0.18em] uppercase text-[var(--psy-ink-soft)]">Psyche</span>}
        </div>
      </div>
    );
  }

  const dummy = isDummyCard(card);
  const dimMeta = !dummy && isPersonalityCard(card) ? DIMENSION_META[card.dimension] : null;

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!onClick || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width);
    my.set((e.clientY - rect.top) / rect.height);
  }

  function onPointerLeave() {
    if (!onClick) return;
    mx.set(0.5);
    my.set(0.5);
  }

  return (
    <motion.div
      ref={cardRef}
      whileHover={
        onClick
          ? {
              scale: 1.1,
              y: -10,
              zIndex: 20,
              transition: { type: 'spring', stiffness: 300, damping: 18 },
            }
          : undefined
      }
      whileTap={onClick ? { scale: 0.95, y: 0 } : undefined}
      onClick={onClick}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={`${tiny ? 'w-11 h-16 p-1 rounded-[0.95rem]' : compact ? 'w-[4.55rem] h-[6.8rem] p-1.5 rounded-[1.08rem]' : 'w-24 h-36 p-2.5 rounded-xl'} border-2 flex flex-col justify-between shadow-lg transition-colors ${
        onClick ? 'cursor-pointer' : ''
      }`}
      style={{
        ...(onClick
          ? { transformPerspective: 600, transformStyle: 'preserve-3d', rotateX, rotateY }
          : {}),
        borderColor: selected
          ? 'rgba(111, 214, 178, 0.92)'
          : dummy
          ? 'rgba(190, 173, 145, 0.24)'
          : 'rgba(194, 159, 109, 0.36)',
        background: selected
          ? 'linear-gradient(180deg, rgba(17,52,50,0.96), rgba(10,31,33,0.96))'
          : dummy
          ? 'linear-gradient(180deg, rgba(35,39,46,0.82), rgba(20,24,30,0.82))'
          : 'linear-gradient(180deg, rgba(26,40,57,0.96), rgba(17,28,41,0.96))',
        boxShadow: selected
          ? '0 0 0 1px rgba(111,214,178,0.22), 0 18px 34px rgba(0,0,0,0.34)'
          : 'inset 0 0 0 1px rgba(255,255,255,0.04), 0 16px 32px rgba(0,0,0,0.3)',
      }}
    >
      {!compact && !tiny && (
        <div
          className="pointer-events-none absolute inset-[6px] rounded-[0.8rem]"
          style={{ border: '1px solid rgba(236, 223, 200, 0.08)' }}
        />
      )}
      {/* Cheat mode: show dimension when showDimension is true */}
      {showDimension && dimMeta && !compact && !tiny && (
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dimMeta.colorHex }} />
          <span className="psy-serif text-[8px]" style={{ color: dimMeta.colorHex }}>{dimMeta.name}</span>
        </div>
      )}
      {dummy && !compact && !tiny && (
        <div className="flex items-center gap-1">
          <span className="psy-serif text-[8px] text-[var(--psy-muted)]">档案注记</span>
        </div>
      )}
      {!showDimension && !dummy && !compact && !tiny && <div />}

      {tagDimension && compact && !tiny && (
        <div className="absolute inset-x-1 top-1 flex justify-center">
          <span
            className="flex max-w-full items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-semibold leading-none shadow-[0_4px_10px_rgba(0,0,0,0.18)]"
            style={{
              backgroundColor: DIMENSION_META[tagDimension].colorHex + '26',
              color: DIMENSION_META[tagDimension].colorHex,
              border: `1px solid ${DIMENSION_META[tagDimension].colorHex}45`,
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: DIMENSION_META[tagDimension].colorHex }}
            />
            <span className="truncate">{DIMENSION_META[tagDimension].name}</span>
          </span>
        </div>
      )}

      <p className={`${tiny ? 'text-[5px] leading-tight' : compact ? 'text-[9px] leading-tight' : 'text-[10px] leading-relaxed'} ${
        dummy ? 'text-[var(--psy-muted)] italic' : 'text-[var(--psy-ink)]'
      } text-center ${compact ? 'font-medium' : 'psy-serif tracking-[0.01em]'}`}>
        {tiny ? (card.text.length > 8 ? card.text.slice(0, 8) + '...' : card.text) : compact ? (card.text.length > 20 ? card.text.slice(0, 20) + '...' : card.text) : card.text}
      </p>

      {/* Tag indicator */}
      {tagDimension && !compact && !tiny ? (
        <div className="flex justify-end">
          <span
            className="text-[8px] font-semibold px-1.5 py-0.5 rounded-full"
            style={{
              backgroundColor: DIMENSION_META[tagDimension].colorHex + '33',
              color: DIMENSION_META[tagDimension].colorHex,
              border: `1px solid ${DIMENSION_META[tagDimension].colorHex}44`,
            }}
          >
            {DIMENSION_META[tagDimension].name}
          </span>
        </div>
      ) : (
        <div />
      )}
    </motion.div>
  );
}
