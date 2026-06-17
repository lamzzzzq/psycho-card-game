'use client';

import { motion } from 'framer-motion';
import { Player } from '@/types';
import { getRankings } from '@/lib/game-logic';
import { DeclaredArea } from '@/components/game/DeclaredArea';
import { STRINGS, type Locale } from '@/lib/i18n';

interface GameOverModalProps {
  players: Player[];
  onPlayAgain: () => void;
  onBackToLobby: () => void;
  locale?: Locale;
}

export function GameOverModal({ players, onPlayAgain, onBackToLobby, locale = 'zh' }: GameOverModalProps) {
  const tg = STRINGS[locale].game;
  const ranked = getRankings(players);
  const winner = ranked[0];
  const isHumanWinner = winner.isHuman;
  const hasFullWinner = winner.declaredSets.length === 5;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
    >
      <motion.div
        initial={{ scale: 0.8, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="psy-panel psy-etched w-full max-w-md space-y-6 rounded-[1.6rem] p-6"
      >
        <div className="space-y-2 text-center">
          <div className="text-4xl">{isHumanWinner ? '🏆' : '😤'}</div>
          <h2 className="psy-serif text-2xl text-[var(--psy-ink)]">
            {isHumanWinner ? tg.youWin : `${winner.name} ${tg.winShort}`}
          </h2>
          <p className="text-sm text-[var(--psy-muted)]">
            {hasFullWinner
              ? `${isHumanWinner ? (locale === 'en' ? 'You' : '你') : winner.name} ${tg.wonAllDims}`
              : tg.roundEndRank}
          </p>
        </div>

        <div className="space-y-2">
          {ranked.map((player, i) => {
            const declaredCount = player.declaredSets.length;
            const medals = ['🥇', '🥈', '🥉', ''];
            const isFirst = i === 0;
            return (
              <div
                key={player.id}
                className="space-y-2 rounded-[1.2rem] border p-3"
                style={{
                  borderColor: isFirst ? 'var(--psy-border-strong)' : 'rgba(200,155,93,0.14)',
                  background: isFirst ? 'var(--psy-accent-soft)' : 'rgba(255,255,255,0.02)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{medals[i] || `#${i + 1}`}</span>
                    <span>{player.avatar}</span>
                    <div className={`psy-serif text-sm ${player.isHuman ? 'text-[var(--psy-accent)]' : 'text-[var(--psy-ink)]'}`}>
                      {player.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-[var(--psy-ink)]">
                      {declaredCount}/5 {tg.archiveCount}
                    </div>
                    {player.hand.length > 0 && (
                      <div className="text-[10px] text-[var(--psy-danger)]">
                        {tg.remainingPrefix} {player.hand.length} {tg.cardsUnit}
                      </div>
                    )}
                  </div>
                </div>
                <DeclaredArea declaredSets={player.declaredSets} locale={locale} />
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button onClick={onPlayAgain} className="psy-btn psy-btn-accent flex-1 py-3 font-medium">
            {tg.playAgain}
          </button>
          <button onClick={onBackToLobby} className="psy-btn psy-btn-ghost px-6 py-3 text-sm">
            {tg.returnLobby}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
