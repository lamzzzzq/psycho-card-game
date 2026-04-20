'use client';

import { motion } from 'framer-motion';
import { Player, DIMENSIONS, isPersonalityCard } from '@/types';
import { getRankings } from '@/lib/game-logic';
import { DIMENSION_META } from '@/data/dimensions';
import { calculatePenaltyScore } from '@/lib/scoring';
import { DeclaredArea } from '@/components/game/DeclaredArea';

interface GameOverModalProps {
  players: Player[];
  onPlayAgain: () => void;
  onBackToLobby: () => void;
}

export function GameOverModal({ players, onPlayAgain, onBackToLobby }: GameOverModalProps) {
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
            {isHumanWinner ? '你赢了！' : `${winner.name} 获胜`}
          </h2>
          <p className="text-sm text-[var(--psy-muted)]">
            {hasFullWinner
              ? `${isHumanWinner ? '你' : winner.name}成功 DECLARE 了所有人格维度！`
              : '回合结束！按 DECLARE 进度和剩余手牌排名'}
          </p>
        </div>

        <div className="space-y-2">
          {ranked.map((player, i) => {
            const declaredCount = player.declaredSets.length;
            const penalty = calculatePenaltyScore(player.hand);
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
                      {declaredCount}/5 DECLARE
                    </div>
                    {player.hand.length > 0 && (
                      <div className="text-[10px] text-[var(--psy-danger)]">
                        剩余 {player.hand.length} 张 ({penalty})
                      </div>
                    )}
                  </div>
                </div>
                <DeclaredArea declaredSets={player.declaredSets} />
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button onClick={onPlayAgain} className="psy-btn psy-btn-accent flex-1 py-3 font-medium">
            再来一局
          </button>
          <button onClick={onBackToLobby} className="psy-btn psy-btn-ghost px-6 py-3 text-sm">
            返回大厅
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
