'use client';

// 全局背景音乐播放引擎（挂在 layout，跨页面不重挂 → 音乐连续）。
// 只负责播放/暂停；开关 UI 收在账号菜单（AccountChip）里，避免浮动按钮和
// 首页/教學页底栏碰撞。默认关；音频文件 public/audio/bgm.mp3。2026-07-24。

import { useEffect, useRef } from 'react';
import { useBgm } from '@/stores/useBgm';

const BGM_SRC = '/audio/bgm.mp3';

export function BgmPlayer() {
  const enabled = useBgm((s) => s.enabled);
  const ref = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!enabled) {
      el.pause();
      return;
    }
    el.volume = 0.35;

    let disposed = false;
    const resume = () => {
      if (disposed) return;
      window.removeEventListener('pointerdown', resume);
      window.removeEventListener('keydown', resume);
      void el.play().catch(() => {});
    };

    // 用户点开关触发时可以直接播。但开关是持久化的：下次打开网站 enabled 已是 true，
    // 此时没有任何用户手势 → autoplay 政策必然拦截。原来 catch 里静默吞掉，结果是
    // 「开关显示开、却没有声音」。改为挂一次性交互监听，用户第一次点/按键时补播。
    void el.play().catch(() => {
      if (disposed) return;
      window.addEventListener('pointerdown', resume, { once: true });
      window.addEventListener('keydown', resume, { once: true });
    });

    return () => {
      disposed = true;
      window.removeEventListener('pointerdown', resume);
      window.removeEventListener('keydown', resume);
    };
  }, [enabled]);

  return <audio ref={ref} src={BGM_SRC} loop preload="none" />;
}
