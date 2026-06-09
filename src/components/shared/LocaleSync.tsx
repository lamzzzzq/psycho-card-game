'use client';

import { useEffect } from 'react';
import { useLocaleStore, isLocale } from '@/lib/i18n';

// 读取 URL 的 ?lang=en|zh 写入 locale store，让 /?lang=en 这类分享链接进站即生效。
// 挂在全局 layout，任意页面带 ?lang 都能切。无 param 时沿用持久化的上次选择。
export function LocaleSync() {
  const setLocale = useLocaleStore((s) => s.setLocale);
  useEffect(() => {
    try {
      const p = new URLSearchParams(window.location.search).get('lang');
      if (isLocale(p)) setLocale(p);
    } catch {
      /* ignore */
    }
  }, [setLocale]);
  return null;
}
