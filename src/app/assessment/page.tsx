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
import { saveAssessmentResult, checkStudentIdExists, restoreAssessmentScores, retryPendingAssessmentSaves } from '@/lib/assessment-record';
import { clamp } from '@/lib/utils';
import { useLocaleStore, STRINGS } from '@/lib/i18n';
import { AUTH_T } from '@/lib/i18n/auth';
import { useAuthSession } from '@/lib/useAuthSession';
import { signOutUser } from '@/lib/auth';

// 題目嚴格按 IPIP-50 文件「correct order」排列，不打亂。
export default function AssessmentPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { studentId, setStudentId, answers, setAnswer, calculateScores, setManualScores, getProgress, bigFiveScores, retaking } = useAssessmentStore();
  // 身份改由登录态提供：store 的学号来自 session（profiles），不再手输。
  const { loading: authLoading, userId, studentId: sessionStudentId } = useAuthSession();
  const [restoring, setRestoring] = useState(false);
  const [restoreError, setRestoreError] = useState(false);
  // gate：登录 + 从 session 同步学号后，查一次重，决定「恢復記錄 / 重新測評」。
  const [dupChecked, setDupChecked] = useState(false); // 查重是否已完成
  const [recordExists, setRecordExists] = useState(false); // 该学号是否已有记录
  const [entryStarted, setEntryStarted] = useState(false); // 用户已决定开始（无记录/选了重新測評）
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

  // 需登录：登录态就绪后仍未登录 → 跳到登录页。
  useEffect(() => {
    if (!authLoading && !userId) router.replace('/login');
  }, [authLoading, userId, router]);

  // 补传上次没写进去的测评行（session 失效时落在 localStorage 的缓冲）。
  useEffect(() => {
    if (!authLoading && userId) void retryPendingAssessmentSaves();
  }, [authLoading, userId]);

  // 从 session 同步学号进 store（store 学号必须来自登录态；顺带覆盖匿名旧 session 残留的脏学号）。
  useEffect(() => {
    if (sessionStudentId && sessionStudentId !== studentId) setStudentId(sessionStudentId);
  }, [sessionStudentId, studentId, setStudentId]);

  // 查重（仅一次）：登录就绪 + 学号已从 session 同步进 store + 非重测 + 无旧分数。
  // 用 sessionStudentId 校验，确保查的是登录学号而非匿名残留脏学号。
  useEffect(() => {
    if (authLoading || !userId) return;
    if (!studentId || studentId !== sessionStudentId) return;
    if (retaking || bigFiveScores || dupChecked) return;
    let active = true;
    (async () => {
      const exists = await checkStudentIdExists(studentId);
      if (!active) return;
      setRecordExists(exists);
      setDupChecked(true);
    })();
    return () => { active = false; };
  }, [authLoading, userId, studentId, sessionStudentId, retaking, bigFiveScores, dupChecked]);

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

  // 需登录：加载中 / 未登录（正跳转 /login）→ 居中加载态。
  if (authLoading || !userId) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="psy-serif text-[var(--psy-muted)]">{t.loading}</p>
      </div>
    );
  }

  // 登录了但 profiles 行缺失（孤儿账号/后台删行）→ sessionStudentId 恒为 null，
  // 下面的 gate 会永远卡在 checking。给「重新登入」出口而不是无限转圈。
  if (!authLoading && userId && !sessionStudentId) {
    const ta = AUTH_T[locale];
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-8">
        <div className="psy-panel psy-etched w-full max-w-md space-y-4 rounded-[1.7rem] p-8 text-center">
          <p className="text-sm leading-6 text-[var(--psy-danger)]">{ta.profileMissing}</p>
          <button
            onClick={async () => { await signOutUser(); router.replace('/login'); }}
            className="psy-btn psy-btn-accent psy-serif w-full py-3 font-semibold"
          >
            {ta.reloginBtn}
          </button>
        </div>
      </div>
    );
  }

  // 入口 gate（非重测时）：学号从 session 同步 + 查重完成前显示 checking；有旧记录则给「恢復/重測」选择。
  if (!retaking && !entryStarted) {
    // 学号尚未从 session 同步进 store，或查重未完成 → checking（带返回主頁）。
    if (!studentId || studentId !== sessionStudentId || !dupChecked) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-8">
          <div className="w-full max-w-md space-y-3">
            <button
              onClick={() => router.push('/')}
              className="text-sm text-[var(--psy-muted)] underline decoration-[rgba(200,155,93,0.28)] underline-offset-4 transition hover:text-[var(--psy-ink-soft)]"
            >
              ← {t.backHome}
            </button>
            <div className="psy-panel psy-etched w-full rounded-[1.7rem] p-8 text-center">
              <p className="psy-serif text-[var(--psy-muted)]">{t.gateChecking}</p>
            </div>
          </div>
        </div>
      );
    }
    // 已有记录：恢復(拉回旧分数直接进报告) / 重新測評(覆盖)。学号只读、不可更換。
    if (recordExists) {
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
                <h1 className="psy-serif text-2xl text-[var(--psy-ink)]">{t.gateRecordFound}</h1>
                <p className="text-sm text-[var(--psy-muted)]">
                  {t.studentLabel}：
                  <span className="ml-1 font-medium text-[var(--psy-ink-soft)]">{studentId}</span>
                </p>
                <p className="mx-auto max-w-sm text-xs leading-6 text-[var(--psy-accent)]">{t.dupWarn}</p>
              </div>
              <div className="space-y-2">
                <button
                  type="button"
                  disabled={restoring}
                  onClick={async () => {
                    setRestoreError(false);
                    setRestoring(true);
                    const scores = await restoreAssessmentScores(studentId);
                    setRestoring(false);
                    if (scores) {
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
                  onClick={() => setEntryStarted(true)}
                  className="psy-btn psy-btn-ghost psy-serif w-full py-3 font-semibold"
                >
                  {t.dupOverwrite}
                </button>
                {restoreError && (
                  <p className="text-xs leading-5 text-[var(--psy-danger)]">{t.restoreFailed}</p>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      );
    }
    // 无记录 → 直接进题目（无需额外点击），继续往下渲染。
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

        {/* 學號來自登录态，不再暴露更換入口；保留「手動填分」入口。 */}
        <div className="flex flex-col gap-1.5 text-xs text-[var(--psy-muted)] sm:flex-row sm:items-center sm:justify-end sm:gap-3">
          <button
            onClick={() => setShowManualInput(!showManualInput)}
            className="self-start whitespace-nowrap text-[var(--psy-muted)] transition underline decoration-[rgba(150,118,78,0.3)] underline-offset-4 hover:text-[var(--psy-ink-soft)] sm:self-auto"
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
