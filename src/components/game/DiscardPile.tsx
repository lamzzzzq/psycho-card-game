'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GameCard, GameAction, isPersonalityCard } from '@/types';
import { TarotCard } from './TarotCard';
import { STRINGS, playerLabel, type Locale } from '@/lib/i18n';
import { PsyOverlayPanel } from '@/components/shared/PsyOverlayPanel';

// 弃牌也用塔罗卡面（有图+文字），与手牌一致。
// revealTags：open(明牌)难度下，弃牌显示人格 tag（所有人都知道打出牌的维度）。
function tarotProps(card: GameCard, locale: Locale, revealTags = false) {
  const persona = isPersonalityCard(card);
  return {
    text: card.text,
    textEn: card.textEn,
    dimension: persona ? card.dimension : undefined,
    revealedDimension: persona && revealTags ? card.dimension : null,
    imageSrc: persona ? `/cards/${card.imageId ?? card.id}.webp` : undefined,
    isDummy: !persona,
    // 知识牌定义按 locale 切换（繁中 / 英文）
    description: persona ? undefined : (locale === 'en' ? (card.definitionEn ?? card.definition) : card.definition),
    locale,
  };
}

interface PlayerLite {
  id: string;
  name: string;
  avatar: string;
}

interface DiscardPileProps {
  topCard: GameCard | null;
  count: number;
  /** Full discard history (same order as the pile, oldest → newest) */
  discardPile?: GameCard[];
  /** Action log used to attach timestamps + players to each discard */
  actions?: GameAction[];
  players?: PlayerLite[];
  /** 轮到我出牌时 = true：弃牌堆脉冲发光 + 浮「丟這裡」标签，强引导出牌。 */
  highlight?: boolean;
  /** open(明牌)难度：弃牌显示人格 tag。 */
  revealTags?: boolean;
  locale?: Locale;
}

function formatRelative(ts: number, now: number, ago: string): string {
  const diff = Math.max(0, now - ts);
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ${ago}`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ${ago}`;
  return `${Math.floor(diff / 3_600_000)}h ${ago}`;
}

export function DiscardPile({
  topCard,
  count,
  discardPile,
  actions,
  players,
  highlight = false,
  revealTags = false,
  locale = 'zh',
}: DiscardPileProps) {
  const t = STRINGS[locale].game;
  const [open, setOpen] = useState(false);
  const [detailCard, setDetailCard] = useState<GameCard | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!open) return;
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const openHistory = () => {
    setNow(Date.now());
    setOpen(true);
  };

  // Pair each card in discardPile with its matching 'discard' action.
  // Pile and discard-actions share the same index order (oldest → newest).
  const discardActions = (actions ?? []).filter((a) => a.type === 'discard' && a.card);
  const pile = discardPile ?? [];
  const playerById = new Map((players ?? []).map((p) => [p.id, p]));

  const history = pile.map((card, i) => {
    const action = discardActions[i];
    const player = action ? playerById.get(action.playerId) : null;
    return { card, action, player };
  });

  // Reverse for display: newest first
  const historyDesc = [...history].reverse();
  const canOpen = pile.length > 0;

  return (
    <>
      <div className="relative flex flex-col items-center">
      <button
        type="button"
        onClick={() => canOpen && openHistory()}
        disabled={!canOpen}
        className={`relative flex flex-col items-center gap-2 ${
          canOpen ? 'cursor-pointer hover:scale-105 active:scale-95 transition-transform' : ''
        }`}
        aria-label={t.viewDiscardPile}
      >
        {topCard ? (
          <div className="relative">
            {highlight && (
              <motion.div
                animate={{ boxShadow: ['0 0 0 0 rgba(195,154,82,0)', '0 0 0 4px rgba(195,154,82,0.28), 0 0 22px rgba(195,154,82,0.22)', '0 0 0 0 rgba(195,154,82,0)'] }}
                transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                className="pointer-events-none absolute inset-0 rounded-[1.1rem] sm:rounded-[1.35rem]"
              />
            )}
            <div className="sm:hidden">
              <TarotCard {...tarotProps(topCard, locale, revealTags)} width={72} />
            </div>
            <div className="hidden sm:block">
              <TarotCard {...tarotProps(topCard, locale, revealTags)} width={128} />
            </div>
            {canOpen && (
              <div
                className="absolute -right-1 -top-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold"
                style={{
                  backgroundColor: '#fdf8f1',
                  borderColor: 'rgba(154,116,72,0.32)',
                  color: 'var(--psy-accent-strong)',
                  boxShadow: '0 6px 14px rgba(96,72,38,0.18)',
                }}
              >
                {t.viewWord}
              </div>
            )}
          </div>
        ) : (
          <div className="relative flex aspect-[4/7] w-[72px] items-center justify-center rounded-[1.1rem] border border-dashed bg-[var(--psy-card-content)] sm:w-32 sm:rounded-[1.35rem]" style={{ borderColor: 'rgba(154,116,72,0.24)' }}>
            {highlight && (
              <motion.div
                animate={{ boxShadow: ['0 0 0 0 rgba(195,154,82,0)', '0 0 0 4px rgba(195,154,82,0.28), 0 0 22px rgba(195,154,82,0.22)', '0 0 0 0 rgba(195,154,82,0)'] }}
                transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
                className="pointer-events-none absolute inset-0 rounded-[1.1rem] sm:rounded-[1.35rem]"
              />
            )}
            <span className="psy-serif text-[11px] text-[var(--psy-muted)] sm:text-xs">{t.discardPileName}</span>
          </div>
        )}
        <span className="text-[10px] text-[var(--psy-muted)] sm:text-xs">{t.discardedCount} {count} {t.cardsUnit}</span>
      </button>
      </div>

      {/* portal 到 body：防 fixed 落在 transformed 祖先里被裁（同 GameLog）。 */}
      {typeof document !== 'undefined' && createPortal(
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[80] flex items-center justify-center overflow-hidden bg-[rgba(58,48,32,0.42)] p-4 backdrop-blur-sm"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 80,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              backgroundColor: 'rgba(58,48,32,0.42)',
            }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 12 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="psy-panel psy-etched flex max-h-[80vh] w-full max-w-3xl flex-col rounded-[1.75rem]"
            >
              <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: 'rgba(200,155,93,0.12)' }}>
                <h3 className="psy-serif text-sm font-bold text-[var(--psy-ink)]">
                  {t.discardPileTitle}{pile.length} {t.cardsUnit}{' '}
                  <span className="text-xs font-normal text-[var(--psy-muted)]">{t.newestOnTop}</span>
                </h3>
                <button
                  onClick={() => setOpen(false)}
                  className="px-2 py-1 text-sm text-[var(--psy-ink-soft)] hover:text-[var(--psy-danger)]"
                  aria-label={t.close}
                >
                  ✕
                </button>
              </div>

              <div className="psy-scroll flex-1 overflow-y-auto px-5 py-4">
                {historyDesc.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[var(--psy-muted)]">{t.noDiscards}</p>
                ) : (
                  <ul className="space-y-2">
                    {historyDesc.map((entry, i) => {
                      const originalIndex = pile.length - 1 - i;
                      const ts = entry.action?.timestamp ?? 0;
                      return (
                        <li
                          key={`${originalIndex}-${entry.card.id}`}
                          className="flex items-center gap-3 rounded-xl border p-2"
                          style={{
                            borderColor: 'rgba(154,116,72,0.16)',
                            background: 'linear-gradient(180deg, #fdf8f1, #f8f1e4)',
                            boxShadow: '0 8px 18px rgba(96,72,38,0.1)',
                          }}
                        >
                          <span className="w-6 text-right font-mono text-[11px] text-[var(--psy-muted)]">
                            #{originalIndex + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => setDetailCard(entry.card)}
                            className="flex-shrink-0 rounded-xl transition hover:-translate-y-1 hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[var(--psy-accent)]"
                            aria-label={`${t.cardDetail}: ${entry.card.text}`}
                          >
                            <TarotCard {...tarotProps(entry.card, locale, revealTags)} width={84} />
                          </button>
                          <div className="flex-1 min-w-0 ml-2 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{entry.player?.avatar ?? '🧑'}</span>
                              <span className="psy-serif truncate text-sm font-medium text-[var(--psy-ink)]">
                                {entry.player ? playerLabel(entry.player, locale) : t.unknownPlayer}
                              </span>
                            </div>
                            {ts > 0 && (
                              <div className="text-[10px] text-[var(--psy-muted)]">
                                {formatRelative(ts, now, t.ago)} ·{' '}
                                {new Date(ts).toLocaleTimeString(locale === 'en' ? 'en-US' : 'zh-CN', {
                                  hour12: false,
                                })}
                              </div>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body)}

      <PsyOverlayPanel
        open={detailCard !== null}
        onClose={() => setDetailCard(null)}
        title={t.cardDetail}
        variant="centered"
        zIndex={92}
        locale={locale}
      >
        {detailCard && (
          <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
            <div className="flex justify-center">
              <TarotCard {...tarotProps(detailCard, locale, true)} width={200} />
            </div>
            <div className="space-y-3">
              <p className="psy-eyebrow text-[10px]">{t.personaDesc}</p>
              <p className="psy-serif text-xl leading-9 text-[var(--psy-ink)]">{detailCard.text}</p>
              {!isPersonalityCard(detailCard) && detailCard.definition && (
                <p className="text-sm leading-7 text-[var(--psy-ink-soft)]">{locale === 'en' ? (detailCard.definitionEn ?? detailCard.definition) : detailCard.definition}</p>
              )}
            </div>
          </div>
        )}
      </PsyOverlayPanel>
    </>
  );
}
