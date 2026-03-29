'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { QUESTIONS } from '@/data/questions';
import { useAssessmentStore } from '@/stores/useAssessmentStore';
import { DIMENSION_META } from '@/data/dimensions';
import { useHydrated } from '@/stores/useHydration';
import { QuestionCard } from '@/components/assessment/QuestionCard';
import { ProgressBar } from '@/components/assessment/ProgressBar';
import { LikertScore } from '@/types';

export default function AssessmentPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { answers, setAnswer, calculateScores, getProgress, isComplete, bigFiveScores } = useAssessmentStore();
  const [currentIndex, setCurrentIndex] = useState(0);

  // Wait for hydration
  if (!hydrated) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-gray-600">加载中...</p>
      </div>
    );
  }

  // If already completed, redirect to results
  if (bigFiveScores) {
    router.push('/results');
    return null;
  }

  const safeIndex = Math.min(currentIndex, QUESTIONS.length - 1);
  const question = QUESTIONS[safeIndex];
  const progress = getProgress();
  const isLast = safeIndex === QUESTIONS.length - 1;

  const handleSelect = (score: LikertScore) => {
    setAnswer(question.id, score);

    setTimeout(() => {
      const currentProgress = useAssessmentStore.getState().getProgress();
      if (isLast && currentProgress >= QUESTIONS.length) {
        calculateScores();
        router.push('/results');
      } else if (safeIndex < QUESTIONS.length - 1) {
        setCurrentIndex((i) => Math.min(i + 1, QUESTIONS.length - 1));
      }
    }, 300);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const handleNext = () => {
    if (currentIndex < QUESTIONS.length - 1) setCurrentIndex((i) => i + 1);
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-xl space-y-8"
      >
        <ProgressBar
          current={progress}
          total={QUESTIONS.length}
          currentDimension={question.dimension}
        />

        <QuestionCard
          question={question}
          selectedScore={answers[question.id]}
          onSelect={handleSelect}
          questionNumber={currentIndex + 1}
        />

        {/* Navigation buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="rounded-lg px-4 py-2 text-sm text-gray-400 transition hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            上一题
          </button>
          <button
            onClick={handleNext}
            disabled={currentIndex === QUESTIONS.length - 1}
            className="rounded-lg px-4 py-2 text-sm text-gray-400 transition hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            下一题
          </button>
        </div>

        {/* Question map: 60 tiles showing answered/unanswered/current */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>题目导航</span>
            <span>{progress}/60 已作答</span>
          </div>
          <div className="grid grid-cols-12 gap-1">
            {QUESTIONS.map((q, i) => {
              const isAnswered = answers[q.id] !== undefined;
              const isCurrent = i === safeIndex;
              const dimMeta = DIMENSION_META[q.dimension];
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(i)}
                  className={`h-6 rounded text-[9px] font-medium transition-all ${
                    isCurrent
                      ? 'ring-2 ring-white scale-110'
                      : ''
                  } ${
                    isAnswered
                      ? 'opacity-90'
                      : 'opacity-30'
                  }`}
                  style={{ backgroundColor: dimMeta.colorHex + (isAnswered ? '60' : '25'), color: dimMeta.colorHex }}
                  title={`#${i + 1} ${q.text}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="flex gap-3 justify-center text-[10px] text-gray-600">
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded bg-purple-400/60" /> 已答</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded bg-purple-400/25" /> 未答</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded bg-white ring-1 ring-white" /> 当前</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
