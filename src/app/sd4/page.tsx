'use client';

// SD4（Dark Tetrad）模型科普页（独立可查看），对齐 /hexaco 介绍页。
// 2026-08-31 SD4 对局上线：顶部对齐 /hexaco 改放对局入口（大厅里有同款 needAssess 门禁）。

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

        {/* SD4 對局入口（Beta）：四維牌局走物理隔離的 /sd4-lobby → /sd4-game，
            需先完成 SD4 測評（大廳裏有同款 needAssess 門禁）。 */}
        <div className="psy-panel psy-etched flex flex-col items-start gap-3 rounded-[1.6rem] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="psy-serif text-lg text-[var(--psy-ink)]">
              {locale === 'en' ? 'Dark Tetrad Card Game (Beta)' : 'Dark Tetrad 人格對局（Beta）'}
            </p>
            <p className="text-sm leading-6 text-[var(--psy-muted)]">
              {locale === 'en'
                ? 'Four dimensions, same rules — file all 4 to win. Requires the SD4 assessment (28 items).'
                : '四個維度、同一套規則——歸檔全部 4 維即獲勝。需先完成 SD4 測評（28 題）。'}
            </p>
          </div>
          <Link
            href="/sd4-lobby"
            className="psy-btn psy-btn-accent shrink-0 px-6 py-2.5 text-sm font-semibold"
          >
            {locale === 'en' ? 'Play Solo' : '進入單機對局'}
          </Link>
        </div>

        <Sd4Intro locale={locale} />
      </div>
    </main>
  );
}
