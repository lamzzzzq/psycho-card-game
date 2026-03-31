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

      <div className="flex gap-1">
        {player.hand.map((card) => (
          <Card
            key={card.id}
            card={card}
            faceUp={infoMode === 'public'}
            compact
          />
        ))}
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
