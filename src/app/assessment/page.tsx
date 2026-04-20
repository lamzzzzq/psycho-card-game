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
import { LikertScore, Question, BigFiveScores, DIMENSIONS } from '@/types';
import { shuffle } from '@/lib/utils';

type QuestionOrder = 'sequential' | 'shuffled';

function getOrderedQuestions(mode: QuestionOrder): Question[] {
  if (mode === 'shuffled') return shuffle(QUESTIONS);
  return QUESTIONS;
}

export default function AssessmentPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { answers, setAnswer, calculateScores, setManualScores, getProgress, bigFiveScores } = useAssessmentStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [orderMode, setOrderMode] = useState<QuestionOrder>('sequential');
  const [orderedQuestions, setOrderedQuestions] = useState<Question[]>(QUESTIONS);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualScores, setManualInputScores] = useState<BigFiveScores>({ O: 3.0, C: 3.0, E: 3.0, A: 3.0, N: 3.0 });
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({ O: '3', C: '3', E: '3', A: '3', N: '3' });

  const toggleOrder = () => {
    const newMode = orderMode === 'sequential' ? 'shuffled' : 'sequential';
    setOrderMode(newMode);
    setOrderedQuestions(getOrderedQuestions(newMode));
    setCurrentIndex(0);
  };

  // Wait for hydration
  if (!hydrated) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="psy-serif text-[var(--psy-muted)]">加载中…</p>
      </div>
    );
  }

  // If already completed, redirect to results
  if (bigFiveScores) {
    router.push('/results');
    return null;
  }

  const total = orderedQuestions.length;
  const safeIndex = Math.min(currentIndex, total - 1);
  const question = orderedQuestions[safeIndex];
  const progress = getProgress();
  const isLast = safeIndex === total - 1;

  const handleSelect = (score: LikertScore) => {
    setAnswer(question.id, score);

    setTimeout(() => {
      const currentProgress = useAssessmentStore.getState().getProgress();
      if (isLast && currentProgress >= total) {
        calculateScores();
        router.push('/results');
      } else if (safeIndex < total - 1) {
        setCurrentIndex((i) => Math.min(i + 1, total - 1));
      }
    }, 300);
  };

  const handlePrev = () => {
    if (currentIndex > 0) setCurrentIndex((i) => i - 1);
  };

  const handleNext = () => {
    if (currentIndex < total - 1) setCurrentIndex((i) => i + 1);
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-8">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-3xl space-y-8"
      >
        <div className="space-y-4 text-center">
          <p className="psy-serif text-xs uppercase tracking-[0.4em] text-[var(--psy-ink-soft)]">
            Persona Reading
          </p>
          <h1 className="psy-serif text-3xl text-[var(--psy-ink)] md:text-4xl">
            抽取你的人格原型
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-[var(--psy-ink-soft)]">
            每一道陈述题都像翻开一张隐喻牌面。你给出的倾向，会在结尾汇聚成五维人格图谱，并影响后续牌局目标。
          </p>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => setShowManualInput(!showManualInput)}
            className="text-xs text-[var(--psy-muted)] transition underline decoration-[rgba(200,155,93,0.3)] underline-offset-4 hover:text-[var(--psy-ink-soft)]"
          >
            {showManualInput ? '返回测评' : '跳过测评，手动输入分数'}
          </button>
        </div>

        {/* Manual input panel */}
        {showManualInput ? (
          <div className="psy-panel psy-etched space-y-5 rounded-[1.7rem] p-6">
            <h3 className="psy-serif text-lg font-medium text-[var(--psy-ink)]">手动录入人格刻度</h3>
            <div className="space-y-3">
              {DIMENSIONS.map((d) => {
                const meta = DIMENSION_META[d];
                return (
                  <div key={d} className="flex items-center gap-3">
                    <span className="psy-serif w-16 text-sm" style={{ color: meta.colorHex }}>{meta.name}</span>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      step="0.1"
                      value={rawInputs[d]}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setRawInputs(prev => ({ ...prev, [d]: raw }));
                        const val = parseFloat(raw);
                        if (!isNaN(val)) setManualInputScores({ ...manualScores, [d]: val });
                      }}
                      onBlur={() => {
                        const val = parseFloat(rawInputs[d]);
                        const clamped = isNaN(val) ? 3 : Math.min(5, Math.max(1, val));
                        setManualInputScores({ ...manualScores, [d]: clamped });
                        setRawInputs(prev => ({ ...prev, [d]: String(clamped) }));
                      }}
                      className="w-20 rounded-lg border px-3 py-1.5 text-center text-sm text-[var(--psy-ink)]"
                      style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(200,155,93,0.18)' }}
                    />
                    <div className="h-2 flex-1 rounded-full bg-[rgba(255,255,255,0.05)]">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${((manualScores[d] - 1) / 4) * 100}%`, backgroundColor: meta.colorHex }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              onClick={() => {
                setManualScores(manualScores);
                router.push('/results');
              }}
              className="psy-serif w-full rounded-full border border-[rgba(200,155,93,0.44)] bg-[linear-gradient(135deg,#9b6430_0%,#d4a469_100%)] py-3 font-semibold text-[#fff7eb] transition hover:opacity-95"
            >
              确认分数，进入游戏
            </button>
          </div>
        ) : (
        <>

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
            className="rounded-full border border-[rgba(200,155,93,0.18)] px-4 py-2 text-sm text-[var(--psy-ink-soft)] transition hover:bg-[rgba(200,155,93,0.08)] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            上一题
          </button>
          <button
            onClick={toggleOrder}
            className={`rounded-full px-3 py-1.5 text-xs transition border ${
              orderMode === 'shuffled'
                ? 'border-[rgba(200,155,93,0.4)] bg-[rgba(200,155,93,0.14)] text-[var(--psy-accent)]'
                : 'border-[rgba(200,155,93,0.18)] text-[var(--psy-muted)] hover:text-[var(--psy-ink-soft)]'
            }`}
          >
            {orderMode === 'sequential' ? '打乱顺序' : '按维度排列'}
          </button>
          <button
            onClick={handleNext}
            disabled={currentIndex === total - 1}
            className="rounded-full border border-[rgba(200,155,93,0.18)] px-4 py-2 text-sm text-[var(--psy-ink-soft)] transition hover:bg-[rgba(200,155,93,0.08)] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            下一题
          </button>
        </div>

        {/* Question map: 60 tiles showing answered/unanswered/current */}
        <div className="psy-panel psy-etched space-y-3 rounded-[1.5rem] p-4">
          <div className="flex items-center justify-between text-xs text-[var(--psy-muted)]">
            <span>题目导航</span>
            <span>{progress}/60 已作答</span>
          </div>
          <div className="grid grid-cols-12 gap-1">
            {orderedQuestions.map((q, i) => {
              const isAnswered = answers[q.id] !== undefined;
              const isCurrent = i === safeIndex;
              const dimMeta = DIMENSION_META[q.dimension];
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(i)}
                  className={`h-6 rounded text-[9px] font-medium transition-all ${
                    isCurrent
                      ? 'ring-2 ring-[var(--psy-ink)] scale-110'
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
          <div className="flex justify-center gap-3 text-[10px] text-[var(--psy-muted)]">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded" style={{ backgroundColor: 'rgba(200,155,93,0.6)' }} /> 已答</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded" style={{ backgroundColor: 'rgba(200,155,93,0.25)' }} /> 未答</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded bg-white ring-1 ring-white" /> 当前</span>
          </div>
        </div>
        </>
        )}
      </motion.div>
    </div>
  );
}
