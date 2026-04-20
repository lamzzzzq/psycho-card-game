'use client';

import { useEffect, useState } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { Player } from '@/types';
import { Card } from './Card';
import { DeclaredArea } from './DeclaredArea';

interface OpponentHandProps {
  player: Player;
  isCurrentTurn: boolean;
}

export function OpponentHand({ player, isCurrentTurn }: OpponentHandProps) {
  const [showRevealedCards, setShowRevealedCards] = useState(false);
  const showCards = player.revealedHand;
  const hasRevealedSubset = !showCards && (player.revealedSelectedCards?.length ?? 0) > 0;
  const bounceControls = useAnimationControls();

  useEffect(() => {
    if (isCurrentTurn) {
      bounceControls.start({
        scale: [1, 1.06, 0.98, 1.02, 1],
        transition: { duration: 0.45, ease: 'easeOut' },
      });
    }
  }, [isCurrentTurn, bounceControls]);

  const stackWidth = Math.max(20, Math.min(72, (player.hand.length - 1) * 4 + 18));

  return (
    <motion.div
      animate={bounceControls}
      className={`psy-panel psy-etched flex flex-col gap-2 rounded-[1rem] px-2.5 py-2 sm:rounded-[1.25rem] sm:px-3 sm:py-2.5 transition ${
        isCurrentTurn ? 'ring-1 ring-[rgba(200,155,93,0.42)]' : ''
      }`}
    >
      {/* Header: avatar + name + count */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="text-base shrink-0">{player.avatar}</span>
          <div className="min-w-0">
            <div className="psy-serif truncate text-[11px] font-medium text-[var(--psy-ink)] sm:text-xs">
              {player.name}
            </div>
            <div className="text-[9px] text-[var(--psy-muted)] sm:text-[10px]">
              {player.hand.length} 张
              {player.skipNextTurn && <span className="ml-1 text-[var(--psy-danger)]">· 停</span>}
              {!player.skipNextTurn && isCurrentTurn && <span className="ml-1 text-[var(--psy-accent)]">· 思考中</span>}
              {player.revealedHand && <span className="ml-1 text-[var(--psy-accent)]">· 档案公开</span>}
            </div>
          </div>
        </div>

        {/* Card-back stack visual */}
        <div className="relative h-4 shrink-0 sm:h-5" style={{ width: stackWidth }}>
          {player.hand.slice(0, 16).map((card, i) => (
            <div
              key={card.id}
              className="absolute top-0 flex h-full w-3 items-center justify-center rounded-[0.3rem] border sm:w-4 sm:rounded-[0.4rem]"
              style={{
                left: i * 4,
                zIndex: i,
                background: 'linear-gradient(180deg, rgba(31,45,63,0.96), rgba(18,28,39,0.96))',
                borderColor: 'rgba(194,159,109,0.24)',
              }}
            >
              <span className="text-[6px] text-[var(--psy-ink-soft)] opacity-70 sm:text-[7px]">◈</span>
            </div>
          ))}
        </div>
      </div>

      {/* Archive */}
      <DeclaredArea declaredSets={player.declaredSets} compact title={`${player.name} 的归档`} />

      {/* Revealed full hand (pong-fail / hu-fail) */}
      {showCards && (
        <div className="space-y-1.5">
          <button
            onClick={() => setShowRevealedCards((v) => !v)}
            className="psy-btn psy-btn-ghost w-full px-2 py-1 text-[10px]"
            style={{
              borderColor: 'rgba(200,155,93,0.32)',
              color: 'var(--psy-accent)',
              background: 'rgba(200,155,93,0.08)',
            }}
          >
            {showRevealedCards ? '收起公开档案' : `查看公开档案（${player.hand.length}）`}
          </button>
          {showRevealedCards && (
            <div className="flex flex-wrap justify-center gap-1">
              {player.hand.map((card) => (
                <Card key={card.id} card={card} tiny />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Revealed subset (pong-fail attempt) */}
      {hasRevealedSubset && (
        <div className="space-y-1.5">
          <button
            onClick={() => setShowRevealedCards((v) => !v)}
            className="psy-btn psy-btn-ghost w-full px-2 py-1 text-[10px]"
            style={{
              borderColor: 'rgba(220,106,79,0.32)',
              color: 'var(--psy-danger)',
              background: 'rgba(220,106,79,0.08)',
            }}
          >
            {showRevealedCards
              ? '收起判定样本'
              : `查看判定样本（${player.revealedSelectedCards!.length}）`}
          </button>
          {showRevealedCards && (
            <div className="flex flex-wrap justify-center gap-1">
              {player.revealedSelectedCards!.map((card) => (
                <Card key={card.id} card={card} tiny />
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
