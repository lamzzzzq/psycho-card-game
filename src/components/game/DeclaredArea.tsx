'use client';

import { useState } from 'react';
import { DeclaredSet, Dimension, DIMENSIONS, PersonalityCard } from '@/types';
import { DIMENSION_META } from '@/data/dimensions';
import { TarotCard } from './TarotCard';
import { cardToTarotProps } from './cardToTarotProps';
import { PsyOverlayPanel } from '@/components/shared/PsyOverlayPanel';
import { STRINGS, type Locale } from '@/lib/i18n';

interface DeclaredAreaProps {
  declaredSets: DeclaredSet[];
  compact?: boolean;
  title?: string;
  locale?: Locale;
  /** When present, the desktop card becomes a combined target/result panel. */
  targets?: Partial<Record<Dimension, number>>;
  /** Nested mobile sheets need their detail overlay above the sheet itself. */
  overlayZIndex?: number;
  /** 有空间的容器（结算页玩家卡 / 移动弹窗）直接内联展开维度列表，不再套一层「歸檔記錄」卡中卡。 */
  expanded?: boolean;
}

export function DeclaredArea({
  declaredSets,
  compact = false,
  title,
  locale = 'zh',
  targets,
  overlayZIndex,
  expanded = false,
}: DeclaredAreaProps) {
  const t = STRINGS[locale].game;
  const dimName = (d: PersonalityCard['dimension']) => (locale === 'en' ? DIMENSION_META[d].nameEn : DIMENSION_META[d].name);
  const resolvedTitle = title ?? t.archiveRecord;
  const [open, setOpen] = useState(false);
  const [detailCard, setDetailCard] = useState<PersonalityCard | null>(null);
  const isProgressView = targets !== undefined;

  const modalNode = (
    <PsyOverlayPanel open={open} onClose={() => setOpen(false)} title={resolvedTitle} variant="centered" zIndex={overlayZIndex}>
      {declaredSets.length === 0 ? (
        <div className="rounded-xl border border-[rgba(154,116,72,0.14)] bg-[var(--psy-card-content)] px-4 py-8 text-center text-sm text-[var(--psy-muted)]">
          {t.noArchiveDone}
        </div>
      ) : (
        <div className="space-y-4">
          {declaredSets.map((set) => {
            return (
              <div
                key={set.dimension}
                className="rounded-[1.2rem] border px-4 py-3"
                style={{ borderColor: 'rgba(200,155,93,0.24)', backgroundColor: 'rgba(200,155,93,0.06)' }}
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: '#c89b5d' }} />
                  <span className="text-sm font-medium text-[var(--psy-accent)]">
                    {dimName(set.dimension)} · {set.cards.length} {t.cardsUnit}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {set.cards.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setDetailCard(card)}
                      className="rounded-[1rem] transition hover:-translate-y-1 hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[var(--psy-accent)]"
                      aria-label={`${t.viewWord}: ${card.text}`}
                    >
                      <TarotCard {...cardToTarotProps(card, locale)} width={56} />
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
      title={t.cardDetail}
      variant="centered"
      panelClassName="max-w-xl"
      zIndex={(overlayZIndex ?? 82) + 2}
    >
      {detailCard && (
        <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
          <div className="flex justify-center">
            <TarotCard {...cardToTarotProps(detailCard, locale)} revealedDimension={detailCard.dimension} width={200} />
          </div>
          <div className="space-y-4">
            <div>
              <p className="psy-eyebrow text-[10px]">{t.personaDesc}</p>
              <p className="mt-2 psy-serif text-xl leading-9 text-[var(--psy-ink)]">{detailCard.text}</p>
            </div>
            <div
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold"
              style={{
                borderColor: 'rgba(200,155,93,0.4)',
                backgroundColor: 'rgba(200,155,93,0.1)',
                color: 'var(--psy-accent)',
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: '#c89b5d' }}
              />
              {dimName(detailCard.dimension)}
            </div>
          </div>
        </div>
      )}
    </PsyOverlayPanel>
  );

  if (expanded) {
    return (
      <>
        {declaredSets.length === 0 ? (
          <p className="text-sm text-[var(--psy-muted)]">{t.noArchiveDone}</p>
        ) : (
          // 内联展开（移动弹窗 / 结算页）：与桌面一致——每维度标题 + 卡片图（可点看详情）
          <div className="space-y-4">
            {declaredSets.map((set) => (
              <div key={set.dimension}>
                <div className="mb-2 flex items-center gap-2">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: '#c89b5d' }} />
                  <span className="text-sm font-medium text-[var(--psy-accent)]">
                    {dimName(set.dimension)} · {set.cards.length} {t.cardsUnit}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {set.cards.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setDetailCard(card)}
                      className="rounded-[1rem] transition hover:-translate-y-1 hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[var(--psy-accent)]"
                      aria-label={`${t.viewWord}: ${card.text}`}
                    >
                      <TarotCard {...cardToTarotProps(card, locale)} width={56} />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {detailNode}
      </>
    );
  }

  if (isProgressView) {
    return (
      <>
        <section className="psy-panel psy-etched w-[13rem] rounded-[1.2rem] p-3" aria-label={locale === 'en' ? 'Archive progress' : '歸檔進度'}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="psy-serif text-sm text-[var(--psy-accent)]">{locale === 'en' ? 'Archive progress' : '歸檔進度'}</h3>
            {declaredSets.length > 0 && <span className="text-[10px] text-[var(--psy-muted)]">{t.viewWord}</span>}
          </div>
          <div className="space-y-1.5">
            {DIMENSIONS.map((dimension) => {
              const declared = declaredSets.find((set) => set.dimension === dimension);
              const target = targets[dimension] ?? 0;
              const isDone = !!declared;
              const content = (
                <>
                  <span className="psy-serif text-[11px] text-[var(--psy-ink)]">{dimName(dimension)}</span>
                  <span className="text-right text-[10px] leading-4">
                    <span className="block text-[var(--psy-muted)]">{locale === 'en' ? `Target ${target}` : `目標 ${target} 張`}</span>
                    <span className={isDone ? 'font-medium text-[var(--psy-success)]' : 'text-[var(--psy-ink-soft)]'}>{isDone ? (locale === 'en' ? 'Archived' : '已歸檔') : (locale === 'en' ? 'Not archived' : '未歸檔')}</span>
                  </span>
                </>
              );
              // 全部维度都可点击 → 打开归档模态（用户要求：不只已归档项可点）
              return (
                <button
                  key={dimension}
                  type="button"
                  onClick={() => setOpen(true)}
                  className={`flex w-full items-center justify-between rounded-lg border px-2.5 py-1.5 text-left transition hover:-translate-y-px ${isDone ? 'border-[rgba(111,143,85,0.3)] bg-[rgba(111,143,85,0.08)] hover:border-[rgba(111,143,85,0.55)]' : 'border-[rgba(154,116,72,0.14)] bg-[var(--psy-card-content)] hover:border-[rgba(154,116,72,0.4)]'}`}
                  aria-label={`${t.viewWord}: ${dimName(dimension)}`}
                >
                  {content}
                </button>
              );
            })}
          </div>
        </section>
        {modalNode}
        {detailNode}
      </>
    );
  }

  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={() => declaredSets.length > 0 && setOpen(true)}
          className="w-full rounded-[0.9rem] border border-[rgba(154,116,72,0.14)] bg-[var(--psy-card-content)] px-2.5 py-1.5 text-left transition hover:border-[rgba(154,116,72,0.28)]"
        >
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              {declaredSets.length === 0 ? (
                <div className="text-[10px] text-[var(--psy-muted)]">{t.noPublicArchive}</div>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5">
                  {declaredSets.map((set) => {
                    // 维度不带专属色：归档标签用中性金。
                    return (
                      <div
                        key={set.dimension}
                        className="flex min-w-0 max-w-full items-center gap-1 rounded-full px-2 py-0.5"
                        style={{
                          border: '1px solid rgba(200,155,93,0.28)',
                          backgroundColor: 'rgba(200,155,93,0.1)',
                        }}
                      >
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: '#c89b5d' }} />
                        <span className="truncate text-[9px] text-[var(--psy-ink-soft)]">
                          {dimName(set.dimension)}
                        </span>
                        <span className="shrink-0 text-[9px] text-[var(--psy-accent)]">
                          {set.cards.length}{locale === 'en' ? '' : '張'}
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
          <div className="psy-serif text-[11px] text-[var(--psy-accent)]">{resolvedTitle}</div>
          {declaredSets.length > 0 && <div className="text-[9px] text-[var(--psy-accent)]">{t.viewWord}</div>}
        </div>
        {declaredSets.length === 0 ? (
          <div className="mt-2 rounded-xl border border-[rgba(154,116,72,0.14)] bg-[var(--psy-card-content)] px-2 py-4 text-center text-[11px] text-[var(--psy-muted)]">
            {t.noArchiveDone}
          </div>
        ) : (
          <div className="mt-2 flex flex-col gap-2">
            {declaredSets.map((set) => {
              return (
                <div key={set.dimension} className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#c89b5d' }} />
                  <span className="text-[9px] font-medium text-[var(--psy-accent)]">
                    {dimName(set.dimension)} {set.cards.length} {t.cardsUnit}
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
