'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GameCard, Dimension, Player, isPersonalityCard } from '@/types';
import { getTargetCounts } from '@/lib/scoring';
import { getDeclaredDimensions } from '@/lib/game-logic';
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
  locale = 'zh',
}: PongPanelProps) {
  const t = STRINGS[locale].game;
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
  const handCardsOfDim = player.hand.filter(
    (c) => isPersonalityCard(c) && c.dimension === pendingDim
  );
  const totalWithPending = handCardsOfDim.length + 1;
  const isAlreadyDeclared = declaredDims.has(pendingDim);
  // 已歸檔維度也允許玩家點（強 trap）；點了 commit → engine 判 fail + 罰停。
  // 不要 gate sameInHand 閾值 — 玩家自己判斷，錯就喫罰。
  const canClaimThisDim = isAlreadyDeclared || totalWithPending >= targets[pendingDim];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="psy-panel psy-etched shrink-0 rounded-[1.3rem] p-3 space-y-3 sm:rounded-[1.6rem] sm:p-5 sm:space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="psy-serif text-sm font-semibold tracking-[0.04em] text-[var(--psy-accent)] sm:text-base">
          {t.pongPanelTitle}
        </h3>
        <div className="hidden text-right sm:block">
          <div className="text-xs text-[var(--psy-muted)]">
            {discardedByName} {t.pongClueDiscarded}
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
          <span className="psy-serif text-[10px] uppercase tracking-[0.18em] text-[var(--psy-muted)]">{t.pongSampleLabel}</span>
          <div className="rounded-xl p-1" style={{ backgroundColor: 'rgba(200, 155, 93, 0.08)', boxShadow: 'inset 0 0 0 1px rgba(200,155,93,0.18)' }}>
            <TarotCard {...cardToTarotProps(pendingCard, locale)} width={56} />
          </div>
        </div>

        <div className="flex-1 space-y-1 text-[11px] text-[var(--psy-ink-soft)] sm:text-xs">
          {/* 不洩露「已歸檔」資訊（強 trap）：已歸檔維度與正常可碰維度顯示完全
              相同的引導，玩家自行判斷。碰了若重複/混維度，由引擎判失敗 + 罰停。 */}
          {canClaimThisDim ? (
            <div className="space-y-2">
              <p className="text-[var(--psy-ink)]">
                {t.pongCanClaim}
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-[var(--psy-ink-soft)] marker:text-[var(--psy-accent)] sm:space-y-1">
                <li>{t.pongTip1}</li>
                <li>{t.pongTip2}</li>
                <li>{t.pongTip3}</li>
              </ul>
            </div>
          ) : (
            <p className="text-[var(--psy-muted)]">
              {t.pongCannotClaim}
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-[var(--psy-ink-soft)]">
          {canClaimThisDim && selectedCardIds.length > 0 && (
            <>{t.selectedPrefix} <span className="text-white font-medium">{selectedCardIds.length}</span> {t.pongSelectedCandidates}</>
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
            {t.pongSkip}
          </button>
          {canClaimThisDim && (
            <button
              onClick={() => onClaim(pendingDim, selectedCardIds)}
              // 截胡碰需选 target-1 张手牌(+那张弃牌=target)。target=1 时正解是「0 张手牌」，
              // 故仅在 target>1 时禁用空选；否则 target=1 维度永远无法碰、还会吃罚停。
              disabled={selectedCardIds.length === 0 && targets[pendingDim] > 1}
              className="psy-btn psy-btn-accent px-3 py-1.5 text-[11px] font-bold disabled:cursor-not-allowed disabled:opacity-30 sm:px-4 sm:py-2 sm:text-xs"
              title={
                selectedCardIds.length === 0 && targets[pendingDim] > 1
                  ? t.pongSelectFirst
                  : undefined
              }
            >
              {t.archiveJudge}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
