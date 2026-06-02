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
          心理判讀窗口
        </h3>
        <div className="hidden text-right sm:block">
          <div className="text-xs text-[var(--psy-muted)]">
            {discardedByName} 棄出了這張線索牌
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
          <span className="psy-serif text-[10px] uppercase tracking-[0.18em] text-[var(--psy-muted)]">棄牌樣本</span>
          <div className="rounded-xl p-1" style={{ backgroundColor: 'rgba(200, 155, 93, 0.08)', boxShadow: 'inset 0 0 0 1px rgba(200,155,93,0.18)' }}>
            <Card card={pendingCard} tiny />
          </div>
        </div>

        <div className="flex-1 space-y-1 text-[11px] text-[var(--psy-ink-soft)] sm:text-xs">
          {isAlreadyDeclared ? (
            <p className="text-[var(--psy-danger)] font-medium">
              ⚠️ 該維度你已歸檔 — 再次碰將判失敗 + 罰停。可暫不歸檔。
            </p>
          ) : canClaimThisDim ? (
            <div className="space-y-2">
              <p className="text-[var(--psy-ink)]">
                你可以嘗試據此完成一組人格歸檔。
              </p>
              <ul className="list-disc pl-4 space-y-0.5 text-[var(--psy-ink-soft)] marker:text-[var(--psy-accent)] sm:space-y-1">
                <li>只選你判斷爲同一人格描述的手牌</li>
                <li>總張數要達到你的該維度要求</li>
                <li>混入其他人格牌會受罰</li>
              </ul>
            </div>
          ) : (
            <p className="text-[var(--psy-muted)]">
              你暫時無法用這張牌完成歸檔。
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-[var(--psy-ink-soft)]">
          {canClaimThisDim && selectedCardIds.length > 0 && (
            <>已選 <span className="text-white font-medium">{selectedCardIds.length}</span> 張候選牌</>
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
            暫不歸檔
          </button>
          {canClaimThisDim && (
            <button
              onClick={() => onClaim(pendingDim, selectedCardIds)}
              disabled={selectedCardIds.length === 0}
              className={
                isAlreadyDeclared
                  ? 'psy-btn psy-btn-ghost px-3 py-1.5 text-[11px] font-bold opacity-60 disabled:cursor-not-allowed disabled:opacity-30 sm:px-4 sm:py-2 sm:text-xs'
                  : 'psy-btn psy-btn-accent px-3 py-1.5 text-[11px] font-bold disabled:cursor-not-allowed disabled:opacity-30 sm:px-4 sm:py-2 sm:text-xs'
              }
              title={
                selectedCardIds.length === 0
                  ? '請先點擊手牌選擇同維度卡'
                  : isAlreadyDeclared
                  ? '⚠️ 已歸檔維度 · 提交將判失敗 + 罰停'
                  : undefined
              }
            >
              歸檔判定{isAlreadyDeclared ? '（⚠️ 已歸檔）' : ''}{selectedCardIds.length > 0 ? `（已選 ${selectedCardIds.length} 張）` : '（請先選牌）'}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
