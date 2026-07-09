'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GameCard, Dimension, DIMENSIONS, Player, isPersonalityCard } from '@/types';
import { getTargetCounts } from '@/lib/scoring';
import { TarotCard } from './TarotCard';
import { cardToTarotProps } from './cardToTarotProps';
import { STRINGS, type Locale } from '@/lib/i18n';

interface PongPanelProps {
  pendingCard: GameCard;
  player: Player;
  discardedByName: string;
  selectedCardIds: number[];
  onClaim: (dimension: Dimension, handCardIds: number[]) => void;
  onSkip: () => void;
  onResolveAI: () => void;
  /** Solo play waits for a decision; PVP can retain a timed claim window. */
  autoAdvance?: boolean;
  locale?: Locale;
}

export function PongPanel({
  pendingCard,
  player,
  discardedByName,
  selectedCardIds,
  onClaim,
  onSkip,
  onResolveAI,
  autoAdvance = true,
  locale = 'zh',
}: PongPanelProps) {
  const t = STRINGS[locale].game;
  const targets = getTargetCounts(player.bigFiveScores);
  // 倒計時初值分兩檔：能歸檔 20s（要看牌思考+選牌，5s 根本來不及——用戶反饋）；
  // 無法歸檔只有「暫不歸檔」一個選項，5s 快速放行避免拖慢節奏。
  const [countdown, setCountdown] = useState(() => {
    if (!isPersonalityCard(pendingCard)) return 5;
    const dim = pendingCard.dimension;
    const sameCount = player.hand.filter((c) => isPersonalityCard(c) && c.dimension === dim).length;
    return sameCount + 1 >= targets[dim] ? 20 : 5;
  });

  // Solo play is deliberately player-paced. A network claim window can still
  // use its countdown so an abandoned room does not block the table.
  useEffect(() => {
    if (!autoAdvance) return;
    if (countdown <= 0) {
      onResolveAI();
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [autoAdvance, countdown, onResolveAI]);

  // Only personality cards can be claimed
  if (!isPersonalityCard(pendingCard)) return null;

  const pendingDim = pendingCard.dimension;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="psy-panel psy-etched shrink-0 rounded-[1.3rem] p-3 space-y-3 sm:rounded-[1.6rem] sm:p-5 sm:space-y-4"
    >
      <div className="hidden items-center justify-end sm:flex">
        {autoAdvance && (
          <span className={`font-mono text-sm font-medium tabular-nums ${countdown <= 2 ? 'animate-pulse text-[var(--psy-danger)]' : 'text-[var(--psy-accent)]'}`}>
            {countdown}s
          </span>
        )}
      </div>

      {/* Show the pending discard card */}
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="flex flex-col items-center">
          <div className="rounded-xl p-1" style={{ backgroundColor: 'rgba(200, 155, 93, 0.08)', boxShadow: 'inset 0 0 0 1px rgba(200,155,93,0.18)' }}>
            <TarotCard {...cardToTarotProps(pendingCard, locale)} width={108} />
          </div>
        </div>

        <div className="flex-1 space-y-3 text-[11px] text-[var(--psy-ink-soft)] sm:text-xs">
          <div>
            <p className="psy-serif text-base text-[var(--psy-ink)] sm:text-lg">{discardedByName} {t.pongClueDiscarded}</p>
            <p className="mt-1 text-[var(--psy-ink-soft)]">{pendingCard.text}</p>
          </div>
          <div className="rounded-xl border border-[rgba(154,116,72,0.16)] bg-[rgba(253,248,241,0.78)] px-3 py-2">
            <p className="font-medium text-[var(--psy-ink)]">{t.pongCanClaim}</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 marker:text-[var(--psy-accent)] sm:space-y-1">
              <li>{t.pongTip1}</li>
              <li>{t.pongTip2}</li>
              <li>{t.pongTip3}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* The usual mobile progress rail is behind this panel. Keep all five
          target values visible while the player judges this discard. */}
      <div className="grid grid-cols-5 gap-1 sm:hidden">
        {DIMENSIONS.map((dimension) => (
          <div key={dimension} className="rounded-md border border-[rgba(154,116,72,0.16)] bg-[var(--psy-card-content)] px-1 py-1 text-center text-[9px] tabular-nums text-[var(--psy-ink-soft)]">
            <span className="font-semibold">{dimension}</span>{' '}
            <span>{targets[dimension]}{locale === 'en' ? '' : '張'}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-[var(--psy-ink-soft)]">
          {selectedCardIds.length > 0 && (
            <>{t.selectedPrefix} <span className="font-medium text-[var(--psy-accent-strong)]">{selectedCardIds.length}</span> {t.pongSelectedCandidates}</>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onSkip}
            className="rounded-full border px-3 py-1.5 text-[11px] font-medium transition sm:px-4 sm:py-2 sm:text-xs"
            style={{
              borderColor: 'rgba(200, 155, 93, 0.24)',
              color: 'var(--psy-ink-soft)',
              backgroundColor: '#fdf8f1',
            }}
          >
            {t.pongSkip}
          </button>
          <button onClick={() => onClaim(pendingDim, selectedCardIds)} className="psy-btn psy-btn-accent px-3 py-1.5 text-[11px] font-bold sm:px-4 sm:py-2 sm:text-xs">
            {t.archiveJudge}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
