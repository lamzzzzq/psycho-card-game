'use client';

import { useEffect, useState } from 'react';
import { motion, useAnimationControls } from 'framer-motion';
import { Player } from '@/types';
import { DIMENSION_META } from '@/data/dimensions';
import { Card } from './Card';

interface OpponentHandProps {
  player: Player;
  isCurrentTurn: boolean;
}

export function OpponentHand({ player, isCurrentTurn }: OpponentHandProps) {
  const [expandedDim, setExpandedDim] = useState<string | null>(null);
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
      className={`flex flex-col items-center gap-2 rounded-xl p-3 transition ${
        isCurrentTurn ? 'bg-yellow-500/10 ring-1 ring-yellow-500/30' : ''
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">{player.avatar}</span>
        <div className="text-left">
          <div className="text-sm font-medium text-gray-300">{player.name}</div>
          <div className="text-xs text-gray-500">
            {player.skipNextTurn && <span className="text-red-400">跳过中</span>}
            {player.revealedHand && <span className="text-orange-400 ml-1">手牌公开</span>}
            {isCurrentTurn && !player.skipNextTurn && <span className="text-yellow-400">思考中...</span>}
          </div>
        </div>
      </div>

      {/* Declared sets */}
      {player.declaredSets.length > 0 && (
        <div className="flex flex-col items-center gap-1 w-full">
          <div className="flex gap-1 flex-wrap justify-center">
            {player.declaredSets.map((set) => {
              const meta = DIMENSION_META[set.dimension];
              const isExpanded = expandedDim === set.dimension;
              return (
                <button
                  key={set.dimension}
                  onClick={() => setExpandedDim(isExpanded ? null : set.dimension)}
                  className="flex items-center gap-0.5 rounded px-1.5 py-0.5 transition hover:opacity-80 cursor-pointer"
                  style={{
                    backgroundColor: meta.colorHex + '25',
                    border: `1px solid ${meta.colorHex}40`,
                  }}
                >
                  <span className="text-[8px]" style={{ color: meta.colorHex }}>
                    {meta.name} ✓{set.cards.length}
                  </span>
                  <span className="text-[7px] text-gray-600">{isExpanded ? '▲' : '▼'}</span>
                </button>
              );
            })}
          </div>
          {expandedDim && (() => {
            const set = player.declaredSets.find((s) => s.dimension === expandedDim);
            if (!set) return null;
            const meta = DIMENSION_META[set.dimension];
            return (
              <div className="flex gap-0.5 flex-wrap justify-center mt-1">
                {set.cards.map((card) => (
                  <div
                    key={card.id}
                    className="w-10 h-14 rounded-md border flex items-center justify-center p-0.5"
                    style={{
                      backgroundColor: meta.colorHex + '15',
                      borderColor: meta.colorHex + '40',
                    }}
                  >
                    <p className="text-[5px] leading-tight text-gray-400 text-center line-clamp-3">
                      {card.text}
                    </p>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* Hand cards */}
      {showCards ? (
        // Hu-fail: full hand exposed
        <div className="flex gap-1 flex-wrap justify-center">
          {player.hand.map((card) => (
            <Card key={card.id} card={card} compact />
          ))}
        </div>
      ) : (
        // Hidden hand — stacked. If pong-failed, show the selected cards
        // face-up alongside the stack so everyone sees the failed attempt.
        <>
          {player.revealedSelectedCards && player.revealedSelectedCards.length > 0 && (
            <div className="flex flex-col items-center gap-1">
              <span className="text-[9px] text-orange-400">碰失败 — 公开</span>
              <div className="flex gap-1 flex-wrap justify-center">
                {player.revealedSelectedCards.map((card) => (
                  <Card key={card.id} card={card} compact />
                ))}
              </div>
            </div>
          )}
          <div className="relative flex items-center" style={{ height: 36 }}>
            {player.hand.map((card, i) => (
              <div
                key={card.id}
                className="absolute w-7 h-9 rounded-md bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-600 flex items-center justify-center"
                style={{ left: i * 8, zIndex: i }}
              >
                <span className="text-[8px] opacity-40">🧠</span>
              </div>
            ))}
            <div style={{ width: Math.max(28, (player.hand.length - 1) * 8 + 28) }} />
          </div>
        </>
      )}
    </motion.div>
  );
}
