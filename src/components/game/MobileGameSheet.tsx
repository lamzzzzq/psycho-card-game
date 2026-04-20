'use client';

import { ReactNode } from 'react';
import { PsyOverlayPanel } from '@/components/shared/PsyOverlayPanel';

interface MobileGameSheetProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function MobileGameSheet({ title, open, onClose, children }: MobileGameSheetProps) {
  return (
    <PsyOverlayPanel
      open={open}
      onClose={onClose}
      title={title}
      variant="bottom-sheet"
      hideAbove="sm"
    >
      {children}
    </PsyOverlayPanel>
  );
}
