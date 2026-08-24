'use client';

// SD4 報告頁：寬版雙欄（雷達圖 + 四維分數條，桌面左右分欄）+ Sd4Intro 模型介紹。
// 佈局對齊 HEXACO /hexaco/results（max-w-5xl，lg 兩欄）。
// SD4 不接遊戲引擎 → 底部菜單只有「重新測評」（沒有單機/聯機——放跳去別的模型對局的鈕是騙人）。

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSd4Store } from '@/stores/useSd4Store';
import { useHydrated } from '@/stores/useHydration';
import { useLocaleStore } from '@/lib/i18n';
import { useAuthSession } from '@/lib/useAuthSession';
import { SD4_DIMENSIONS } from '@/data/sd4-types';
import { Sd4RadarChart } from '@/components/results/Sd4RadarChart';
import { Sd4DimensionBar } from '@/components/results/Sd4DimensionBar';
import { Sd4Intro } from '@/components/results/Sd4Intro';
import { AuthTopBar } from '@/components/shared/AuthTopBar';

const L = {
  zh: {
    back: '返回主頁',
    title: '你的暗黑四特質圖譜',
    subtitle: '四維分數（1.0–5.0），由你的 28 題作答計算而得。',
    notDone: '你還沒完成 Dark Tetrad 測評。',
    startAssess: '開始測評',
    retake: '重新測評',
    loading: '加載中…',
  },
  en: {
    back: 'Back to Home',
    title: 'Your Dark Tetrad Profile',
    subtitle: 'Four dimension scores (1.0–5.0), computed from your 28 answers.',
    notDone: "You haven't completed the Dark Tetrad assessment yet.",
    startAssess: 'Start assessment',
    retake: 'Retake',
    loading: 'Loading…',
  },
};

export default function Sd4ResultsPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const localeRaw = useLocaleStore((s) => s.locale);
  const locale = hydrated ? localeRaw : 'zh';
  const t = L[locale];
  const { scores, startRetake } = useSd4Store();
  const { loading: authLoading, userId } = useAuthSession();

  // 需登录才能看报告：登出/未登入用户不能看到本地残留的 SD4 分数（隐私）。
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
            onClick={() => router.push('/sd4/assess')}
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

        {/* 桌面左右分欄：雷達圖 | 四維分數條（同大五/HEXACO 0.9fr / 1.1fr）。 */}
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="space-y-4">
            <Sd4RadarChart scores={scores} />
          </div>
          <div className="space-y-4">
            {SD4_DIMENSIONS.map((d, i) => (
              <Sd4DimensionBar key={d} dimension={d} score={scores[d]} delay={i * 0.12} />
            ))}
          </div>
        </div>

        <hr className="border-t border-[var(--psy-border)]" />

        {/* Dark Tetrad 模型介紹，對稱大五/HEXACO 結果頁底部 Intro。 */}
        <Sd4Intro locale={locale} />

        {/* 底部入口：只有重新測評（SD4 無對局）。 */}
        <div className="mx-auto w-full max-w-md pt-2">
          <button
            onClick={() => { startRetake(); router.push('/sd4/assess'); }}
            className="psy-btn psy-btn-ghost w-full px-6 py-3 font-medium sm:py-3.5"
          >
            {t.retake}
          </button>
        </div>
      </motion.div>
    </main>
  );
}
