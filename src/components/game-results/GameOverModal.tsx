'use client';

import { motion } from 'framer-motion';
import { Player } from '@/types';
import { getPlayerScore } from '@/lib/game-logic';
import { DIMENSION_META } from '@/data/dimensions';

interface GameOverModalProps {
  players: Player[];
  onPlayAgain: () => void;
  onBackToLobby: () => void;
}

export function GameOverModal({ players, onPlayAgain, onBackToLobby }: GameOverModalProps) {
  const ranked = [...players].sort((a, b) => getPlayerScore(b) - getPlayerScore(a));
  const winner = ranked[0];
  const isHumanWinner = winner.isHuman;

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
            {isHumanWinner ? '你的心理学知识帮你赢得了这场博弈' : '下次加油，看穿对手的心理！'}
          </p>
        </div>

        <div className="space-y-2">
          {ranked.map((player, i) => {
            const score = getPlayerScore(player);
            const medals = ['🥇', '🥈', '🥉', ''];
            return (
              <div
                key={player.id}
                className={`flex items-center justify-between rounded-xl p-3 ${
                  i === 0 ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-gray-800/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">{medals[i] || `#${i + 1}`}</span>
                  <span>{player.avatar}</span>
                  <div>
                    <div className={`text-sm font-medium ${player.isHuman ? 'text-purple-400' : 'text-gray-300'}`}>
                      {player.name}
                    </div>
                    <div className="flex gap-1 text-[9px] text-gray-600">
                      {player.hand.map((card) => (
                        <span key={card.id} style={{ color: DIMENSION_META[card.dimension].colorHex }}>
                          {card.dimension}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <span className="text-lg font-bold text-gray-200">{score.toFixed(1)}</span>
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
