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
  const { bigFiveScores, reset } = useAssessmentStore();

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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl space-y-8"
      >
        <div className="text-center space-y-3">
          <p className="psy-serif text-xs uppercase tracking-[0.42em] text-[var(--psy-ink-soft)]">
            Final Persona Spread
          </p>
          <h1 className="psy-serif text-4xl text-[var(--psy-ink)]">
            {t.title}
          </h1>
          <p className="mx-auto max-w-2xl text-sm leading-7 text-[var(--psy-ink-soft)]">
            {t.intro}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-4">
            <RadarChart scores={bigFiveScores} />
            <div className="psy-panel psy-etched rounded-[1.6rem] p-5">
              <p className="psy-serif text-sm text-[var(--psy-ink)]">{t.readHint}</p>
              <p className="mt-3 text-sm leading-7 text-[var(--psy-ink-soft)]">
                {t.readBody}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {DIMENSIONS.map((d, i) => (
              <DimensionBar key={d} dimension={d} score={bigFiveScores[d]} delay={i * 0.15} />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => router.push('/pvp')}
            className="psy-serif flex-1 rounded-full border border-[rgba(200,155,93,0.44)] bg-[linear-gradient(135deg,#9b6430_0%,#d4a469_100%)] py-3 font-semibold text-[#fff7eb] transition hover:opacity-95"
          >
            {t.pvp}
          </button>
          <button
            onClick={() => router.push('/lobby')}
            className="flex-1 rounded-full border border-[rgba(200,155,93,0.24)] bg-[rgba(255,255,255,0.02)] py-3 font-semibold text-[var(--psy-ink)] transition hover:bg-[rgba(200,155,93,0.08)]"
          >
            {t.single}
          </button>
          <button
            onClick={() => {
              reset();
              router.push('/assessment');
            }}
            className="rounded-full border border-[rgba(200,155,93,0.24)] px-6 py-3 text-sm font-medium text-[var(--psy-ink-soft)] transition hover:bg-[rgba(200,155,93,0.08)]"
          >
            {t.reassess}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
