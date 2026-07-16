'use client';

import { useEffect } from 'react';

/**
 * 申请屏幕常亮(Screen Wake Lock)——防止玩家(尤其房主)因发呆/等待轮次时屏幕自动
 * 锁屏。房主一锁屏浏览器标签会被挂起→Supabase presence 掉线→全员暂停(见 usePvpStore)。
 * Wake Lock 只挡「因空闲自动熄屏」,挡不住手动锁屏/切后台,但已覆盖最常见的掉线场景。
 * 标签重新可见时(visibilitychange)自动重新获取,因为 Wake Lock 在标签隐藏时会被系统释放。
 * 不支持的浏览器(部分 iOS Safari 版本)静默降级。
 */
export function useWakeLock(active = true): void {
  useEffect(() => {
    if (!active || typeof navigator === 'undefined' || !('wakeLock' in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        sentinel = await navigator.wakeLock.request('screen');
      } catch {
        // 用户手势缺失 / 电量低 / 不支持 → 忽略
      }
    };

    void acquire();

    const onVisible = () => {
      if (!cancelled && document.visibilityState === 'visible') void acquire();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      try {
        void sentinel?.release();
      } catch {
        /* noop */
      }
    };
  }, [active]);
}
