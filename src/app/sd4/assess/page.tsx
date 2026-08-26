'use client';

// SD4-28 答題頁。版式對齊 HEXACO /hexaco/assess：題面 + 5 點 Likert + 導航格。
// 答滿 28 題 → 計分寫入 useSd4Store → 進 /sd4/results（雷達圖 + 各維度介紹）。
// SD4 不接遊戲引擎、無對局門禁 → 不設「跳過測評，手動輸入分數」入口（那是 HEXACO/大五 進遊戲用的）。
// 標題+引導語逐字照 HEXACO /hexaco/assess 定稿（含「胡牌目標」半句，0826 用戶拍板：與 HEXACO 完全一致，僅圖譜名換成 Dark Tetrad）。

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocaleStore } from '@/lib/i18n';
import { useHydrated } from '@/stores/useHydration';
import { AuthTopBar } from '@/components/shared/AuthTopBar';
import { SD4_QUESTIONS } from '@/data/sd4-questions';
import { LikertScore } from '@/data/sd4-types';
import { useSd4Store } from '@/stores/useSd4Store';
import { useAuthSession } from '@/lib/useAuthSession';
import { saveSd4Result, retryPendingSd4Saves } from '@/lib/sd4-record';

const LIKERT: LikertScore[] = [1, 2, 3, 4, 5];
const ACCENT = '#c39a52';

const L = {
  zh: {
    back: '返回主頁',
    title: '抽取你的人格原型',
    intro: '每道題都像翻開一張隱喻牌面。請憑第一直覺選擇，你的答案將匯聚成專屬的「Dark Tetrad 暗黑四特質圖譜」，並直接決定接下來的「胡牌目標」。',
    // Likert 選項文字照 SD4_20260804.xlsx（1 非常不同意 → 5 非常同意）。
    likert: ['非常不同意', '不同意', '中立', '同意', '非常同意'],
    prev: '上一題',
    next: '下一題',
    navTitle: '題目導航',
    answeredSuffix: '已作答',
    answered: '已答',
    unanswered: '未答',
    current: '當前',
  },
  en: {
    back: 'Back to Home',
    title: 'Discover Your Personality Archetype',
    intro: 'Each question reveals a metaphorical card. Follow your first instinct—your choices will shape your unique "Dark Tetrad Profile," directly determining your "Winning Targets" for the match ahead.',
    likert: ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'],
    prev: 'Previous',
    next: 'Next',
    navTitle: 'Question map',
    answeredSuffix: 'answered',
    answered: 'Answered',
    unanswered: 'Unanswered',
    current: 'Current',
  },
};

export default function Sd4AssessPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const localeRaw = useLocaleStore((s) => s.locale);
  const locale = hydrated ? localeRaw : 'zh';
  const t = L[locale];

  const { answers, setAnswer, calculateScores, getProgress, scores, setStudentId, retaking } = useSd4Store();
  const { loading: authLoading, userId, studentId: sessionStudentId } = useAuthSession();
  const [currentIndex, setCurrentIndex] = useState(0);

  const total = SD4_QUESTIONS.length;

  // 已完成测评（且非重测）→ 跳报告页（避免停在已填满 28 题的表单上，随手一点触发重复写库）。
  // replace 而非 push：防 /sd4/results 按返回键 → 本页挂载 → 又跳回去的死循环。
  useEffect(() => {
    if (scores && !retaking) router.replace('/sd4/results');
  }, [scores, retaking, router]);

  // 离开测评页时若仍在「重测中」（= 没答完）→ 作废本次重测，保留旧报告。
  useEffect(() => {
    return () => {
      const s = useSd4Store.getState();
      if (s.retaking) s.cancelRetake();
    };
  }, []);

  // 需登录：登录态就绪后仍未登录 → 跳登录页（与大五/HEXACO 一致）。
  useEffect(() => {
    if (!authLoading && !userId) router.replace('/login');
  }, [authLoading, userId, router]);

  // 从 session 同步学号进 store（分数归属来自登录态）。
  useEffect(() => {
    if (sessionStudentId && sessionStudentId !== useSd4Store.getState().studentId) setStudentId(sessionStudentId);
  }, [sessionStudentId, setStudentId]);

  // 补传上次没写进去的 SD4 测评行。
  useEffect(() => {
    if (!authLoading && userId) void retryPendingSd4Saves();
  }, [authLoading, userId]);

  if (!hydrated || authLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="psy-serif text-[var(--psy-muted)]">…</p>
      </div>
    );
  }

  // 未登录（正跳转 /login）→ 占位。
  if (!userId) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="psy-serif text-[var(--psy-muted)]">…</p>
      </div>
    );
  }

  // 已完成且非重测：上面的 effect 正 replace 去报告页，先不渲染表单（防随手点触发重复写库）。
  if (scores && !retaking) return null;

  const safeIndex = Math.min(currentIndex, total - 1);
  const question = SD4_QUESTIONS[safeIndex];
  const progress = getProgress();

  const handleSelect = (score: LikertScore) => {
    setAnswer(question.id, score);
    setTimeout(() => {
      const st = useSd4Store.getState();
      const done = st.getProgress();
      if (done >= total) {
        const finalScores = calculateScores();
        // 答完即把答案 + 四维分数写成一行（非阻塞，失败落缓冲后补传）。
        const sid = useSd4Store.getState().studentId;
        if (sid) void saveSd4Result(sid, useSd4Store.getState().answers, finalScores);
        router.push('/sd4/results');
      } else if (safeIndex < total - 1) {
        setCurrentIndex((i) => Math.min(i + 1, total - 1));
      }
    }, 260);
  };

  return (
    <main className="flex min-h-dvh flex-col items-center px-6 pt-16 pb-12 sm:pt-20">
      <AuthTopBar />
      <motion.div initial={false} animate={{ opacity: 1 }} className="w-full max-w-3xl space-y-8">
        <div className="space-y-3">
          <Link
            href="/"
            className="inline-block text-sm text-[var(--psy-muted)] underline decoration-[rgba(200,155,93,0.28)] underline-offset-4 transition hover:text-[var(--psy-ink-soft)]"
          >
            ← {t.back}
          </Link>
          <h1 className="psy-serif text-3xl leading-none text-[var(--psy-ink)] md:text-4xl">{t.title}</h1>
          {/* 不限寬，自然分行（同大五/HEXACO 答題頁的修法）。 */}
          <p className="text-sm leading-7 text-[var(--psy-ink-soft)]">{t.intro}</p>
        </div>

        {/* 題卡（不顯示維度/題號提示，避免暗示所屬向度） */}
        <AnimatePresence mode="wait">
          <motion.div
            key={question.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="psy-panel psy-etched space-y-8 rounded-[1.8rem] p-6 md:p-8"
          >
            <h2 className="psy-serif text-2xl font-semibold leading-relaxed text-[var(--psy-ink)]">
              {locale === 'en' ? question.textEn : question.text}
            </h2>
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
              {LIKERT.map((score) => {
                const on = answers[question.id] === score;
                return (
                  <button
                    key={score}
                    onClick={() => handleSelect(score)}
                    className={`flex flex-col items-center gap-1 rounded-[1.15rem] border p-2 transition-all sm:gap-2 sm:p-4 ${on ? 'scale-105' : 'hover:-translate-y-0.5'}`}
                    style={{
                      borderColor: on ? ACCENT : 'rgba(150,118,78,0.18)',
                      color: on ? ACCENT : 'var(--psy-ink-soft)',
                      background: on ? `linear-gradient(180deg, ${ACCENT}26, #eaddc4)` : 'linear-gradient(180deg, var(--psy-card-content), #f8f1e4)',
                      boxShadow: on
                        ? `0 0 0 1px ${ACCENT}22, 0 12px 24px rgba(120,90,50,0.16)`
                        : 'inset 0 1px 0 rgba(255,255,255,0.55), 0 6px 14px rgba(120,90,50,0.08)',
                    }}
                  >
                    <span className="psy-serif text-xl font-bold sm:text-2xl">{score}</span>
                    <span className="text-[10px] text-center leading-tight sm:text-xs">{t.likert[score - 1]}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* 導航按鈕 */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={safeIndex === 0}
            className="psy-btn psy-btn-ghost px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-30"
          >
            {t.prev}
          </button>
          <button
            onClick={() => setCurrentIndex((i) => Math.min(total - 1, i + 1))}
            disabled={safeIndex === total - 1}
            className="psy-btn psy-btn-ghost px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-30"
          >
            {t.next}
          </button>
        </div>

        {/* 題號格（28 題：移動端 7 列一行四排，sm 起 14 列兩排） */}
        <div className="psy-panel psy-etched space-y-3 rounded-[1.5rem] p-4">
          <div className="flex items-center justify-between text-xs text-[var(--psy-muted)]">
            <span>{t.navTitle}</span>
            <span>{progress}/{total} {t.answeredSuffix}</span>
          </div>
          <div className="grid grid-cols-7 gap-1 sm:grid-cols-14">
            {SD4_QUESTIONS.map((q, i) => {
              const isAnswered = answers[q.id] !== undefined;
              const isCurrent = i === safeIndex;
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(i)}
                  className={`h-8 rounded text-[10px] font-medium transition-all sm:h-6 sm:text-[9px] ${isCurrent ? 'ring-2 ring-[var(--psy-accent-strong)] scale-110' : ''} ${isAnswered ? 'opacity-90' : 'opacity-30'}`}
                  style={{ backgroundColor: `rgba(195,154,82,${isAnswered ? '0.68' : '0.22'})`, color: isAnswered ? '#fff9f0' : 'rgba(154,116,72,0.86)' }}
                  title={`#${i + 1}`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="flex justify-center gap-3 text-[10px] text-[var(--psy-muted)]">
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded" style={{ backgroundColor: 'rgba(195,154,82,0.68)' }} /> {t.answered}</span>
            <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded" style={{ backgroundColor: 'rgba(195,154,82,0.25)' }} /> {t.unanswered}</span>
          </div>
        </div>
      </motion.div>
    </main>
  );
}
