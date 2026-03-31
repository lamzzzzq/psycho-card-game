'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Dimension, DIMENSIONS, Player, isPersonalityCard } from '@/types';
import { DIMENSION_META } from '@/data/dimensions';
import { getTargetCounts } from '@/lib/scoring';
import { getDeclaredDimensions } from '@/lib/game-logic';

interface DeclarePanelProps {
  player: Player;
  selectedCardIds: number[];
  onDeclare: (dimension: Dimension, cardIds: number[]) => void;
  onSkip: () => void;
}

export function DeclarePanel({ player, selectedCardIds, onDeclare, onSkip }: DeclarePanelProps) {
  const [selectedDim, setSelectedDim] = useState<Dimension | null>(null);
  const targets = getTargetCounts(player.bigFiveScores);
  const declaredDims = getDeclaredDimensions(player);

  // Count personality cards by dimension in hand
  const handByDim: Record<Dimension, number> = { O: 0, C: 0, E: 0, A: 0, N: 0 };
  for (const card of player.hand) {
    if (isPersonalityCard(card)) {
      handByDim[card.dimension]++;
    }
  }

  // Count how many selected cards match the chosen dimension
  const matchingCount = selectedDim
    ? selectedCardIds.filter((id) => {
        const card = player.hand.find((c) => c.id === id);
        return card && isPersonalityCard(card) && card.dimension === selectedDim;
      }).length
    : 0;
  const wrongCount = selectedCardIds.length - matchingCount;

  const canDeclare = selectedDim !== null &&
    !declaredDims.has(selectedDim) &&
    selectedCardIds.length >= targets[selectedDim];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-purple-300">DECLARE 阶段</h3>
        <span className="text-xs text-gray-500">选择要声明的维度，然后选牌确认</span>
      </div>

      {/* Dimension selector */}
      <div className="flex gap-2 flex-wrap">
        {DIMENSIONS.map((d) => {
          const meta = DIMENSION_META[d];
          const isDeclared = declaredDims.has(d);
          const hasEnough = handByDim[d] >= targets[d];
          const isSelected = selectedDim === d;

          return (
            <button
              key={d}
              disabled={isDeclared}
              onClick={() => setSelectedDim(isSelected ? null : d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isDeclared
                  ? 'bg-gray-800 text-gray-600 line-through cursor-not-allowed'
                  : isSelected
                  ? 'ring-2 ring-offset-1 ring-offset-gray-950'
                  : hasEnough
                  ? 'hover:opacity-80 cursor-pointer'
                  : 'opacity-40 cursor-pointer'
              }`}
              style={{
                backgroundColor: isDeclared ? undefined : meta.colorHex + '20',
                color: isDeclared ? undefined : meta.colorHex,
                // @ts-expect-error -- Tailwind ring-color via CSS custom property
                '--tw-ring-color': isSelected ? meta.colorHex : undefined,
              }}
            >
              {meta.name} {isDeclared ? '✓' : `${handByDim[d]}/${targets[d]}`}
            </button>
          );
        })}
      </div>

      {/* Selected info + actions */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-400">
          {selectedDim ? (
            <>
              已选 <span className="text-white font-medium">{selectedCardIds.length}</span> 张
              {selectedCardIds.length < targets[selectedDim] && (
                <span className="text-yellow-400 ml-1">
                  (需要 ≥ {targets[selectedDim]} 张)
                </span>
              )}
              {wrongCount > 0 && (
                <span className="text-red-400 ml-1">
                  (⚠ {wrongCount} 张不是{DIMENSION_META[selectedDim].name}！)
                </span>
              )}
            </>
          ) : (
            '选择一个维度开始 DECLARE，或跳过'
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onSkip}
            className="px-4 py-1.5 rounded-lg text-xs font-medium border border-gray-700 text-gray-400 hover:bg-gray-800 transition"
          >
            跳过
          </button>
          <button
            disabled={!canDeclare}
            onClick={() => {
              if (selectedDim) {
                onDeclare(selectedDim, selectedCardIds);
                setSelectedDim(null);
              }
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition ${
              canDeclare
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:opacity-90'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }`}
          >
            DECLARE!
          </button>
        </div>
      </div>
    </motion.div>
  );
}
