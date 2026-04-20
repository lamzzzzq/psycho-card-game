'use client';

import { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

interface MobileGameSheetProps {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export function MobileGameSheet({ title, open, onClose, children }: MobileGameSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-end bg-black/55 p-3 sm:hidden"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="psy-panel psy-etched max-h-[78dvh] w-full overflow-hidden rounded-[1.6rem]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[rgba(200,155,93,0.14)] px-4 py-3">
              <h3 className="psy-serif text-sm text-[var(--psy-ink)]">{title}</h3>
              <button
                onClick={onClose}
                className="rounded-full border border-[rgba(200,155,93,0.18)] px-2.5 py-1 text-xs text-[var(--psy-ink-soft)]"
              >
                关闭
              </button>
            </div>
            <div className="psy-scroll max-h-[calc(78dvh-3.5rem)] overflow-y-auto px-4 py-4">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
