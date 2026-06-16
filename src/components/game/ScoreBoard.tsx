'use client';

import { Player } from '@/types';
import { getRankings } from '@/lib/game-logic';
import { STRINGS, type Locale } from '@/lib/i18n';

interface ScoreBoardProps {
  players: Player[];
  currentRound: number;
  totalRounds: number;
  locale?: Locale;
}

export function ScoreBoard({ players, currentRound, totalRounds, locale = 'zh' }: ScoreBoardProps) {
  const t = STRINGS[locale].game;
  // 排名口徑統一：先比歸檔維度數（多者前），同數比剩餘手牌（少者前）。
  const sorted = getRankings(players);

  return (
    <div className="psy-panel space-y-3 rounded-[1.2rem] p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="psy-serif text-[var(--psy-ink)]">{t.scoreBoard}</span>
        <span className="text-[var(--psy-muted)]">
          {locale === 'en' ? `${t.roundOf} ${currentRound} / ${totalRounds}` : `第 ${currentRound} / ${totalRounds} 輪`}
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
              {t.archiveCount} {player.declaredSets.length}/5
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
