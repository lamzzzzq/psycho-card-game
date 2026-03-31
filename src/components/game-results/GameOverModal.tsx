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
        className="w-full max-w-md rounded-2xl border border-gray-700 bg-gray-900 p-6 space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="text-4xl">{isHumanWinner ? '🏆' : '😤'}</div>
          <h2 className="text-2xl font-bold text-gray-100">
            {isHumanWinner ? '你赢了！' : `${winner.name} 获胜`}
          </h2>
          <p className="text-sm text-gray-500">
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
            return (
              <div
                key={player.id}
                className={`rounded-xl p-3 space-y-2 ${
                  i === 0 ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-gray-800/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{medals[i] || `#${i + 1}`}</span>
                    <span>{player.avatar}</span>
                    <div>
                      <div className={`text-sm font-medium ${player.isHuman ? 'text-purple-400' : 'text-gray-300'}`}>
                        {player.name}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold text-gray-200">
                      {declaredCount}/5 DECLARE
                    </div>
                    {player.hand.length > 0 && (
                      <div className="text-[10px] text-red-400">
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
          <button
            onClick={onPlayAgain}
            className="flex-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 py-3 font-semibold text-white transition hover:opacity-90"
          >
            再来一局
          </button>
          <button
            onClick={onBackToLobby}
            className="rounded-full border border-gray-700 px-6 py-3 text-sm font-medium text-gray-400 transition hover:bg-gray-800"
          >
            返回大厅
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
