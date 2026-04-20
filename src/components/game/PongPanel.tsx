'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GameCard, Dimension, Player, isPersonalityCard } from '@/types';
import { getTargetCounts } from '@/lib/scoring';
import { getDeclaredDimensions } from '@/lib/game-logic';
import { Card } from './Card';

interface PongPanelProps {
  pendingCard: GameCard;
  player: Player;
  discardedByName: string;
  selectedCardIds: number[];
  onClaim: (dimension: Dimension, handCardIds: number[]) => void;
  onSkip: () => void;
  onResolveAI: () => void;
}

export function PongPanel({
  pendingCard,
  player,
  discardedByName,
  selectedCardIds,
  onClaim,
  onSkip,
  onResolveAI,
}: PongPanelProps) {
  const [countdown, setCountdown] = useState(5);
  const targets = getTargetCounts(player.bigFiveScores);
  const declaredDims = getDeclaredDimensions(player);

  // Auto-skip after countdown
  useEffect(() => {
    if (countdown <= 0) {
      onResolveAI();
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, onResolveAI]);

  // Only personality cards can be claimed
  if (!isPersonalityCard(pendingCard)) return null;

  const pendingDim = pendingCard.dimension;
  // Can the human claim this for any dimension?
  // The pending card's dimension determines what you'd declare
  const handCardsOfDim = player.hand.filter(
    (c) => isPersonalityCard(c) && c.dimension === pendingDim
  );
  const totalWithPending = handCardsOfDim.length + 1;
  const canClaimThisDim = !declaredDims.has(pendingDim) && totalWithPending >= targets[pendingDim];

  // No more disable on count threshold — let the player commit with any
  // selection. They eat the penalty if they're wrong; that's their call.

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="psy-panel psy-etched shrink-0 rounded-[1.3rem] p-3 space-y-3 sm:rounded-[1.6rem] sm:p-5 sm:space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="psy-serif text-sm font-semibold tracking-[0.04em] text-[var(--psy-accent)] sm:text-base">
          心理判读窗口
        </h3>
        <div className="hidden text-right sm:block">
          <div className="text-xs text-[var(--psy-muted)]">
            {discardedByName} 弃出了这张线索牌
          </div>
          <div className="mt-1 max-w-[16rem] line-clamp-1 text-[11px] text-[var(--psy-ink-soft)]">
            {pendingCard.text}
          </div>
        </div>
        <span className={`font-mono text-sm font-medium tabular-nums ${countdown <= 2 ? 'animate-pulse text-[var(--psy-danger)]' : 'text-[var(--psy-accent)]'}`}>
          {countdown}s
        </span>
      </div>

      {/* Show the pending discard card */}
      <div className="flex items-center gap-3 sm:gap-4">
        <div className="flex flex-col items-center gap-1">
          <span className="psy-serif text-[10px] uppercase tracking-[0.18em] text-[var(--psy-muted)]">弃牌样本</span>
          <div className="rounded-xl p-1" style={{ backgroundColor: 'rgba(200, 155, 93, 0.08)', boxShadow: 'inset 0 0 0 1px rgba(200,155,93,0.18)' }}>
            <Card card={pendingCard} tiny />
          </div>
        </div>

        <div className="flex-1 space-y-1 text-[11px] text-[var(--psy-ink-soft)] sm:text-xs">
          {canClaimThisDim ? (
            <div className="space-y-2">
              <p className="text-[var(--psy-ink)]">
                你可以尝试据此完成一组人格归档。
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-[var(--psy-ink-soft)] marker:text-[var(--psy-accent)] sm:space-y-1">
                <li>只选你判断为同一人格描述的手牌</li>
                <li>总张数要达到你的该维度要求</li>
                <li>混入其他人格牌会受罚</li>
              </ul>
            </div>
          ) : (
            <p className="text-[var(--psy-muted)]">
              你暂时无法用这张牌完成归档。
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-[var(--psy-ink-soft)]">
          {canClaimThisDim && selectedCardIds.length > 0 && (
            <>已选 <span className="text-white font-medium">{selectedCardIds.length}</span> 张候选牌</>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onSkip}
            className="rounded-full border px-3 py-1.5 text-[11px] font-medium transition sm:px-4 sm:py-2 sm:text-xs"
            style={{
              borderColor: 'rgba(200, 155, 93, 0.24)',
              color: 'var(--psy-ink-soft)',
              backgroundColor: 'rgba(255,255,255,0.02)',
            }}
          >
            暂不归档
          </button>
          {canClaimThisDim && (
            <button
              onClick={() => onClaim(pendingDim, selectedCardIds)}
              className="psy-btn psy-btn-accent px-3 py-1.5 text-[11px] font-bold sm:px-4 sm:py-2 sm:text-xs"
            >
              归档判定{selectedCardIds.length > 0 ? `（已选 ${selectedCardIds.length} 张）` : ''}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
