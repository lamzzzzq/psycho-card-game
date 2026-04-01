'use client';

import { Player } from '@/types';
import { Card } from './Card';
import { DeclaredArea } from './DeclaredArea';

interface OpponentHandProps {
  player: Player;
  isCurrentTurn: boolean;
  infoMode: 'hidden' | 'public';
}

export function OpponentHand({ player, isCurrentTurn, infoMode }: OpponentHandProps) {
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

      {/* Declared dimensions */}
      {player.declaredSets.length > 0 && (
        <DeclaredArea declaredSets={player.declaredSets} compact />
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
