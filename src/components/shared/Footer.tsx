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
          地址外套一个框框（边框+圆角）代替下划线做视觉强调。 */}
      <p className="mt-1 flex flex-wrap items-center justify-center gap-1">
        <span>{f.emailLabel}</span>
        <span className="whitespace-nowrap rounded-md border border-[var(--psy-border)] bg-[#fdf9f0] px-2 py-0.5 text-[var(--psy-ink-soft)]">
          {f.email}
        </span>
      </p>
    </footer>
  );
}
