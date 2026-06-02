'use client';

import { Player } from '@/types';
import { getRankings } from '@/lib/game-logic';

interface ScoreBoardProps {
  players: Player[];
  currentRound: number;
  totalRounds: number;
}

export function ScoreBoard({ players, currentRound, totalRounds }: ScoreBoardProps) {
  // 排名口径统一：先比归档维度数（多者前），同数比剩余手牌（少者前）。
  const sorted = getRankings(players);

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
              归档 {player.declaredSets.length}/5
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
