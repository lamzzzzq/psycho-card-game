'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAssessmentStore } from '@/stores/useAssessmentStore';
import { useHydrated } from '@/stores/useHydration';

export default function Home() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { bigFiveScores, getProgress } = useAssessmentStore();
  const progress = getProgress();
  const hasResults = hydrated && bigFiveScores !== null;

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-lg w-full text-center space-y-8"
      >
        <div className="space-y-3">
          <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">
            PsychoCard
          </h1>
          <p className="text-lg text-gray-400">
            探索你的人格，赢得心理博弈
          </p>
        </div>

        <div className="space-y-4 text-sm text-gray-500">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-gray-900 border border-gray-800 p-4">
              <div className="text-2xl mb-1">🧠</div>
              <div className="text-gray-300 font-medium">人格测评</div>
              <div className="text-xs mt-1">60 道专业题目</div>
            </div>
            <div className="rounded-xl bg-gray-900 border border-gray-800 p-4">
              <div className="text-2xl mb-1">🃏</div>
              <div className="text-gray-300 font-medium">卡牌对战</div>
              <div className="text-xs mt-1">4 人心理博弈</div>
            </div>
            <div className="rounded-xl bg-gray-900 border border-gray-800 p-4">
              <div className="text-2xl mb-1">🤖</div>
              <div className="text-gray-300 font-medium">AI 对手</div>
              <div className="text-xs mt-1">3 档智能难度</div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => router.push('/pvp')}
            className="block w-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 py-3 px-6 font-semibold text-white transition hover:opacity-90 cursor-pointer"
          >
            联机对战
          </button>
          {hasResults ? (
            <>
              <button
                onClick={() => router.push('/lobby')}
                className="block w-full rounded-full border border-gray-700 py-3 px-6 font-medium text-gray-300 transition hover:bg-gray-900 cursor-pointer"
              >
                单机对战（vs AI）
              </button>
              <button
                onClick={() => router.push('/results')}
                className="block w-full rounded-full border border-gray-700 py-3 px-6 font-medium text-gray-300 transition hover:bg-gray-900 cursor-pointer"
              >
                查看人格报告
              </button>
            </>
          ) : (
            <button
              onClick={() => router.push('/assessment')}
              className="block w-full rounded-full border border-gray-700 py-3 px-6 font-medium text-gray-300 transition hover:bg-gray-900 cursor-pointer"
            >
              {progress > 0 ? `继续测评 (${progress}/60)` : '开始测评'}
            </button>
          )}
          <button
            onClick={() => router.push('/stats')}
            className="block w-full rounded-full border border-gray-700 py-3 px-6 font-medium text-gray-300 transition hover:bg-gray-900 cursor-pointer text-sm"
          >
            数据统计
          </button>
        </div>
      </motion.div>
    </div>
  );
}
