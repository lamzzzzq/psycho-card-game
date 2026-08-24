'use client';

// SD4（Dark Tetrad）模型科普页（独立可查看），对齐 /hexaco 介绍页。
// SD4 只做「测评→报告」，不接游戏引擎 → 顶部放测评入口（不是对局入口）。

import Link from 'next/link';
import { useLocaleStore } from '@/lib/i18n';
import { useHydrated } from '@/stores/useHydration';
import { AuthTopBar } from '@/components/shared/AuthTopBar';
import { Sd4Intro } from '@/components/results/Sd4Intro';

export default function Sd4Page() {
  const hydrated = useHydrated();
  const localeRaw = useLocaleStore((s) => s.locale);
  const locale = hydrated ? localeRaw : 'zh';

  return (
    <main className="flex min-h-dvh flex-col items-center px-5 pb-16 pt-16 sm:px-6 sm:pt-20">
      <AuthTopBar />
      <div className="w-full max-w-2xl space-y-6">
        <Link
          href="/"
          className="inline-block text-sm text-[var(--psy-muted)] underline decoration-[rgba(200,155,93,0.28)] underline-offset-4 transition hover:text-[var(--psy-ink-soft)]"
        >
          {locale === 'en' ? '← Back to Home' : '← 返回首頁'}
        </Link>

        {/* SD4 測評入口：28 題 → 四維報告。 */}
        <div className="psy-panel psy-etched flex flex-col items-start gap-3 rounded-[1.6rem] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="psy-serif text-lg text-[var(--psy-ink)]">
              {locale === 'en' ? 'Dark Tetrad Assessment (SD4)' : 'Dark Tetrad 測評（SD4）'}
            </p>
            <p className="text-sm leading-6 text-[var(--psy-muted)]">
              {locale === 'en'
                ? '28 items, four dimensions — see your Dark Tetrad profile.'
                : '28 題、四個維度——看看你的暗黑四特質圖譜。'}
            </p>
          </div>
          <Link
            href="/sd4/assess"
            className="psy-btn psy-btn-accent shrink-0 px-6 py-2.5 text-sm font-semibold"
          >
            {locale === 'en' ? 'Start Assessment' : '開始測評'}
          </Link>
        </div>

        <Sd4Intro locale={locale} />
      </div>
    </main>
  );
}
