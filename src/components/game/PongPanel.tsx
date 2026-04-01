'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GameCard, Dimension, DIMENSIONS, Player, isPersonalityCard, PersonalityCard } from '@/types';
import { DIMENSION_META } from '@/data/dimensions';
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
  const dimMeta = DIMENSION_META[pendingDim];

  // Can the human claim this for any dimension?
  // The pending card's dimension determines what you'd declare
  const handCardsOfDim = player.hand.filter(
    (c) => isPersonalityCard(c) && c.dimension === pendingDim
  );
  const totalWithPending = handCardsOfDim.length + 1;
  const canClaimThisDim = !declaredDims.has(pendingDim) && totalWithPending >= targets[pendingDim];

  // For claim: player selects hand cards + pending card auto-included
  const selectedCorrectCount = selectedCardIds.filter((id) => {
    const card = player.hand.find((c) => c.id === id);
    return card && isPersonalityCard(card) && card.dimension === pendingDim;
  }).length;

  const neededFromHand = targets[pendingDim] - 1; // -1 because pending card counts
  const canConfirmClaim = selectedCardIds.length >= neededFromHand;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-orange-500/40 bg-orange-950/20 p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-orange-300">
          碰牌窗口 — {discardedByName} 弃了一张牌
        </h3>
        <span className={`text-sm font-mono font-bold ${countdown <= 2 ? 'text-red-400 animate-pulse' : 'text-orange-400'}`}>
          {countdown}s
        </span>
      </div>

      {/* Show the pending discard card */}
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] text-gray-500">被弃的牌</span>
          <div className="ring-2 ring-orange-400/50 rounded-xl">
            <Card card={pendingCard} />
          </div>
        </div>

        <div className="flex-1 text-xs text-gray-400 space-y-1">
          {canClaimThisDim ? (
            <p className="text-orange-300">
              你可以碰这张牌来 DECLARE <span style={{ color: dimMeta.colorHex }}>{dimMeta.name}</span>！
              <br />
              从手牌中选 ≥{neededFromHand} 张{dimMeta.name}的牌，然后点击碰
            </p>
          ) : (
            <p className="text-gray-500">
              你无法碰这张牌（{dimMeta.name}牌不够或已 DECLARE）
            </p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-400">
          {canClaimThisDim && selectedCardIds.length > 0 && (
            <>已选 <span className="text-white font-medium">{selectedCardIds.length}</span> 张</>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onSkip}
            className="px-4 py-1.5 rounded-lg text-xs font-medium border border-gray-700 text-gray-400 hover:bg-gray-800 transition"
          >
            跳过（让 AI 判断）
          </button>
          {canClaimThisDim && (
            <button
              disabled={!canConfirmClaim}
              onClick={() => onClaim(pendingDim, selectedCardIds)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
                canConfirmClaim
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:opacity-90'
                  : 'bg-gray-800 text-gray-600 cursor-not-allowed'
              }`}
            >
              碰！
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
