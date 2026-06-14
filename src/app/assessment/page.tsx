'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { QUESTIONS } from '@/data/questions';
import { useAssessmentStore } from '@/stores/useAssessmentStore';
import { DIMENSION_META } from '@/data/dimensions';
import { useHydrated } from '@/stores/useHydration';
import { QuestionCard } from '@/components/assessment/QuestionCard';
import { LikertScore, BigFiveScores, DIMENSIONS } from '@/types';
import { saveAssessmentResult } from '@/lib/assessment-record';
import { useLocaleStore, STRINGS } from '@/lib/i18n';

// 題目嚴格按 IPIP-50 文件「correct order」排列，不打亂。
export default function AssessmentPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { studentId, setStudentId, answers, setAnswer, calculateScores, setManualScores, getProgress, bigFiveScores } = useAssessmentStore();
  const [studentIdInput, setStudentIdInput] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualScores, setManualInputScores] = useState<BigFiveScores>({ O: 3.0, C: 3.0, E: 3.0, A: 3.0, N: 3.0 });
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({ O: '3', C: '3', E: '3', A: '3', N: '3' });

  // SSR/首屏用 zh 與服務端一致，hydrate 後切到 ?lang/持久化語言（同主頁做法）。
  const localeRaw = useLocaleStore((s) => s.locale);
  const locale = hydrated ? localeRaw : 'zh';
  const t = STRINGS[locale].assessment;

  // 已完成測評則跳到結果頁（放 effect 裡，避免 render 期調 router.push）
  useEffect(() => {
    if (bigFiveScores) router.push('/results');
  }, [bigFiveScores, router]);

  // Wait for hydration
  if (!hydrated) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="psy-serif text-[var(--psy-muted)]">{STRINGS.zh.assessment.loading}</p>
      </div>
    );
  }

  // If already completed, the effect above redirects to results
  if (bigFiveScores) {
    return null;
  }

  // 學號 gate：先收集學號，raw 答案按學號存
  if (!studentId) {
    const trimmed = studentIdInput.trim();
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-8">
        <button
          onClick={() => router.push('/')}
          className="psy-btn psy-btn-ghost psy-serif fixed left-4 top-4 z-40 px-3 py-1.5 text-xs sm:left-8 sm:top-8"
        >
          ← {t.backHome}
        </button>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="psy-panel psy-etched w-full max-w-md space-y-6 rounded-[1.7rem] p-8 text-center"
        >
          <div className="space-y-3">
            <p className="psy-serif text-xs uppercase tracking-[0.4em] text-[var(--psy-ink-soft)]">
              {t.eyebrow}
            </p>
            <h1 className="psy-serif text-2xl text-[var(--psy-ink)]">{t.gateTitle}</h1>
            <p className="mx-auto max-w-sm text-sm leading-7 text-[var(--psy-ink-soft)]">
              {t.gateHint}
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (trimmed) setStudentId(trimmed);
            }}
            className="space-y-4"
          >
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              value={studentIdInput}
              onChange={(e) => setStudentIdInput(e.target.value)}
              placeholder={t.gatePlaceholder}
              className="w-full rounded-xl border px-4 py-3 text-center text-lg text-[var(--psy-ink)]"
              style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: 'rgba(200,155,93,0.18)' }}
            />
            <button
              type="submit"
              disabled={!trimmed}
              className="psy-serif w-full rounded-full border border-[rgba(200,155,93,0.44)] bg-[#9b6430] py-3 font-semibold text-[#fff7eb] transition hover:opacity-95 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {t.gateStart}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const total = QUESTIONS.length;
  const safeIndex = Math.min(currentIndex, total - 1);
  const question = QUESTIONS[safeIndex];
  const progress = getProgress();
  const isLast = safeIndex === total - 1;

  const handleSelect = (score: LikertScore) => {
    setAnswer(question.id, score);

    setTimeout(() => {
      const currentProgress = useAssessmentStore.getState().getProgress();
      if (isLast && currentProgress >= total) {
        const scores = calculateScores();
        // 答完即把「答案 + 分數」寫成一行（非阻塞，失敗不影響流程）
        const sid = useAssessmentStore.getState().studentId;
        const allAnswers = useAssessmentStore.getState().answers;
        if (sid) void saveAssessmentResult(sid, allAnswers, scores, 'assessment');
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
      <button
        onClick={() => router.push('/')}
        className="psy-btn psy-btn-ghost psy-serif fixed left-4 top-4 z-40 px-3 py-1.5 text-xs sm:left-8 sm:top-8"
      >
        ← {t.backHome}
      </button>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full max-w-3xl space-y-8"
      >
        <div className="space-y-4 text-center">
          <p className="psy-serif text-xs uppercase tracking-[0.4em] text-[var(--psy-ink-soft)]">
            {t.eyebrow}
          </p>
          <h1 className="psy-serif text-3xl text-[var(--psy-ink)] md:text-4xl">
            {t.title}
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-[var(--psy-ink-soft)]">
            {t.intro}
          </p>
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => setShowManualInput(!showManualInput)}
            className="text-xs text-[var(--psy-muted)] transition underline decoration-[rgba(200,155,93,0.3)] underline-offset-4 hover:text-[var(--psy-ink-soft)]"
          >
            {showManualInput ? t.backToAssess : t.skipToManual}
          </button>
        </div>

        {/* Manual input panel */}
        {showManualInput ? (
          <div className="psy-panel psy-etched space-y-5 rounded-[1.7rem] p-6">
            <h3 className="psy-serif text-lg font-medium text-[var(--psy-ink)]">{t.manualTitle}</h3>
            <div className="space-y-3">
              {DIMENSIONS.map((d) => {
                const meta = DIMENSION_META[d];
                const metaName = locale === 'en' ? meta.nameEn : meta.name;
                return (
                  <div key={d} className="flex items-center gap-3">
                    <span className="psy-serif w-28 text-sm" style={{ color: meta.colorHex }}>{metaName}</span>
                    <input
                      type="number"
                      min="1"
                      max="5"
                      step="0.1"
                      inputMode="decimal"
                      lang="en"
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
                // 手動填分也存一行（答案為空，source=manual）
                const sid = useAssessmentStore.getState().studentId;
                if (sid) void saveAssessmentResult(sid, {}, manualScores, 'manual');
                router.push('/results');
              }}
              className="psy-serif w-full rounded-full border border-[rgba(200,155,93,0.44)] bg-[linear-gradient(135deg,#9b6430_0%,#d4a469_100%)] py-3 font-semibold text-[#fff7eb] transition hover:opacity-95"
            >
              {t.manualConfirm}
            </button>
          </div>
        ) : (
        <>

        <QuestionCard
          question={question}
          selectedScore={answers[question.id]}
          onSelect={handleSelect}
          locale={locale}
        />

        {/* Navigation buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="rounded-full border border-[rgba(200,155,93,0.18)] px-4 py-2 text-sm text-[var(--psy-ink-soft)] transition hover:bg-[rgba(200,155,93,0.08)] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {t.prev}
          </button>
          <button
            onClick={handleNext}
            disabled={currentIndex === total - 1}
            className="rounded-full border border-[rgba(200,155,93,0.18)] px-4 py-2 text-sm text-[var(--psy-ink-soft)] transition hover:bg-[rgba(200,155,93,0.08)] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {t.next}
          </button>
        </div>

        {/* Question map: tiles showing answered/unanswered/current */}
        <div className="psy-panel psy-etched space-y-3 rounded-[1.5rem] p-4">
          <div className="flex items-center justify-between text-xs text-[var(--psy-muted)]">
            <span>{t.navTitle}</span>
            <span>{progress}/{total} {t.answeredSuffix}</span>
          </div>
          <div className="grid grid-cols-12 gap-1">
            {QUESTIONS.map((q, i) => {
              const isAnswered = answers[q.id] !== undefined;
              const isCurrent = i === safeIndex;
              // 不按維度上色：統一中性金，避免從導航格暗示題目維度。
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
                  style={{
                    backgroundColor: `rgba(200,155,93,${isAnswered ? '0.6' : '0.22'})`,
                    color: isAnswered ? '#fff7eb' : 'rgba(200,155,93,0.8)',
                  }}
                  title={`#${i + 1} ${locale === 'en' ? q.textEn : q.text}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="flex justify-center gap-3 text-[10px] text-[var(--psy-muted)]">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded" style={{ backgroundColor: 'rgba(200,155,93,0.6)' }} /> {t.legendAnswered}</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded" style={{ backgroundColor: 'rgba(200,155,93,0.25)' }} /> {t.legendUnanswered}</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded bg-white ring-1 ring-white" /> {t.legendCurrent}</span>
          </div>
        </div>
        </>
        )}
      </motion.div>
    </div>
  );
}
