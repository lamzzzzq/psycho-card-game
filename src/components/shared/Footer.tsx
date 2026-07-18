'use client';

import { useLocaleStore, STRINGS } from '@/lib/i18n';
import { useHydrated } from '@/stores/useHydration';

const APSS_URL = 'https://www.polyu.edu.hk/apss/';

// 版權頁腳：APSS 帶超連結到系網站。SSR 用 zh 與服務端一致，hydrate 後跟隨 locale。
export function Footer() {
  const hydrated = useHydrated();
  const localeRaw = useLocaleStore((s) => s.locale);
  const locale = hydrated ? localeRaw : 'zh';
  const f = STRINGS[locale].common.footer;

  return (
    <footer className="mt-8 w-full px-6 py-6 text-center text-[11px] leading-5 text-[var(--psy-muted)]">
      <p>
        {f.prefix}
        <a
          href={APSS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-normal text-[var(--psy-muted)] underline decoration-[rgba(154,116,72,0.28)] underline-offset-2 transition hover:text-[var(--psy-ink-soft)]"
        >
          {f.link}
        </a>
        {f.suffix}
      </p>
    </footer>
  );
}
