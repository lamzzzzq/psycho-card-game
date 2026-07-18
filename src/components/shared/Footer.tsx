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
      {/* 邮箱单独一行,地址用显式 mailto → 下划线只落在地址上,标签不加;并阻止 iOS 把整段自动识别成链接 */}
      <p className="mt-1">
        {f.emailLabel}
        <a
          href={`mailto:${f.email}`}
          className="whitespace-nowrap underline decoration-[rgba(150,118,78,0.4)] underline-offset-2 transition hover:text-[var(--psy-ink-soft)]"
        >
          {f.email}
        </a>
      </p>
    </footer>
  );
}
