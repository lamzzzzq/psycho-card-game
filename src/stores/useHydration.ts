'use client';

import { useEffect, useState } from 'react';
import { useAssessmentStore } from './useAssessmentStore';

export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Zustand persist rehydrates synchronously after first render
    const unsub = useAssessmentStore.persist.onFinishHydration(() => {
      setHydrated(true);
    });

    // If already hydrated (e.g. navigating between pages)
    if (useAssessmentStore.persist.hasHydrated()) {
      setHydrated(true);
    }

    return unsub;
  }, []);

  return hydrated;
}
