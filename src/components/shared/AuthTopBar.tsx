'use client';

// 认证页（登录/注册/找回/重置）顶部栏：返回首页 + 语言切换。
// 修 bug：进了登录页没有返回/切换语言的出口。2026-07-22。

import Link from 'next/link';
import { useLocaleStore } from '@/lib/i18n';
import { useHydrated } from '@/stores/useHydration';
import { AUTH_T } from '@/lib/i18n/auth';

export function AuthTopBar() {
  const hydrated = useHydrated();
  const localeRaw = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const locale = hydrated ? localeRaw : 'zh';
  const t = AUTH_T[locale];

  return (
    <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between px-4 py-3 sm:px-6">
      <Link
        href="/"
        className="text-sm text-[var(--psy-muted)] transition hover:text-[var(--psy-ink-soft)]"
      >
        {t.backHome}
      </Link>
      <div className="psy-serif flex items-center gap-0.5 rounded-full border border-[var(--psy-border)] bg-[#fdf9f0] p-0.5 text-xs shadow-[var(--psy-shadow)]">
        {(['zh', 'en'] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLocale(l)}
            className={`rounded-full px-2.5 py-1 transition ${
              locale === l
                ? 'bg-[var(--psy-accent-soft)] text-[var(--psy-accent)]'
                : 'text-[var(--psy-muted)] hover:text-[var(--psy-ink-soft)]'
            }`}
          >
            {l === 'zh' ? '中' : 'EN'}
          </button>
        ))}
      </div>
    </div>
  );
}
