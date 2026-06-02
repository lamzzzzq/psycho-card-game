'use client';

import { useState } from 'react';
import { DeclaredSet, PersonalityCard } from '@/types';
import { DIMENSION_META } from '@/data/dimensions';
import { Card } from './Card';
import { PsyOverlayPanel } from '@/components/shared/PsyOverlayPanel';

interface DeclaredAreaProps {
  declaredSets: DeclaredSet[];
  compact?: boolean;
  title?: string;
}

export function DeclaredArea({ declaredSets, compact = false, title = '歸檔記錄' }: DeclaredAreaProps) {
  const [open, setOpen] = useState(false);
  const [detailCard, setDetailCard] = useState<PersonalityCard | null>(null);

  const modalNode = (
    <PsyOverlayPanel open={open} onClose={() => setOpen(false)} title={title} variant="centered">
      {declaredSets.length === 0 ? (
        <div className="rounded-xl border border-[rgba(200,155,93,0.12)] bg-[rgba(255,255,255,0.02)] px-4 py-8 text-center text-sm text-[var(--psy-muted)]">
          暫無完成的歸檔
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
                    {meta.name} · {set.cards.length} 張
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {set.cards.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setDetailCard(card)}
                      className="rounded-[1rem] transition hover:-translate-y-1 hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[var(--psy-accent)]"
                      aria-label={`查看歸檔卡牌：${card.text}`}
                    >
                      <Card card={card} tiny />
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PsyOverlayPanel>
  );

  const detailNode = (
    <PsyOverlayPanel
      open={detailCard !== null}
      onClose={() => setDetailCard(null)}
      title="卡牌詳情"
      variant="centered"
      panelClassName="max-w-xl"
      zIndex={92}
    >
      {detailCard && (
        <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="flex justify-center">
            <Card card={detailCard} revealedDimension={detailCard.dimension} />
          </div>
          <div className="space-y-4">
            <div>
              <p className="psy-eyebrow text-[10px]">人格描述</p>
              <p className="mt-2 psy-serif text-xl leading-9 text-[var(--psy-ink)]">{detailCard.text}</p>
            </div>
            <div
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold"
              style={{
                borderColor: DIMENSION_META[detailCard.dimension].colorHex + '45',
                backgroundColor: DIMENSION_META[detailCard.dimension].colorHex + '12',
                color: DIMENSION_META[detailCard.dimension].colorHex,
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: DIMENSION_META[detailCard.dimension].colorHex }}
              />
              {DIMENSION_META[detailCard.dimension].name}
            </div>
          </div>
        </div>
      )}
    </PsyOverlayPanel>
  );

  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={() => declaredSets.length > 0 && setOpen(true)}
          className="w-full rounded-[0.9rem] border border-[rgba(200,155,93,0.12)] bg-[rgba(255,255,255,0.02)] px-2.5 py-1.5 text-left transition hover:border-[rgba(200,155,93,0.22)]"
        >
          <div className="flex items-center gap-2">
            <div className="psy-serif shrink-0 text-[10px] text-[var(--psy-muted)]">歸檔</div>
            <div className="min-w-0 flex-1">
              {declaredSets.length === 0 ? (
                <div className="truncate text-[10px] text-[var(--psy-muted)]">暫無公開歸檔</div>
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
                          {meta.name} {set.cards.length}張
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
        {detailNode}
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
            暫無完成的歸檔
          </div>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            {declaredSets.map((set) => {
              const meta = DIMENSION_META[set.dimension];
              return (
                <div key={set.dimension} className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: meta.colorHex }} />
                  <span className="text-[9px] font-medium" style={{ color: meta.colorHex }}>
                    {meta.name} {set.cards.length} 張
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </button>
      {modalNode}
      {detailNode}
    </>
  );
}
