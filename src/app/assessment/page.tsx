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
import { saveAssessmentResult, checkStudentIdExists } from '@/lib/assessment-record';
import { normalizeStudentId, isValidStudentId, STUDENT_ID_LENGTH } from '@/lib/utils';
import { useLocaleStore, STRINGS } from '@/lib/i18n';

// 題目嚴格按 IPIP-50 文件「correct order」排列，不打亂。
export default function AssessmentPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { studentId, setStudentId, answers, setAnswer, calculateScores, setManualScores, getProgress, bigFiveScores, retaking } = useAssessmentStore();
  const [studentIdInput, setStudentIdInput] = useState('');
  const [checkingId, setCheckingId] = useState(false);
  const [dupWarn, setDupWarn] = useState(false); // 学号重复：第一次提示，再按一次放行
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualScores, setManualInputScores] = useState<BigFiveScores>({ O: 3.0, C: 3.0, E: 3.0, A: 3.0, N: 3.0 });
  const [rawInputs, setRawInputs] = useState<Record<string, string>>({ O: '3', C: '3', E: '3', A: '3', N: '3' });

  // SSR/首屏用 zh 與服務端一致，hydrate 後切到 ?lang/持久化語言（同主頁做法）。
  const localeRaw = useLocaleStore((s) => s.locale);
  const locale = hydrated ? localeRaw : 'zh';
  const t = STRINGS[locale].assessment;

  // 已完成測評則跳到結果頁（放 effect 裡，避免 render 期調 router.push）。
  // 重测中(retaking)即使有旧 bigFiveScores 也留在本页答题，不弹回结果。
  useEffect(() => {
    if (bigFiveScores && !retaking) router.push('/results');
  }, [bigFiveScores, retaking, router]);

  // 离开测评页时若仍在「重测中」（= 没答完）→ 作废本次重测，保留旧报告。
  // 完成时 calculateScores 已把 retaking 置 false，故正常完成不会触发。
  useEffect(() => {
    return () => {
      const s = useAssessmentStore.getState();
      if (s.retaking) s.cancelRetake();
    };
  }, []);

  // Wait for hydration
  if (!hydrated) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="psy-serif text-[var(--psy-muted)]">{STRINGS.zh.assessment.loading}</p>
      </div>
    );
  }

  // If already completed (and not retaking), the effect above redirects to results
  if (bigFiveScores && !retaking) {
    return null;
  }

  // 學號 gate：先收集學號，raw 答案按學號存
  if (!studentId) {
    const normalized = normalizeStudentId(studentIdInput);
    const idValid = isValidStudentId(studentIdInput);
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
            onSubmit={async (e) => {
              e.preventDefault();
              if (!idValid || checkingId) return;
              // 已提示过重复 → 用户坚持，直接放行
              if (dupWarn) {
                setStudentId(normalized);
                return;
              }
              // 首次：查重；重复则提示等待二次确认，不重复则直接进入
              setCheckingId(true);
              const exists = await checkStudentIdExists(normalized);
              setCheckingId(false);
              if (exists) {
                setDupWarn(true);
              } else {
                setStudentId(normalized);
              }
            }}
            className="space-y-4"
          >
            <input
              type="text"
              autoFocus
              maxLength={STUDENT_ID_LENGTH}
              value={studentIdInput}
              onChange={(e) => {
                // 大小写归一 + 去空白 + 截到 9 位（17094905g → 17094905G）
                setStudentIdInput(normalizeStudentId(e.target.value).slice(0, STUDENT_ID_LENGTH));
                if (dupWarn) setDupWarn(false); // 改了学号 → 重新查重
              }}
              placeholder={t.gatePlaceholder}
              className="w-full rounded-xl border px-4 py-3 text-center text-lg tracking-[0.15em] text-[var(--psy-ink)]"
              style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderColor: dupWarn ? 'rgba(220,106,79,0.55)' : 'rgba(200,155,93,0.18)' }}
            />
            {dupWarn ? (
              <p className="text-xs leading-5 text-[var(--psy-danger)]">{t.dupWarn}</p>
            ) : studentIdInput.length > 0 && !idValid ? (
              <p className="text-xs leading-5 text-[var(--psy-muted)]">{t.idLenHint}</p>
            ) : null}
            <button
              type="submit"
              disabled={!idValid || checkingId}
              className="psy-serif w-full rounded-full border border-[rgba(200,155,93,0.44)] bg-[#9b6430] py-3 font-semibold text-[#fff7eb] transition hover:opacity-95 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {checkingId ? t.gateChecking : dupWarn ? t.dupConfirm : t.gateStart}
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

        <div className="flex items-center justify-between gap-3">
          {/* 暴露當前學號，並提供更換入口（更換 = 清空學號回到輸入頁） */}
          <span className="text-xs text-[var(--psy-muted)]">
            {t.studentLabel}：
            <span className="ml-1 font-medium text-[var(--psy-ink-soft)]">{studentId}</span>
            <button
              onClick={() => { setStudentId(''); setStudentIdInput(''); setDupWarn(false); }}
              className="ml-2 underline decoration-[rgba(200,155,93,0.3)] underline-offset-4 transition hover:text-[var(--psy-ink-soft)]"
            >
              {t.changeStudent}
            </button>
          </span>
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
                    <span className="psy-serif w-28 shrink-0 truncate text-sm" style={{ color: meta.colorHex }}>{metaName}</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      lang="en"
                      value={rawInputs[d]}
                      onChange={(e) => {
                        // 只留数字 + 一个小数点（type=number 会吞掉「3.」中间态导致无法输入小数）
                        const raw = e.target.value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
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
          <div className="grid grid-cols-10 gap-1 sm:grid-cols-12">
            {QUESTIONS.map((q, i) => {
              const isAnswered = answers[q.id] !== undefined;
              const isCurrent = i === safeIndex;
              // 不按維度上色：統一中性金，避免從導航格暗示題目維度。
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(i)}
                  className={`h-8 rounded text-[10px] font-medium transition-all sm:h-6 sm:text-[9px] ${
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
