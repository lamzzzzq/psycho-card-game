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
    <div className="psy-panel space-y-3 rounded-[1.2rem] p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="psy-serif text-[var(--psy-ink)]">计分板</span>
        <span className="text-[var(--psy-muted)]">
          第 {currentRound} / {totalRounds} 轮
        </span>
      </div>
      <div className="space-y-2">
        {sorted.map((player, i) => (
          <div key={player.id} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="w-4 text-xs text-[var(--psy-muted)]">#{i + 1}</span>
              <span>{player.avatar}</span>
              <span className={player.isHuman ? 'font-medium text-[var(--psy-accent)]' : 'text-[var(--psy-ink-soft)]'}>
                {player.name}
              </span>
            </div>
            <span className="font-mono text-[var(--psy-ink)] tabular-nums">
              {getPlayerScore(player).toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
