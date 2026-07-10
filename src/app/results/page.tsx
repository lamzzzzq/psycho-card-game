'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAssessmentStore } from '@/stores/useAssessmentStore';
import { useHydrated } from '@/stores/useHydration';
import { RadarChart } from '@/components/results/RadarChart';
import { DimensionBar } from '@/components/results/DimensionBar';
import { DIMENSIONS } from '@/types';
import { useLocaleStore, STRINGS } from '@/lib/i18n';

export default function ResultsPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const localeRaw = useLocaleStore((s) => s.locale);
  const locale = hydrated ? localeRaw : 'zh';
  const t = STRINGS[locale].results;
  const { bigFiveScores, startRetake } = useAssessmentStore();

  if (!hydrated) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="psy-serif text-[var(--psy-muted)]">{t.loading}</p>
      </div>
    );
  }

  if (!bigFiveScores) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="space-y-4 text-center">
          <p className="text-[var(--psy-muted)]">{t.notAssessed}</p>
          <button
            onClick={() => router.push('/assessment')}
            className="psy-btn psy-btn-accent px-6 py-2 text-sm font-medium"
          >
            {t.startAssess}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-8">
      <button
        onClick={() => router.push('/')}
        className="psy-btn psy-btn-ghost psy-serif fixed left-4 top-4 z-40 px-3 py-1.5 text-xs sm:left-8 sm:top-8"
      >
        ← {t.backHome}
      </button>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl space-y-8"
      >
        <div className="text-center">
          <h1 className="psy-serif text-4xl text-[var(--psy-ink)]">
            {t.title}
          </h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <RadarChart scores={bigFiveScores} />
          </div>

          <div className="space-y-4">
            {DIMENSIONS.map((d, i) => (
              <DimensionBar key={d} dimension={d} score={bigFiveScores[d]} delay={i * 0.15} />
            ))}
          </div>
        </div>

        {/* 与首页同一套按鈕組：psy-btn 設計系統 + 相同響應式佈局（PVP 整寬主色，其餘並排次按鈕）*/}
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-3 lg:gap-3">
          <button
            onClick={() => router.push('/pvp')}
            className="psy-btn psy-btn-accent psy-serif col-span-2 w-full px-6 py-3.5 text-base font-semibold lg:col-span-1"
          >
            {t.pvp}
          </button>
          <button
            onClick={() => router.push('/lobby')}
            className="psy-btn psy-btn-ghost w-full px-6 py-3 font-medium sm:py-3.5"
          >
            {t.single}
          </button>
          <button
            onClick={() => {
              startRetake();
              router.push('/assessment');
            }}
            className="psy-btn psy-btn-ghost w-full px-6 py-3 font-medium sm:py-3.5"
          >
            {t.reassess}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
