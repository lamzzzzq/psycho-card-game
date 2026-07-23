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
        <HexacoIntro locale={locale} />
      </div>
    </main>
  );
}
