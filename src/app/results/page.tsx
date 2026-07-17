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
    // 手機:整頁鎖定視口高、外層 overflow-hidden → 只有內層滾動,視口不滾;桌面:正常流。
    <div className="flex h-[100dvh] flex-col overflow-hidden lg:h-auto lg:flex-1 lg:overflow-visible">
      {/* 內容區在「內層」滾動——文檔本身不滾 → iOS 位址列不收放 → 視覺視口不變 →
          底欄物理上釘死,不再「彈上彈下」。桌面 lg:overflow-visible 恢復正常流。 */}
      <div className="flex flex-1 flex-col items-center overflow-y-auto overscroll-contain px-6 pt-10 pb-8 lg:overflow-visible lg:pb-0">
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
      </div>

      {/* 三個入口：靜態放在「滾動區外」的 flex 子元素——不是 position:fixed,物理上不在滾動流裏,
          所以絕不隨滾動移動(根除 iOS fixed 抖動)。手機=底欄樣式,桌面=居中頁腳。 */}
      <div className="shrink-0 border-t border-[var(--psy-border)] bg-[#fdf9f0] px-4 pt-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] shadow-[0_-12px_30px_rgba(120,90,50,0.1)] lg:border-0 lg:bg-transparent lg:px-6 lg:pb-10 lg:pt-6 lg:shadow-none">
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
