'use client';

// HEXACO 報告頁：寬版雙欄（雷達圖 + 六維分數條，桌面左右分欄）+ HexacoIntro 模型介紹。
// 佈局對齊大五 /results（max-w-5xl，lg 兩欄）。HEXACO 純「測評→報告」，底部只給重測/返回。

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useHexacoStore } from '@/stores/useHexacoStore';
import { useHydrated } from '@/stores/useHydration';
import { useLocaleStore } from '@/lib/i18n';
import { useAuthSession } from '@/lib/useAuthSession';
import { HEXACO_DIMENSIONS } from '@/data/hexaco-types';
import { HexacoRadarChart } from '@/components/results/HexacoRadarChart';
import { HexacoDimensionBar } from '@/components/results/HexacoDimensionBar';
import { HexacoIntro } from '@/components/results/HexacoIntro';
import { AuthTopBar } from '@/components/shared/AuthTopBar';

const L = {
  zh: {
    back: '返回主頁',
    title: '你的 HEXACO 人格圖譜',
    subtitle: '六維分數（1.0–5.0），由你的 60 題作答計算而得。',
    notDone: '你還沒完成 HEXACO 測評。',
    startAssess: '開始測評',
    retake: '重新測評',
    loading: '加載中…',
  },
  en: {
    back: 'Back to Home',
    title: 'Your HEXACO Profile',
    subtitle: 'Six dimension scores (1.0–5.0), computed from your 60 answers.',
    notDone: "You haven't completed the HEXACO assessment yet.",
    startAssess: 'Start assessment',
    retake: 'Retake',
    loading: 'Loading…',
  },
};

export default function HexacoResultsPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const localeRaw = useLocaleStore((s) => s.locale);
  const locale = hydrated ? localeRaw : 'zh';
  const t = L[locale];
  const { scores, startRetake } = useHexacoStore();
  const { loading: authLoading, userId } = useAuthSession();

  // 需登录才能看报告：登出/未登入用户不能看到本地残留的 HEXACO 分数（隐私）。
  useEffect(() => {
    if (!authLoading && !userId) router.replace('/login');
  }, [authLoading, userId, router]);

  if (!hydrated || authLoading || !userId) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="psy-serif text-[var(--psy-muted)]">{t.loading}</p>
      </div>
    );
  }

  if (!scores) {
    return (
      <div className="flex min-h-dvh flex-1 items-center justify-center px-6">
        <div className="space-y-4 text-center">
          <p className="text-[var(--psy-muted)]">{t.notDone}</p>
          <button
            onClick={() => router.push('/hexaco/assess')}
            className="psy-btn psy-btn-accent px-6 py-2 text-sm font-medium"
          >
            {t.startAssess}
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col items-center px-6 pb-16 pt-16 sm:pt-20">
      <AuthTopBar />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl space-y-8"
      >
        <div className="space-y-3">
          <Link
            href="/"
            className="inline-block text-sm text-[var(--psy-muted)] underline decoration-[rgba(200,155,93,0.28)] underline-offset-4 transition hover:text-[var(--psy-ink-soft)]"
          >
            ← {t.back}
          </Link>
          <h1 className="psy-serif text-4xl leading-none text-[var(--psy-ink)] sm:text-5xl">{t.title}</h1>
          <p className="text-sm leading-7 text-[var(--psy-ink-soft)]">{t.subtitle}</p>
        </div>

        {/* 桌面左右分欄：雷達圖 | 六維分數條（同大五 0.9fr / 1.1fr）。 */}
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="space-y-4">
            <HexacoRadarChart scores={scores} />
          </div>
          <div className="space-y-4">
            {HEXACO_DIMENSIONS.map((d, i) => (
              <HexacoDimensionBar key={d} dimension={d} score={scores[d]} delay={i * 0.12} />
            ))}
          </div>
        </div>

        <div className="flex justify-center">
          <button
            onClick={() => { startRetake(); router.push('/hexaco/assess'); }}
            className="psy-btn psy-btn-ghost psy-serif px-6 py-2.5 text-sm font-medium"
          >
            {t.retake}
          </button>
        </div>

        <hr className="border-t border-[var(--psy-border)]" />

        {/* HEXACO 模型介紹（逐字官方文案），對稱大五結果頁底部 BigFiveIntro。 */}
        <HexacoIntro locale={locale} />
      </motion.div>
    </main>
  );
}
