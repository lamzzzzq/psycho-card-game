'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAssessmentStore } from '@/stores/useAssessmentStore';
import { useGameStore } from '@/stores/useGameStore';
import { AI_PERSONAS } from '@/data/ai-personas';
import { AIDifficulty, InfoMode } from '@/types';

export default function LobbyPage() {
  const router = useRouter();
  const { bigFiveScores } = useAssessmentStore();
  const { initGame } = useGameStore();

  const [difficulty, setDifficulty] = useState<AIDifficulty>('easy');
  const [infoMode, setInfoMode] = useState<InfoMode>('hidden');
  const [totalRounds, setTotalRounds] = useState(10);

  if (!bigFiveScores) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-gray-400">请先完成人格测评</p>
          <button
            onClick={() => router.push('/assessment')}
            className="rounded-full bg-purple-500 px-6 py-2 text-sm font-medium text-white"
          >
            开始测评
          </button>
        </div>
      </div>
    );
  }

  const handleStart = () => {
    initGame(bigFiveScores, { totalRounds, aiDifficulty: difficulty, infoMode });
    router.push('/game');
  };

  const difficultyOptions: { value: AIDifficulty; label: string; desc: string }[] = [
    { value: 'easy', label: '简单', desc: '凭直觉出牌' },
    { value: 'medium', label: '中等', desc: '会记牌分析' },
    { value: 'hard', label: '困难', desc: '推测你的心理' },
  ];

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg space-y-8"
      >
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-gray-100">对战大厅</h1>
          <p className="text-sm text-gray-500">设置游戏参数，准备开战</p>
        </div>

        {/* AI Difficulty */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-300">AI 难度</label>
          <div className="grid grid-cols-3 gap-2">
            {difficultyOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setDifficulty(opt.value)}
                className={`rounded-xl border-2 p-3 text-center transition ${
                  difficulty === opt.value
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-gray-800 hover:border-gray-600'
                }`}
              >
                <div className="text-sm font-medium text-gray-200">{opt.label}</div>
                <div className="text-xs text-gray-500 mt-1">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Info Mode */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-300">信息模式</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setInfoMode('hidden')}
              className={`rounded-xl border-2 p-3 text-center transition ${
                infoMode === 'hidden'
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-gray-800 hover:border-gray-600'
              }`}
            >
              <div className="text-sm font-medium text-gray-200">🕵️ 隐藏</div>
              <div className="text-xs text-gray-500 mt-1">推测对手性格</div>
            </button>
            <button
              onClick={() => setInfoMode('public')}
              className={`rounded-xl border-2 p-3 text-center transition ${
                infoMode === 'public'
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-gray-800 hover:border-gray-600'
              }`}
            >
              <div className="text-sm font-medium text-gray-200">📊 公开</div>
              <div className="text-xs text-gray-500 mt-1">所有分数可见</div>
            </button>
          </div>
        </div>

        {/* Rounds */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-300">游戏轮数</label>
          <div className="grid grid-cols-3 gap-2">
            {[5, 10, 15].map((r) => (
              <button
                key={r}
                onClick={() => setTotalRounds(r)}
                className={`rounded-xl border-2 p-3 text-center transition ${
                  totalRounds === r
                    ? 'border-purple-500 bg-purple-500/10'
                    : 'border-gray-800 hover:border-gray-600'
                }`}
              >
                <div className="text-sm font-medium text-gray-200">{r} 轮</div>
                <div className="text-xs text-gray-500 mt-1">
                  {r === 5 ? '快速' : r === 10 ? '标准' : '持久'}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* AI Opponents Preview */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-300">对手阵容</label>
          <div className="grid grid-cols-3 gap-2">
            {AI_PERSONAS.map((p) => (
              <div key={p.id} className="rounded-xl border border-gray-800 bg-gray-900/50 p-3 text-center">
                <div className="text-2xl">{p.avatar}</div>
                <div className="text-sm font-medium text-gray-300 mt-1">{p.name}</div>
                <div className="text-xs text-gray-600 mt-0.5">{p.description}</div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleStart}
          className="w-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 py-3 font-semibold text-white transition hover:opacity-90"
        >
          开始对战
        </button>
      </motion.div>
    </div>
  );
}
