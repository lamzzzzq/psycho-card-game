'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAssessmentStore } from '@/stores/useAssessmentStore';
import { useHydrated } from '@/stores/useHydration';
import { RadarChart } from '@/components/results/RadarChart';
import { DimensionBar } from '@/components/results/DimensionBar';
import { BigFiveIntro } from '@/components/results/BigFiveIntro';
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
    <div className="flex flex-1 flex-col items-center px-6 py-10 pb-40 lg:pb-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl space-y-8"
      >
        <div className="space-y-3">
          <button
            onClick={() => router.push('/')}
            className="text-sm text-[var(--psy-muted)] underline decoration-[rgba(200,155,93,0.28)] underline-offset-4 transition hover:text-[var(--psy-ink-soft)]"
          >
            ← {t.backHome}
          </button>
          <h1 className="psy-serif text-4xl leading-none text-[var(--psy-ink)] sm:text-5xl">
            {t.title}
          </h1>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="space-y-4">
            <RadarChart scores={bigFiveScores} />
          </div>

          <div className="space-y-4">
            {DIMENSIONS.map((d, i) => (
              <DimensionBar key={d} dimension={d} score={bigFiveScores[d]} delay={i * 0.15} />
            ))}
          </div>
        </div>

        <hr className="border-t border-[var(--psy-border)]" />

        <BigFiveIntro locale={locale} />
      </motion.div>

      {/* 三個入口：移动端常驻底部（sticky 底栏，拇指可达），桌面端静态居中。
          放在 motion.div 之外——framer transform 祖先会让 position:fixed 失效。 */}
      <div className="fixed inset-x-0 bottom-0 z-40 [transform:translateZ(0)] [will-change:transform] border-t border-[var(--psy-border)] bg-[rgba(253,249,240,0.97)] px-4 pt-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] shadow-[0_-12px_30px_rgba(120,90,50,0.1)] lg:static lg:mt-8 lg:w-full lg:max-w-5xl lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-2 lg:grid-cols-3 lg:gap-3">
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
      </div>
    </div>
  );
}
