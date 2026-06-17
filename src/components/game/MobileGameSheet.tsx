'use client';

import { ReactNode } from 'react';
import { PsyOverlayPanel } from '@/components/shared/PsyOverlayPanel';
import type { Locale } from '@/lib/i18n';

interface MobileGameSheetProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  locale?: Locale;
}

export function MobileGameSheet({ title, open, onClose, children, locale = 'zh' }: MobileGameSheetProps) {
  return (
    <PsyOverlayPanel
      open={open}
      onClose={onClose}
      title={title}
      variant="bottom-sheet"
      hideAbove="sm"
      locale={locale}
    >
      {children}
    </PsyOverlayPanel>
  );
}
