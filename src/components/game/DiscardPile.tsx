'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameCard, GameAction, isPersonalityCard } from '@/types';
import { TarotCard } from './TarotCard';
import { STRINGS, type Locale } from '@/lib/i18n';

// 弃牌也用塔罗卡面（有图+文字），与手牌一致。
function tarotProps(card: GameCard, locale: Locale) {
  const persona = isPersonalityCard(card);
  return {
    text: card.text,
    textEn: card.textEn,
    dimension: persona ? card.dimension : undefined,
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
  locale = 'zh',
}: DiscardPileProps) {
  const t = STRINGS[locale].game;
  const [open, setOpen] = useState(false);

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
        onClick={() => canOpen && setOpen(true)}
        disabled={!canOpen}
        className={`relative flex flex-col items-center gap-2 ${
          canOpen ? 'cursor-pointer hover:scale-105 active:scale-95 transition-transform' : ''
        }`}
        aria-label={t.viewDiscardPile}
      >
        {/* 脉冲光环（出牌引导）：套在卡面外圈 */}
        {highlight && (
          <motion.div
            animate={{ opacity: [0.5, 0, 0.5], scale: [1, 1.12, 1] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'easeOut' }}
            className="pointer-events-none absolute -inset-1 top-0 h-24 rounded-[1.25rem] border sm:h-36 sm:rounded-[1.4rem]"
            style={{ borderColor: 'rgba(200,155,93,0.6)', boxShadow: '0 0 22px rgba(200,155,93,0.4)' }}
          />
        )}
        {topCard ? (
          <div className="relative">
            <div className="sm:hidden">
              <TarotCard {...tarotProps(topCard, locale)} width={72} />
            </div>
            <div className="hidden sm:block">
              <TarotCard {...tarotProps(topCard, locale)} width={96} />
            </div>
            {canOpen && (
              <div
                className="absolute -right-1 -top-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold"
                style={{
                  backgroundColor: 'rgba(12,20,29,0.95)',
                  borderColor: 'rgba(200,155,93,0.24)',
                  color: 'var(--psy-ink-soft)',
                }}
              >
                {t.viewWord}
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-24 w-18 items-center justify-center rounded-[1.1rem] border border-dashed sm:h-36 sm:w-24 sm:rounded-[1.25rem]" style={{ borderColor: 'rgba(200,155,93,0.14)' }}>
            <span className="psy-serif text-[11px] text-[var(--psy-muted)] sm:text-xs">{t.discardPileName}</span>
          </div>
        )}
        <span className="text-[10px] text-[var(--psy-muted)] sm:text-xs">{t.discardedCount} {count} {t.cardsUnit}</span>
      </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
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
                  className="px-2 py-1 text-sm text-[var(--psy-ink-soft)] hover:text-white"
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
                            borderColor: 'rgba(200,155,93,0.12)',
                            background: 'linear-gradient(180deg, rgba(19,30,43,0.78), rgba(13,22,33,0.88))',
                          }}
                        >
                          <span className="w-6 text-right font-mono text-[11px] text-[var(--psy-muted)]">
                            #{originalIndex + 1}
                          </span>
                          <div className="flex-shrink-0">
                            <TarotCard {...tarotProps(entry.card, locale)} width={84} />
                          </div>
                          <div className="flex-1 min-w-0 ml-2 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{entry.player?.avatar ?? '🧑'}</span>
                              <span className="psy-serif truncate text-sm font-medium text-[var(--psy-ink)]">
                                {entry.player?.name ?? t.unknownPlayer}
                              </span>
                            </div>
                            {ts > 0 && (
                              <div className="text-[10px] text-[var(--psy-muted)]">
                                {formatRelative(ts, Date.now(), t.ago)} ·{' '}
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
      </AnimatePresence>
    </>
  );
}
