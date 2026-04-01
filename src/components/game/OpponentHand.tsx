'use client';

import { useState } from 'react';
import { Player } from '@/types';
import { DIMENSION_META } from '@/data/dimensions';

interface OpponentHandProps {
  player: Player;
  isCurrentTurn: boolean;
  infoMode: 'hidden' | 'public';
}

export function OpponentHand({ player, isCurrentTurn, infoMode }: OpponentHandProps) {
  const [expandedDim, setExpandedDim] = useState<string | null>(null);

  return (
    <div className={`flex flex-col items-center gap-2 rounded-xl p-3 transition ${
      isCurrentTurn ? 'bg-yellow-500/10 ring-1 ring-yellow-500/30' : ''
    }`}>
      <div className="flex items-center gap-2">
        <span className="text-xl">{player.avatar}</span>
        <div className="text-left">
          <div className="text-sm font-medium text-gray-300">{player.name}</div>
          <div className="text-xs text-gray-500">
            {player.skipNextTurn && <span className="text-red-400">跳过中</span>}
            {isCurrentTurn && !player.skipNextTurn && <span className="text-yellow-400">思考中...</span>}
          </div>
        </div>
      </div>

      {/* Declared sets — click to expand */}
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
          {/* Expanded cards */}
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

      {/* Stacked hand cards */}
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

      {infoMode === 'public' && (
        <div className="flex gap-1 text-[9px] text-gray-600">
          {(['O', 'C', 'E', 'A', 'N'] as const).map((d) => (
            <span key={d}>{d}:{player.bigFiveScores[d].toFixed(1)}</span>
          ))}
        </div>
      )}
    </div>
  );
}
