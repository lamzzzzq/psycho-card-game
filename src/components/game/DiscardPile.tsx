'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameCard, GameAction } from '@/types';
import { Card } from './Card';

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
}

function formatRelative(ts: number, now: number): string {
  const diff = Math.max(0, now - ts);
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s 前`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m 前`;
  return `${Math.floor(diff / 3_600_000)}h 前`;
}

export function DiscardPile({
  topCard,
  count,
  discardPile,
  actions,
  players,
}: DiscardPileProps) {
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
      <button
        type="button"
        onClick={() => canOpen && setOpen(true)}
        disabled={!canOpen}
        className={`flex flex-col items-center gap-2 ${
          canOpen ? 'cursor-pointer hover:scale-105 active:scale-95 transition-transform' : ''
        }`}
        aria-label="查看弃牌堆"
      >
        {topCard ? (
          <div className="relative">
            <div className="sm:hidden">
              <Card card={topCard} compact />
            </div>
            <div className="hidden sm:block">
              <Card card={topCard} />
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
                查看
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-24 w-18 items-center justify-center rounded-[1.1rem] border border-dashed sm:h-36 sm:w-24 sm:rounded-[1.25rem]" style={{ borderColor: 'rgba(200,155,93,0.14)' }}>
            <span className="psy-serif text-[11px] text-[var(--psy-muted)] sm:text-xs">弃牌堆</span>
          </div>
        )}
        <span className="text-[10px] text-[var(--psy-muted)] sm:text-xs">已弃 {count} 张</span>
      </button>

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
                  弃牌堆 · 共 {pile.length} 张{' '}
                  <span className="text-xs font-normal text-[var(--psy-muted)]">（最新在上）</span>
                </h3>
                <button
                  onClick={() => setOpen(false)}
                  className="px-2 py-1 text-sm text-[var(--psy-ink-soft)] hover:text-white"
                  aria-label="关闭"
                >
                  ✕
                </button>
              </div>

              <div className="psy-scroll flex-1 overflow-y-auto px-5 py-4">
                {historyDesc.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[var(--psy-muted)]">暂无弃牌</p>
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
                          <div className="flex-shrink-0 scale-75 origin-left">
                            <Card card={entry.card} />
                          </div>
                          <div className="flex-1 min-w-0 ml-2 space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{entry.player?.avatar ?? '🧑'}</span>
                              <span className="psy-serif truncate text-sm font-medium text-[var(--psy-ink)]">
                                {entry.player?.name ?? '未知玩家'}
                              </span>
                            </div>
                            {ts > 0 && (
                              <div className="text-[10px] text-[var(--psy-muted)]">
                                {formatRelative(ts, Date.now())} ·{' '}
                                {new Date(ts).toLocaleTimeString('zh-CN', {
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
