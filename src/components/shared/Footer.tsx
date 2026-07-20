'use client';

import { useLocaleStore, STRINGS } from '@/lib/i18n';
import { useHydrated } from '@/stores/useHydration';

// 版權頁腳：兩行——版權/機構/用途 + 項目負責人/電郵。機構名不加粗、不強調。
// SSR 用 zh 與服務端一致，hydrate 後跟隨 locale。
export function Footer() {
  const hydrated = useHydrated();
  const localeRaw = useLocaleStore((s) => s.locale);
  const locale = hydrated ? localeRaw : 'zh';
  const f = STRINGS[locale].common.footer;

  return (
    <footer className="mt-8 w-full px-6 py-6 text-center text-[11px] leading-5 text-[var(--psy-muted)]">
      <p>{f.line1}</p>
      <p className="mt-1">{f.leader}</p>
      {/* 邮箱单独一行。老板要求用 [at] 防爬虫（不写真 @、不做 mailto，iOS 也不会自动识别成链接），
          纯文本、不加框、不加下划线。 */}
      <p className="mt-1">
        {f.emailLabel}
        <span className="whitespace-nowrap">{f.email}</span>
      </p>
    </footer>
  );
}
