'use client';

// 认证页（登录/注册/找回/重置）语言切换：与主页完全一致，固定左上角。
// 「返回首頁」链接改由各页在内容列内行内渲染（跟内容位置对齐），不再顶在角上。2026-07-22。

import { useLocaleStore } from '@/lib/i18n';
import { useHydrated } from '@/stores/useHydration';

export function AuthTopBar() {
  const hydrated = useHydrated();
  const localeRaw = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const locale = hydrated ? localeRaw : 'zh';

  return (
    <div className="psy-serif fixed left-4 top-4 z-40 [transform:translateZ(0)] flex items-center gap-0.5 rounded-full border border-[var(--psy-border)] bg-[#fdf9f0] p-0.5 text-xs shadow-[var(--psy-shadow)] sm:left-8 sm:top-8">
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
  );
}
