'use client';

// HEXACO 報告頁：六軸雷達圖 + 六維分數條 + HEXACO 模型介紹（HexacoIntro，逐字官方文案）。
// 版式對齊大五 /results。無分數（未答完）→ 引導去答題。

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useHexacoStore } from '@/stores/useHexacoStore';
import { useHydrated } from '@/stores/useHydration';
import { useLocaleStore } from '@/lib/i18n';
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
  const { scores, reset } = useHexacoStore();

  if (!hydrated) {
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
    <main className="flex min-h-dvh flex-col items-center px-5 pb-16 pt-16 sm:px-6 sm:pt-20">
      <AuthTopBar />
      <div className="w-full max-w-2xl space-y-6">
        <div className="space-y-3">
          <Link
            href="/"
            className="inline-block text-sm text-[var(--psy-muted)] underline decoration-[rgba(200,155,93,0.28)] underline-offset-4 transition hover:text-[var(--psy-ink-soft)]"
          >
            ← {t.back}
          </Link>
          <h1 className="psy-serif text-3xl leading-tight text-[var(--psy-ink)] md:text-4xl">{t.title}</h1>
          <p className="text-sm leading-7 text-[var(--psy-ink-soft)]">{t.subtitle}</p>
        </div>

        <HexacoRadarChart scores={scores} />

        <div className="space-y-3">
          {HEXACO_DIMENSIONS.map((d, i) => (
            <HexacoDimensionBar key={d} dimension={d} score={scores[d]} delay={i * 0.08} />
          ))}
        </div>

        <div className="flex justify-center pt-1">
          <button
            onClick={() => { reset(); router.push('/hexaco/assess'); }}
            className="psy-btn psy-btn-ghost psy-serif px-6 py-2.5 text-sm font-medium"
          >
            {t.retake}
          </button>
        </div>

        {/* HEXACO 模型介紹（逐字官方文案），與大五結果頁底部 BigFiveIntro 對稱。 */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="border-t border-[var(--psy-border)] pt-8"
        >
          <HexacoIntro locale={locale} />
        </motion.div>
      </div>
    </main>
  );
}
