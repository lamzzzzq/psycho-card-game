'use client';

// 对局内的背景音乐开关（图标钮）。放在游戏/PVP 页右上角「How to Play」左边，
// 让玩家局内随时静音——补上「开关只在首页」的空缺。播放引擎仍在全局 BgmPlayer，
// 这里只切 useBgm.enabled。图标：有声=喇叭+声波，静音=喇叭+单斜杠（不用 ✕，避免像关闭钮）。2026-07-24。

import { useBgm } from '@/stores/useBgm';
import type { Locale } from '@/lib/i18n';

export function BgmToggleButton({ locale = 'zh' }: { locale?: Locale }) {
  const enabled = useBgm((s) => s.enabled);
  const toggle = useBgm((s) => s.toggle);
  const label = enabled
    ? (locale === 'en' ? 'Turn off music' : '關閉背景音樂')
    : (locale === 'en' ? 'Turn on music' : '開啟背景音樂');

  return (
    <button
      onClick={toggle}
      aria-label={label}
      aria-pressed={enabled}
      title={label}
      className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border border-[rgba(154,116,72,0.18)] bg-[var(--psy-card-content)] text-[var(--psy-ink-soft)] shadow-[0_8px_18px_rgba(96,72,38,0.1)] transition hover:border-[var(--psy-accent)] hover:text-[var(--psy-accent-strong)]"
    >
      {enabled ? (
        // volume-on：喇叭 + 声波
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-[13px] w-[13px]" aria-hidden>
          <path d="M11 5 6 9H2v6h4l5 4z" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
        </svg>
      ) : (
        // muted：喇叭 + 单斜杠（明确「静音」，不用交叉 ✕ 以免像关闭钮）
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-[13px] w-[13px]" aria-hidden>
          <path d="M11 5 6 9H2v6h4l5 4z" />
          <line x1="23" y1="9" x2="17" y2="15" />
        </svg>
      )}
    </button>
  );
}
