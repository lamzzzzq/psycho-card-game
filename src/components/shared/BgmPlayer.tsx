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
    if (enabled) {
      el.volume = 0.35;
      // autoplay 政策：靠用户点击开关触发时可播；rehydrate 自动恢复播放被拦时静默失败。
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [enabled]);

  return <audio ref={ref} src={BGM_SRC} loop preload="none" />;
}
