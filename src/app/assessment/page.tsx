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
import { saveAssessmentResult, checkStudentIdExists, restoreAssessmentScores } from '@/lib/assessment-record';
import { normalizeStudentId, isValidStudentId, STUDENT_ID_LENGTH, clamp } from '@/lib/utils';
import { useLocaleStore, STRINGS } from '@/lib/i18n';

// 題目嚴格按 IPIP-50 文件「correct order」排列，不打亂。
export default function AssessmentPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { studentId, setStudentId, answers, setAnswer, calculateScores, setManualScores, getProgress, bigFiveScores, retaking } = useAssessmentStore();
  const [studentIdInput, setStudentIdInput] = useState('');
  const [checkingId, setCheckingId] = useState(false);
  const [dupWarn, setDupWarn] = useState(false); // 学号重复：展示 恢复 / 覆盖 两个选择
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState(false);
  // 「更換學號」：只强制显示 gate 让用户重输，不清空持久化的旧学号。
  // 只有在 gate 里真正提交了新学号才 commit——否则（没做任何操作就退出）旧学号登录记录保留。
  const [changingId, setChangingId] = useState(false);
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

  // 學號 gate：先收集學號，raw 答案按學號存。changingId=更換學號時强制重入（旧学号仍在背景保留）。
  if (!studentId || changingId) {
    const normalized = normalizeStudentId(studentIdInput);
    const idValid = isValidStudentId(studentIdInput);
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-8">
        <div className="w-full max-w-md space-y-3">
          <button
            onClick={() => router.push('/')}
            className="text-sm text-[var(--psy-muted)] underline decoration-[rgba(200,155,93,0.28)] underline-offset-4 transition hover:text-[var(--psy-ink-soft)]"
          >
            ← {t.backHome}
          </button>
          <motion.div
            initial={false}
            animate={{ opacity: 1 }}
            className="psy-panel psy-etched w-full space-y-6 rounded-[1.7rem] p-8 text-center"
          >
          <div className="space-y-3">
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
                setChangingId(false);
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
                setChangingId(false);
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
              className="psy-input text-center text-lg tracking-[0.15em]"
              style={{ borderColor: dupWarn ? 'rgba(201,96,63,0.55)' : undefined }}
            />
            {dupWarn ? (
              <p className="text-xs leading-5 text-[var(--psy-accent)]">{t.dupWarn}</p>
            ) : studentIdInput.length > 0 && !idValid ? (
              <p className="text-xs leading-5 text-[var(--psy-muted)]">{t.idLenHint}</p>
            ) : null}
            {dupWarn ? (
              // 已有记录：恢复(拉回旧分数直接进报告) / 覆盖(重新测评)
              <div className="space-y-2">
                <button
                  type="button"
                  disabled={restoring}
                  onClick={async () => {
                    setRestoreError(false);
                    setRestoring(true);
                    const scores = await restoreAssessmentScores(normalized);
                    setRestoring(false);
                    if (scores) {
                      setStudentId(normalized);
                      setChangingId(false);
                      setManualScores(scores); // 标记完成 + 写入分数（本地）
                      router.push('/results');
                    } else {
                      setRestoreError(true);
                    }
                  }}
                  className="psy-btn psy-btn-accent psy-serif w-full py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {restoring ? t.restoring : t.dupRestore}
                </button>
                <button
                  type="button"
                  onClick={() => { setStudentId(normalized); setChangingId(false); }}
                  className="psy-btn psy-btn-ghost psy-serif w-full py-3 font-semibold"
                >
                  {t.dupOverwrite}
                </button>
                {restoreError && (
                  <p className="text-xs leading-5 text-[var(--psy-danger)]">{t.restoreFailed}</p>
                )}
              </div>
            ) : (
              <button
                type="submit"
                disabled={!idValid || checkingId}
                className="psy-btn psy-btn-accent psy-serif w-full py-3 font-semibold disabled:cursor-not-allowed disabled:opacity-30"
              >
                {checkingId ? t.gateChecking : t.gateStart}
              </button>
            )}
          </form>
          </motion.div>
        </div>
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
    <div className="flex flex-1 flex-col items-center px-6 py-8">
      <motion.div
        initial={false}
        animate={{ opacity: 1 }}
        className="w-full max-w-3xl space-y-8"
      >
        <div className="space-y-3">
          <button
            onClick={() => router.push('/')}
            className="text-sm text-[var(--psy-muted)] underline decoration-[rgba(200,155,93,0.28)] underline-offset-4 transition hover:text-[var(--psy-ink-soft)]"
          >
            ← {t.backHome}
          </button>
          <h1 className="psy-serif text-3xl leading-none text-[var(--psy-ink)] md:text-4xl">
            {t.title}
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-[var(--psy-ink-soft)]">
            {t.intro}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          {/* 暴露當前學號，並提供更換入口（更換 = 清空學號回到輸入頁） */}
          <span className="text-xs text-[var(--psy-muted)]">
            {t.studentLabel}：
            <span className="ml-1 font-medium text-[var(--psy-ink-soft)]">{studentId}</span>
            <button
              onClick={() => { setChangingId(true); setStudentIdInput(''); setDupWarn(false); }}
              className="ml-2 underline decoration-[rgba(150,118,78,0.3)] underline-offset-4 transition hover:text-[var(--psy-ink-soft)]"
            >
              {t.changeStudent}
            </button>
          </span>
          <button
            onClick={() => setShowManualInput(!showManualInput)}
            className="text-xs text-[var(--psy-muted)] transition underline decoration-[rgba(150,118,78,0.3)] underline-offset-4 hover:text-[var(--psy-ink-soft)]"
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
                      className="psy-input w-20 px-3 py-1.5 text-center text-sm"
                    />
                    <div className="h-2 flex-1 rounded-full bg-[rgba(150,118,78,0.12)]">
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
                // 提交前统一 clamp 到 [1,5]：防越界值绕过 onBlur(不失焦直接确认/回车) → 脏分数 + target/手牌异常。
                const safe: BigFiveScores = { O: clamp(manualScores.O, 1, 5), C: clamp(manualScores.C, 1, 5), E: clamp(manualScores.E, 1, 5), A: clamp(manualScores.A, 1, 5), N: clamp(manualScores.N, 1, 5) };
                setManualScores(safe);
                // 手動填分也存一行（答案為空，source=manual）
                const sid = useAssessmentStore.getState().studentId;
                if (sid) void saveAssessmentResult(sid, {}, safe, 'manual');
                router.push('/results');
              }}
              className="psy-btn psy-btn-accent psy-serif w-full py-3 font-semibold"
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
            className="psy-btn psy-btn-ghost px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-30"
          >
            {t.prev}
          </button>
          <button
            onClick={handleNext}
            disabled={currentIndex === total - 1}
            className="psy-btn psy-btn-ghost px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-30"
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
                      ? 'ring-2 ring-[var(--psy-accent-strong)] scale-110'
                      : ''
                  } ${
                    isAnswered
                      ? 'opacity-90'
                      : 'opacity-30'
                  }`}
                  style={{
                    backgroundColor: `rgba(195,154,82,${isAnswered ? '0.68' : '0.22'})`,
                    color: isAnswered ? '#fff9f0' : 'rgba(154,116,72,0.86)',
                  }}
                  title={`#${i + 1} ${locale === 'en' ? q.textEn : q.text}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="flex justify-center gap-3 text-[10px] text-[var(--psy-muted)]">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded" style={{ backgroundColor: 'rgba(195,154,82,0.68)' }} /> {t.legendAnswered}</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded" style={{ backgroundColor: 'rgba(195,154,82,0.25)' }} /> {t.legendUnanswered}</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded bg-[var(--psy-surface-strong)] ring-1 ring-[var(--psy-accent-strong)]" /> {t.legendCurrent}</span>
          </div>
        </div>
        </>
        )}
      </motion.div>
    </div>
  );
}
