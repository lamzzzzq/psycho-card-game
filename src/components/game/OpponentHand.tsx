'use client';

import { useEffect, useState } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { Player } from '@/types';
import { DIMENSION_META } from '@/data/dimensions';
import { Card } from './Card';
import { DeclaredArea } from './DeclaredArea';

interface OpponentHandProps {
  player: Player;
  isCurrentTurn: boolean;
}

export function OpponentHand({ player, isCurrentTurn }: OpponentHandProps) {
  const [showRevealedCards, setShowRevealedCards] = useState(false);
  const showCards = player.revealedHand;
  const bounceControls = useAnimationControls();

  // Small pop when this opponent becomes the active player
  useEffect(() => {
    if (isCurrentTurn) {
      bounceControls.start({
        scale: [1, 1.06, 0.98, 1.02, 1],
        transition: { duration: 0.45, ease: 'easeOut' },
      });
    }
  }, [isCurrentTurn, bounceControls]);

  return (
    <motion.div
      animate={bounceControls}
      className={`psy-panel psy-etched flex flex-col items-center gap-1.5 rounded-[1rem] px-2 py-1.5 sm:min-h-[5.5rem] sm:items-stretch sm:gap-3 sm:rounded-[1.5rem] sm:px-4 sm:py-3 transition ${
        isCurrentTurn ? 'ring-1 ring-[rgba(200,155,93,0.35)]' : ''
      }`}
    >
      <div className="flex w-full flex-col gap-1.5 sm:hidden">
        <div className="flex items-center justify-center gap-1.5">
          <span className="text-sm">{player.avatar}</span>
          <div className="min-w-0 text-center">
            <div className="psy-serif truncate text-[10px] font-semibold text-[var(--psy-ink)]">{player.name}</div>
            <div className="text-[8px] text-[var(--psy-muted)]">
              {player.hand.length} 张
              {player.skipNextTurn && <span className="ml-1 text-[var(--psy-danger)]">停</span>}
              {isCurrentTurn && !player.skipNextTurn && <span className="ml-1 text-[var(--psy-accent)]">中</span>}
            </div>
          </div>
        </div>

        <div className="flex justify-center">
          <div className="relative h-4" style={{ width: Math.max(18, Math.min(60, (player.hand.length - 1) * 3 + 15)) }}>
            {player.hand.slice(0, 12).map((card, i) => (
              <div
                key={card.id}
                className="absolute top-0 flex h-4 w-3 items-center justify-center rounded-sm border"
                style={{
                  left: i * 3,
                  zIndex: i,
                  background: 'linear-gradient(180deg, rgba(31,45,63,0.96), rgba(18,28,39,0.96))',
                  borderColor: 'rgba(194,159,109,0.24)',
                }}
              >
                <span className="text-[6px] text-[var(--psy-ink-soft)] opacity-70">◈</span>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full">
          <DeclaredArea declaredSets={player.declaredSets} compact title={`${player.name} 的归档`} />
        </div>
      </div>

      <div className="hidden flex-1 items-center justify-between gap-4 sm:flex">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative h-5" style={{ width: Math.max(26, (player.hand.length - 1) * 5 + 18) }}>
            {player.hand.map((card, i) => (
              <div
                key={card.id}
                className="absolute top-0 flex h-5 w-4 items-center justify-center rounded-[0.45rem] border"
                style={{
                  left: i * 5,
                  zIndex: i,
                  background: 'linear-gradient(180deg, rgba(31,45,63,0.96), rgba(18,28,39,0.96))',
                  borderColor: 'rgba(194,159,109,0.24)',
                  boxShadow: '0 6px 14px rgba(0,0,0,0.18)',
                }}
              >
                <span className="text-[7px] text-[var(--psy-ink-soft)] opacity-70">◈</span>
              </div>
            ))}
          </div>
          <div className="text-[11px] text-[var(--psy-muted)]">
            手牌 {player.hand.length} 张
          </div>
        </div>

        <div className="flex min-w-[8rem] items-center justify-end gap-2">
          <span className="text-base sm:text-xl">{player.avatar}</span>
          <div className="text-left">
            <div className="psy-serif text-xs font-semibold text-[var(--psy-ink)] sm:text-sm">{player.name}</div>
            <div className="text-[10px] text-[var(--psy-muted)] sm:text-xs">
              {player.skipNextTurn && <span className="text-[var(--psy-danger)]">跳过中</span>}
              {player.revealedHand && <span className="ml-1 text-[var(--psy-accent)]">档案公开</span>}
              {isCurrentTurn && !player.skipNextTurn && <span className="text-[var(--psy-accent)]">思考中...</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="hidden sm:block">
        <DeclaredArea declaredSets={player.declaredSets} compact />
      </div>

      {/* Hand cards */}
      {showCards ? (
        <div className="w-full flex flex-col items-center gap-2 sm:hidden">
          <button
            onClick={() => setShowRevealedCards((v) => !v)}
            className="rounded-full border px-3 py-1 text-[10px] font-medium transition"
            style={{
              borderColor: 'rgba(200,155,93,0.28)',
              backgroundColor: 'rgba(200,155,93,0.1)',
              color: 'var(--psy-accent)',
            }}
          >
            {showRevealedCards ? '收起档案' : `查看档案 (${player.hand.length})`}
          </button>
          {showRevealedCards && (
            <div className="flex gap-1 flex-wrap justify-center">
              {player.hand.map((card) => (
                <Card key={card.id} card={card} tiny />
              ))}
            </div>
          )}
        </div>
      ) : (
        // Hidden hand — stacked. If pong-failed, show the selected cards
        // face-up alongside the stack so everyone sees the failed attempt.
        <>
          {player.revealedSelectedCards && player.revealedSelectedCards.length > 0 && (
            <div className="flex flex-col items-center gap-2 sm:hidden">
              <button
                onClick={() => setShowRevealedCards((v) => !v)}
                className="rounded-full border px-3 py-1 text-[10px] font-medium transition"
                style={{
                  borderColor: 'rgba(200,155,93,0.28)',
                  backgroundColor: 'rgba(200,155,93,0.1)',
                  color: 'var(--psy-accent)',
                }}
              >
                {showRevealedCards
                  ? '收起判定样本'
                  : `查看判定样本 (${player.revealedSelectedCards.length})`}
              </button>
              {showRevealedCards && (
                <div className="flex gap-1 flex-wrap justify-center">
                  {player.revealedSelectedCards.map((card) => (
                    <Card key={card.id} card={card} tiny />
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="h-0 sm:hidden" />
        </>
      )}
    </motion.div>
  );
}
