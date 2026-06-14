'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAssessmentStore } from '@/stores/useAssessmentStore';
import { useHydrated } from '@/stores/useHydration';
import { useLocaleStore, STRINGS } from '@/lib/i18n';
import { QUESTIONS } from '@/data/questions';
import { Footer } from '@/components/shared/Footer';

export default function Home() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { bigFiveScores, getProgress } = useAssessmentStore();
  const progress = getProgress();
  const hasResults = hydrated && bigFiveScores !== null;
  // SSR/首屏用 zh 与服务端一致，hydrate 后切到持久化/?lang 的语言，避免 mismatch。
  const locale = useLocaleStore((s) => s.locale);
  const loc = hydrated ? locale : 'zh';
  const t = STRINGS[loc].home;
  const c = STRINGS[loc].common;
  const features = t.features;

  return (
    // 移动端：内容从顶部流动 + 底部留白给 sticky CTA 栏；桌面：垂直居中。
    <div className="flex flex-1 flex-col items-center px-5 pt-10 pb-40 sm:px-6 lg:justify-center lg:pb-10">
      <button
        onClick={() => router.push('/tutorial')}
        className="psy-btn psy-btn-accent psy-serif fixed right-4 top-4 z-40 px-4 py-2 text-sm font-semibold shadow-[0_16px_38px_rgba(0,0,0,0.32)] sm:right-8 sm:top-8"
      >
        {c.tutorial}
      </button>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl space-y-8 lg:space-y-10"
      >
        <div className="grid items-center gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-5 sm:space-y-6">
            <div className="space-y-3">
              <p className="psy-serif text-[10px] uppercase tracking-[0.42em] text-[var(--psy-ink-soft)] sm:text-xs">
                {t.eyebrow}
              </p>
              <h1 className="psy-serif text-5xl leading-none text-[var(--psy-ink)] sm:text-6xl">
                {t.title}
              </h1>
              <p className="max-w-xl text-base leading-7 text-[var(--psy-ink-soft)] sm:text-lg sm:leading-8">
                {t.intro}
              </p>
            </div>

            {/* 移动端：紧凑横向行（icon + 文案）；sm+：原竖向卡片。4 张卡 → 2×2 */}
            <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
              {features.map((item) => (
                <div
                  key={item.title}
                  className="psy-panel psy-etched flex items-center gap-3 rounded-2xl p-3 sm:flex-col sm:items-start sm:gap-0 sm:rounded-[1.4rem] sm:p-4"
                >
                  <div className="shrink-0 text-xl text-[var(--psy-accent)] sm:mb-3">{item.glyph}</div>
                  <div className="min-w-0">
                    <div className="psy-serif text-sm text-[var(--psy-ink)] sm:text-base">{item.title}</div>
                    <p className="mt-0.5 text-xs leading-5 text-[var(--psy-ink-soft)] sm:mt-2 sm:text-sm sm:leading-6">
                      {item.note}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 装饰牌阵：纯视觉，仅桌面右栏显示（移动端隐藏，避免占满一屏） */}
          <div className="hidden lg:flex lg:justify-end">
            <div className="relative w-full max-w-sm">
              <div className="psy-panel psy-etched rounded-[2rem] p-6">
                <div className="mb-5 flex items-center justify-between text-[10px] uppercase tracking-[0.35em] text-[var(--psy-muted)]">
                  <span>{t.cardEyebrow}</span>
                  <span>No. 0</span>
                </div>
                <div className="rounded-[1.7rem] border border-[rgba(200,155,93,0.26)] bg-[linear-gradient(180deg,rgba(20,31,45,0.96),rgba(11,18,28,0.98))] p-6">
                  <div className="mb-6 flex items-center justify-center gap-4 text-[var(--psy-accent)]">
                    <span className="text-xl">☉</span>
                    <span className="text-3xl">◈</span>
                    <span className="text-xl">☽</span>
                  </div>
                  <div className="space-y-4 text-center">
                    <div>
                      <p className="psy-serif text-sm tracking-[0.25em] text-[var(--psy-ink-soft)]">{t.cardArcana}</p>
                      <p className="mt-2 psy-serif text-2xl text-[var(--psy-ink)]">{t.cardTitle}</p>
                    </div>
                    <p className="text-sm leading-7 text-[var(--psy-ink-soft)]">
                      {t.cardBody}
                    </p>
                  </div>
                </div>
              </div>
              <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-[radial-gradient(circle,rgba(200,155,93,0.18),transparent_68%)]" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* 主行动区：移动端固定底栏（拇指可达），桌面端回归内联网格。
          放在 motion.div 之外，避免 framer transform 祖先让 fixed 失效。 */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[rgba(200,155,93,0.18)] bg-[rgba(11,18,28,0.92)] px-4 pt-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] backdrop-blur-md lg:static lg:mx-auto lg:mt-2 lg:w-full lg:max-w-5xl lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-2 lg:grid-cols-[1.1fr_1.1fr_1fr_1fr] lg:gap-3">
          <button
            onClick={() => router.push('/pvp')}
            className="psy-btn psy-btn-accent psy-serif col-span-2 w-full px-6 py-3.5 text-base font-semibold lg:col-span-1"
          >
            {t.pvp}
          </button>
          <button
            onClick={() => (hasResults ? router.push('/lobby') : router.push('/assessment'))}
            className="psy-btn psy-btn-ghost w-full px-6 py-3 font-medium sm:py-3.5"
          >
            {t.single}{!hasResults && <span className="ml-1.5 text-xs text-[var(--psy-accent)]">{t.needAssess}</span>}
          </button>
          <button
            onClick={() => router.push('/assessment')}
            className="psy-btn psy-btn-ghost w-full px-6 py-3 font-medium sm:py-3.5"
          >
            {progress > 0 ? `${t.continueAssess} (${progress}/${QUESTIONS.length})` : hasResults ? t.reassess : t.startAssess}
          </button>
          {hasResults && (
            <button
              onClick={() => router.push('/results')}
              className="psy-btn psy-btn-ghost col-span-2 w-full px-6 py-3 font-medium sm:py-3.5 lg:col-span-1"
            >
              {t.report}
            </button>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
