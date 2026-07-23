'use client';

import { useEffect, useState } from 'react';
import { useAssessmentStore } from './useAssessmentStore';

// 模块级标志：首次 hydrate 完成后永久为 true（跨组件挂载/路由跳转保留）。
// 修 bug（测试反馈）：原来每个组件用 useState(false)，App Router 客户端跳转时
// 目标页组件重新挂载 → hydrated 又从 false 开始 → 先渲染 'zh' → 再切回真实语言，
// 造成「每次页面切换中英文闪一下」。首屏必须 false 以对齐 SSR（防 hydration mismatch），
// 但之后跳转的新页应立即用真实语言。全页刷新会重置本标志、重新走一次首屏流程。
let globalHydrated = false;

export function useHydrated() {
  // 首屏：globalHydrated=false → 与服务端(zh)一致，无 mismatch。
  // 跳转新页：globalHydrated 已为 true → 首帧即真实语言，不再闪。
  const [hydrated, setHydrated] = useState(globalHydrated);

  useEffect(() => {
    if (hydrated) return;
    let cancelled = false;
    const finish = () => {
      if (cancelled) return;
      globalHydrated = true;
      setHydrated(true);
    };

    // Zustand persist rehydrates synchronously after first render
    const unsub = useAssessmentStore.persist.onFinishHydration(finish);
    const id = window.setTimeout(() => {
      if (!cancelled && useAssessmentStore.persist.hasHydrated()) finish();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(id);
      unsub();
    };
  }, [hydrated]);

  return hydrated;
}
