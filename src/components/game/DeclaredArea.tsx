'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { DeclaredSet } from '@/types';
import { DIMENSION_META } from '@/data/dimensions';
import { Card } from './Card';

interface DeclaredAreaProps {
  declaredSets: DeclaredSet[];
  compact?: boolean;
  title?: string;
}

export function DeclaredArea({ declaredSets, compact = false, title = '归档记录' }: DeclaredAreaProps) {
  const [open, setOpen] = useState(false);

  const detailModal = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[82] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.94, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.94, y: 10 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="psy-panel psy-etched flex max-h-[80vh] w-full max-w-3xl flex-col rounded-[1.6rem]"
          >
            <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: 'rgba(200,155,93,0.12)' }}>
              <div className="psy-serif text-sm text-[var(--psy-ink)]">{title}</div>
              <button onClick={() => setOpen(false)} className="psy-btn psy-btn-ghost px-3 py-1 text-xs">
                关闭
              </button>
            </div>
            <div className="psy-scroll flex-1 overflow-y-auto px-5 py-4">
              {declaredSets.length === 0 ? (
                <div className="rounded-xl border border-[rgba(200,155,93,0.12)] bg-[rgba(255,255,255,0.02)] px-4 py-8 text-center text-sm text-[var(--psy-muted)]">
                  暂无完成的归档
                </div>
              ) : (
                <div className="space-y-4">
                  {declaredSets.map((set) => {
                    const meta = DIMENSION_META[set.dimension];
                    return (
                      <div
                        key={set.dimension}
                        className="rounded-[1.2rem] border px-4 py-3"
                        style={{ borderColor: meta.colorHex + '26', backgroundColor: meta.colorHex + '0d' }}
                      >
                        <div className="mb-3 flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.colorHex }} />
                          <span className="text-sm font-medium" style={{ color: meta.colorHex }}>
                            已归档 {set.cards.length} 张
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {set.cards.map((card) => (
                            <Card key={card.id} card={card} tiny />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  const modalNode = typeof document !== 'undefined' ? createPortal(detailModal, document.body) : null;

  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={() => declaredSets.length > 0 && setOpen(true)}
          className="w-full rounded-[0.9rem] border border-[rgba(200,155,93,0.12)] bg-[rgba(255,255,255,0.02)] px-2.5 py-1.5 text-left transition hover:border-[rgba(200,155,93,0.22)]"
        >
          <div className="flex items-center gap-2">
            <div className="psy-serif shrink-0 text-[10px] text-[var(--psy-muted)]">归档</div>
            <div className="min-w-0 flex-1">
              {declaredSets.length === 0 ? (
                <div className="truncate text-[10px] text-[var(--psy-muted)]">暂无公开归档</div>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5">
                  {declaredSets.map((set) => {
                    const meta = DIMENSION_META[set.dimension];
                    return (
                      <div
                        key={set.dimension}
                        className="flex items-center gap-1 rounded-full px-2 py-0.5"
                        style={{
                          border: `1px solid ${meta.colorHex}2d`,
                          backgroundColor: meta.colorHex + '10',
                        }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.colorHex }} />
                        <span className="text-[9px]" style={{ color: meta.colorHex }}>
                          {set.cards.length}张
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </button>
        {modalNode}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => declaredSets.length > 0 && setOpen(true)}
        className="psy-panel psy-etched w-[10.5rem] rounded-[1.2rem] p-2.5 text-left transition hover:border-[rgba(200,155,93,0.22)]"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="psy-serif text-[11px] text-[var(--psy-accent)]">{title}</div>
          {declaredSets.length > 0 && <div className="text-[9px] text-[var(--psy-accent)]">查看</div>}
        </div>
        {declaredSets.length === 0 ? (
          <div className="mt-2 rounded-xl border border-[rgba(200,155,93,0.12)] bg-[rgba(255,255,255,0.02)] px-2 py-4 text-center text-[11px] text-[var(--psy-muted)]">
            暂无完成的归档
          </div>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            {declaredSets.map((set) => {
              const meta = DIMENSION_META[set.dimension];
              return (
                <div key={set.dimension} className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.colorHex }} />
                  <span className="text-[9px] font-medium" style={{ color: meta.colorHex }}>
                    已归档 {set.cards.length} 张
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </button>
      {modalNode}
    </>
  );
}
