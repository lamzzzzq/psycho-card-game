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
  /** 'centered' 居中弹窗（如归档详情）；默认 'bottom-sheet' 底部抽屉。 */
  variant?: 'bottom-sheet' | 'centered';
  overlayZIndex?: number;
}

export function MobileGameSheet({ title, open, onClose, children, locale = 'zh', variant = 'bottom-sheet', overlayZIndex }: MobileGameSheetProps) {
  return (
    <PsyOverlayPanel
      open={open}
      onClose={onClose}
      title={title}
      variant={variant}
      hideAbove="sm"
      locale={locale}
      zIndex={overlayZIndex}
    >
      {children}
    </PsyOverlayPanel>
  );
}
