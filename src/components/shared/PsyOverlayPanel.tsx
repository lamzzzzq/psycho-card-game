'use client';

import { ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

type Variant = 'centered' | 'bottom-sheet';

interface PsyOverlayPanelProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  variant?: Variant;
  /** Extra classes appended to the panel container */
  panelClassName?: string;
  /** Tailwind responsive prefix for hiding the overlay on larger screens (e.g. "sm" -> sm:hidden) */
  hideAbove?: 'sm' | 'md';
  /** z-index of the backdrop layer */
  zIndex?: number;
  closeLabel?: string;
}

const VARIANT_BACKDROP: Record<Variant, string> = {
  centered: 'items-center justify-center bg-black/65 p-4 backdrop-blur-sm',
  'bottom-sheet': 'items-end bg-black/55 p-3',
};

const VARIANT_PANEL: Record<Variant, string> = {
  centered: 'flex max-h-[80vh] w-full max-w-3xl flex-col',
  'bottom-sheet': 'max-h-[78dvh] w-full overflow-hidden',
};

const VARIANT_BODY: Record<Variant, string> = {
  centered: 'flex-1 overflow-y-auto px-5 py-4',
  'bottom-sheet': 'max-h-[calc(78dvh-3.5rem)] overflow-y-auto px-4 py-4',
};

const ENTER_ANIM = {
  centered: {
    initial: { scale: 0.94, y: 10, opacity: 0 },
    animate: { scale: 1, y: 0, opacity: 1 },
    exit: { scale: 0.94, y: 10, opacity: 0 },
  },
  'bottom-sheet': {
    initial: { y: 24, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: 24, opacity: 0 },
  },
} as const;

export function PsyOverlayPanel({
  open,
  onClose,
  title,
  children,
  variant = 'centered',
  panelClassName = '',
  hideAbove,
  zIndex,
  closeLabel = '关闭',
}: PsyOverlayPanelProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  const z = zIndex ?? (variant === 'bottom-sheet' ? 90 : 82);
  const hideClass = hideAbove === 'sm' ? 'sm:hidden' : hideAbove === 'md' ? 'md:hidden' : '';

  const overlay = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className={`fixed inset-0 flex ${VARIANT_BACKDROP[variant]} ${hideClass}`}
          style={{ zIndex: z }}
          onClick={onClose}
        >
          <motion.div
            {...ENTER_ANIM[variant]}
            transition={{ type: 'spring', stiffness: 320, damping: variant === 'centered' ? 26 : 28 }}
            onClick={(e) => e.stopPropagation()}
            className={`psy-panel psy-etched rounded-[1.6rem] ${VARIANT_PANEL[variant]} ${panelClassName}`}
          >
            <div className="flex items-center justify-between border-b border-[rgba(200,155,93,0.14)] px-5 py-3">
              <h3 className="psy-serif text-sm text-[var(--psy-ink)]">{title}</h3>
              <button
                onClick={onClose}
                className="psy-btn psy-btn-ghost px-3 py-1 text-xs"
              >
                {closeLabel}
              </button>
            </div>
            <div className={`psy-scroll ${VARIANT_BODY[variant]}`}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(overlay, document.body);
}
