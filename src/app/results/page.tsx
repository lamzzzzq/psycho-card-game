'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAssessmentStore } from '@/stores/useAssessmentStore';
import { useHydrated } from '@/stores/useHydration';
import { RadarChart } from '@/components/results/RadarChart';
import { DimensionBar } from '@/components/results/DimensionBar';
import { DIMENSIONS } from '@/types';

export default function ResultsPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { bigFiveScores, reset } = useAssessmentStore();

  if (!hydrated) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-gray-600">加载中...</p>
      </div>
    );
  }

  if (!bigFiveScores) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-gray-400">尚未完成测评</p>
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

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg space-y-8"
      >
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            你的人格画像
          </h1>
          <p className="text-sm text-gray-500">Big Five Personality Profile</p>
        </div>

        <div className="flex justify-center">
          <RadarChart scores={bigFiveScores} />
        </div>

        <div className="space-y-4">
          {DIMENSIONS.map((d, i) => (
            <DimensionBar key={d} dimension={d} score={bigFiveScores[d]} delay={i * 0.15} />
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => router.push('/lobby')}
            className="flex-1 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 py-3 font-semibold text-white transition hover:opacity-90"
          >
            进入对战
          </button>
          <button
            onClick={() => {
              reset();
              router.push('/assessment');
            }}
            className="rounded-full border border-gray-700 px-6 py-3 text-sm font-medium text-gray-400 transition hover:bg-gray-900"
          >
            重新测评
          </button>
        </div>
      </motion.div>
    </div>
  );
}
