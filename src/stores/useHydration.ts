'use client';

import { useEffect, useState } from 'react';
import { useAssessmentStore } from './useAssessmentStore';

export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Zustand persist rehydrates synchronously after first render
    const unsub = useAssessmentStore.persist.onFinishHydration(() => {
      if (!cancelled) setHydrated(true);
    });

    const id = window.setTimeout(() => {
      if (!cancelled && useAssessmentStore.persist.hasHydrated()) {
        setHydrated(true);
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(id);
      unsub();
    };
  }, []);

  return hydrated;
}
