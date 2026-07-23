'use client';

// 全局背景音乐播放器（挂在 layout，跨页面不重挂 → 音乐连续）。
// 默认关；点右下角喇叭开关切换。音频文件占位：把低饱和轻音乐放到
// public/audio/bgm.mp3（未放文件时按钮仍可点，只是没声音，不报错）。2026-07-24。

import { useEffect, useRef } from 'react';
import { useBgm } from '@/stores/useBgm';
import { useLocaleStore } from '@/lib/i18n';

const BGM_SRC = '/audio/bgm.mp3';

export function BgmPlayer() {
  const enabled = useBgm((s) => s.enabled);
  const toggle = useBgm((s) => s.toggle);
  const locale = useLocaleStore((s) => s.locale);
  const ref = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (enabled) {
      el.volume = 0.35;
      // autoplay 政策：靠用户点击开关触发时可播；rehydrate 自动恢复播放被拦时静默失败。
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [enabled]);

  const label = enabled
    ? (locale === 'en' ? 'Turn off music' : '關閉背景音樂')
    : (locale === 'en' ? 'Turn on music' : '開啟背景音樂');

  return (
    <>
      <audio ref={ref} src={BGM_SRC} loop preload="none" />
      <button
        onClick={toggle}
        aria-label={label}
        aria-pressed={enabled}
        title={label}
        className="fixed right-4 top-4 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--psy-border)] bg-[#fdf9f0] text-[var(--psy-muted)] shadow-[var(--psy-shadow)] transition hover:text-[var(--psy-accent-strong)]"
      >
        {enabled ? (
          // volume-on
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
            <path d="M11 5 6 9H2v6h4l5 4z" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
        ) : (
          // volume-off (muted)
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
            <path d="M11 5 6 9H2v6h4l5 4z" />
            <line x1="22" y1="9" x2="16" y2="15" />
            <line x1="16" y1="9" x2="22" y2="15" />
          </svg>
        )}
      </button>
    </>
  );
}
