'use client';

import { Player } from '@/types';
import { getPlayerScore } from '@/lib/game-logic';

interface ScoreBoardProps {
  players: Player[];
  currentRound: number;
  totalRounds: number;
}

export function ScoreBoard({ players, currentRound, totalRounds }: ScoreBoardProps) {
  const sorted = [...players].sort(
    (a, b) => getPlayerScore(b) - getPlayerScore(a)
  );

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-4 space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-gray-300">计分板</span>
        <span className="text-gray-500">
          第 {currentRound} / {totalRounds} 轮
        </span>
      </div>
      <div className="space-y-2">
        {sorted.map((player, i) => (
          <div key={player.id} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="w-4 text-xs text-gray-600">#{i + 1}</span>
              <span>{player.avatar}</span>
              <span className={player.isHuman ? 'text-purple-400 font-medium' : 'text-gray-400'}>
                {player.name}
              </span>
            </div>
            <span className="font-mono text-gray-300">{getPlayerScore(player).toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
