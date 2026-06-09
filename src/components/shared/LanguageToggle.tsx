'use client';

import { useLocaleStore, type Locale } from '@/lib/i18n';
import { useHydrated } from '@/stores/useHydration';

// 中文 / EN 双语切换。切换写入 locale store + 同步 URL ?lang（便于分享 /?lang=en）。
// 房间与语言无关：两个链接连同一房间码即同桌。
export function LanguageToggle() {
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);
  const hydrated = useHydrated();
  const current: Locale = hydrated ? locale : 'zh';

  const choose = (l: Locale) => {
    setLocale(l);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('lang', l);
      window.history.replaceState({}, '', url.toString());
    } catch {
      /* ignore */
    }
  };

  const tabs: { id: Locale; label: string }[] = [
    { id: 'zh', label: '中文' },
    { id: 'en', label: 'EN' },
  ];

  return (
    <div className="fixed left-3 top-3 z-40 sm:left-6 sm:top-6">
      <div
        className="flex items-center gap-1 rounded-full border p-0.5 text-[10px] backdrop-blur"
        style={{ borderColor: 'rgba(200,155,93,0.22)', background: 'rgba(20,28,38,0.55)' }}
      >
        {tabs.map((t) => {
          const active = current === t.id;
          return (
            <button
              key={t.id}
              type="button"
              aria-pressed={active}
              onClick={() => choose(t.id)}
              className={`psy-serif rounded-full px-2.5 py-1 font-medium transition ${
                active ? 'text-[var(--psy-ink)]' : 'text-[var(--psy-muted)] hover:text-[var(--psy-ink-soft)]'
              }`}
              style={
                active
                  ? {
                      background: 'linear-gradient(180deg,rgba(64,46,27,0.92),rgba(27,22,17,0.96))',
                      boxShadow: '0 6px 14px rgba(72,49,18,0.24)',
                    }
                  : undefined
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
