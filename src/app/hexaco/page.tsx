'use client';

// HEXACO 模型科普页（独立可查看）。HEXACO 尚在「coming soon」，暂无测评/结果流程，
// 先放这个静态介绍页；正式上线后可接入结果页。样式与结果页 BigFiveIntro 区一致。

import Link from 'next/link';
import { useLocaleStore } from '@/lib/i18n';
import { useHydrated } from '@/stores/useHydration';
import { AuthTopBar } from '@/components/shared/AuthTopBar';
import { HexacoIntro } from '@/components/results/HexacoIntro';

export default function HexacoPage() {
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

        {/* HEXACO 對局入口（Beta）：六維牌局走物理隔離的 /hexaco-lobby → /hexaco-game，
            需先完成 HEXACO-60 測評（大廳裏有同款 needAssess 門禁）。 */}
        <div className="psy-panel psy-etched flex flex-col items-start gap-3 rounded-[1.6rem] p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="psy-serif text-lg text-[var(--psy-ink)]">
              {locale === 'en' ? 'HEXACO Card Game (Beta)' : 'HEXACO 人格對局（Beta）'}
            </p>
            <p className="text-sm leading-6 text-[var(--psy-muted)]">
              {locale === 'en'
                ? 'Six dimensions, same rules — file all 6 to win. Requires the HEXACO-60 assessment.'
                : '六個維度、同一套規則——歸檔全部 6 維即獲勝。需先完成 HEXACO-60 測評。'}
            </p>
          </div>
          <Link
            href="/hexaco-lobby"
            className="psy-btn psy-btn-accent shrink-0 px-6 py-2.5 text-sm font-semibold"
          >
            {locale === 'en' ? 'Play Solo' : '進入單機對局'}
          </Link>
        </div>

        <HexacoIntro locale={locale} />
      </div>
    </main>
  );
}
