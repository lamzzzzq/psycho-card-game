'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameCard, Dimension, DIMENSIONS } from '@/types';
import { DIMENSION_META } from '@/data/dimensions';
import { Card } from './Card';

interface PlayerHandProps {
  cards: GameCard[];
  drawnCard: GameCard | null;
  isDiscarding: boolean;
  isDeclaring?: boolean;
  isMyTurn?: boolean;
  mobileCompact?: boolean;
  selectedCardIds?: number[];
  onDiscardCard: (cardId: number) => void;
  onToggleSelect?: (cardId: number) => void;
  onCardHover: (el: HTMLElement | null) => void;
}

export function PlayerHand({
  cards,
  drawnCard,
  isDiscarding,
  isDeclaring = false,
  isMyTurn = false,
  mobileCompact = false,
  selectedCardIds = [],
  onDiscardCard,
  onToggleSelect,
  onCardHover,
}: PlayerHandProps) {
  const [isCompactViewport, setIsCompactViewport] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsCompactViewport(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  const useCompactCards = mobileCompact && isCompactViewport;

  // Newly drawn card goes to the FIRST slot so it's easy to spot.
  const rawCards = drawnCard ? [drawnCard, ...cards] : cards;
  const drawnCardId = drawnCard?.id ?? null;

  // Cheat mode: hold Shift to reveal dimensions
  const [cheatMode, setCheatMode] = useState(false);
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Shift') setCheatMode(true); };
    const up = (e: KeyboardEvent) => { if (e.key === 'Shift') setCheatMode(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // Tag state — purely UI, does not touch game logic. Available any time
  // the hand isn't locked into an active choice (discarding / declaring).
  const canTag = !isDiscarding && !isDeclaring;
  const [tagMap, setTagMap] = useState<Record<number, Dimension>>({});
  const [tagPickerCardId, setTagPickerCardId] = useState<number | null>(null);
  const [sorted, setSorted] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Two-step discard: click a card to pick it (highlight), then press
  // the 出牌 button (or click the same card again) to actually discard.
  const [discardPickId, setDiscardPickId] = useState<number | null>(null);
  useEffect(() => {
    if (!isDiscarding) setDiscardPickId(null);
  }, [isDiscarding]);

  // Close tag picker when it's no longer allowed
  useEffect(() => {
    if (!canTag) setTagPickerCardId(null);
  }, [canTag]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setTagPickerCardId(null);
      }
    }
    if (tagPickerCardId !== null) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [tagPickerCardId]);

  // Clear stale tags when cards leave hand
  useEffect(() => {
    const validIds = new Set(rawCards.map(c => c.id));
    setTagMap(prev => {
      const next = { ...prev };
      let changed = false;
      for (const k of Object.keys(next)) {
        if (!validIds.has(Number(k))) { delete next[Number(k)]; changed = true; }
      }
      return changed ? next : prev;
    });
  }, [rawCards.map(c => c.id).join(',')]);

  const hasTaggedCards = Object.keys(tagMap).length > 0;

  // Sort: tagged cards first (grouped by dimension order), then untagged
  const DIM_ORDER: Dimension[] = ['O', 'C', 'E', 'A', 'N'];
  const allCards = sorted
    ? [...rawCards].sort((a, b) => {
        const ta = tagMap[a.id];
        const tb = tagMap[b.id];
        if (ta && tb) return DIM_ORDER.indexOf(ta) - DIM_ORDER.indexOf(tb);
        if (ta) return -1;
        if (tb) return 1;
        return 0;
      })
    : rawCards;

  function handleCardClick(cardId: number) {
    if (isDeclaring && onToggleSelect) { onToggleSelect(cardId); return; }
    if (isDiscarding) {
      // Click once to pick, click the same card again (or the 出牌 button)
      // to actually discard.
      if (discardPickId === cardId) {
        onDiscardCard(cardId);
        setDiscardPickId(null);
      } else {
        setDiscardPickId(cardId);
      }
      return;
    }
    if (canTag) setTagPickerCardId(prev => (prev === cardId ? null : cardId));
  }

  function applyTag(cardId: number, dim: Dimension) {
    setTagMap(prev => ({ ...prev, [cardId]: dim }));
    setTagPickerCardId(null);
  }

  function clearTag(cardId: number) {
    setTagMap(prev => { const n = { ...prev }; delete n[cardId]; return n; });
    setTagPickerCardId(null);
  }

  return (
    <div className={`space-y-2 ${useCompactCards ? 'sm:space-y-3' : 'space-y-3'}`}>
      {isDiscarding && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-2"
        >
          <p className="psy-serif text-sm text-[var(--psy-accent)]">
            {discardPickId === null ? '先圈定一张要舍弃的线索牌' : '再次点击该牌，或点「提交弃牌」确认'}
          </p>
          {discardPickId !== null && (
            <div className="flex gap-2">
              <button
                onClick={() => setDiscardPickId(null)}
                className="psy-btn psy-btn-ghost px-3 py-1.5 text-xs"
              >
                取消
              </button>
              <button
                onClick={() => {
                  const id = discardPickId;
                  onDiscardCard(id);
                  setDiscardPickId(null);
                }}
                className="psy-btn psy-btn-accent px-4 py-1.5 text-xs font-bold"
              >
                提交弃牌
              </button>
            </div>
          )}
        </motion.div>
      )}
      {isDeclaring && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="psy-serif text-center text-sm text-[var(--psy-accent)]">
          选出你认为属于同一人格线索的牌
        </motion.p>
      )}

      {/* Organize button row — only visible when not your turn */}
      {hasTaggedCards && canTag && (
        <div className="flex justify-center">
          <button
            onClick={() => setSorted(s => !s)}
            className="psy-btn px-3 py-1 text-xs font-medium"
            style={{
              backgroundColor: sorted ? 'rgba(200,155,93,0.18)' : 'rgba(255,255,255,0.02)',
              borderColor: sorted ? 'rgba(200,155,93,0.42)' : 'rgba(200,155,93,0.18)',
              color: sorted ? 'var(--psy-accent)' : 'var(--psy-ink-soft)',
            }}
          >
            {sorted ? '已按心理标签整理' : '整理手牌'}
          </button>
        </div>
      )}

      <div className={useCompactCards
        ? 'grid grid-cols-3 gap-x-2 gap-y-2.5'
        : 'grid grid-cols-4 justify-items-center gap-x-2 gap-y-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8'
      }>
        <AnimatePresence>
          {allCards.map((card) => {
            const isSelected = selectedCardIds.includes(card.id) || discardPickId === card.id;
            const tagDim = tagMap[card.id] ?? null;
            const isPickerOpen = tagPickerCardId === card.id;
            const isNewCard = drawnCardId !== null && card.id === drawnCardId;

            return (
              <motion.div
                key={card.id}
                data-card-id={card.id}
                layout
                layoutId={`card-${card.id}`}
                initial={{ opacity: 0, y: 30, scale: 0.8 }}
                animate={{ opacity: 1, y: isSelected ? -12 : 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.4 } }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className={`relative group ${useCompactCards ? 'mx-auto w-fit' : 'w-full max-w-[6rem] justify-self-center'}`}
                onMouseEnter={(e) => { if (isDiscarding) onCardHover(e.currentTarget as HTMLElement); }}
                onMouseLeave={() => { if (isDiscarding) onCardHover(null); }}
              >
                <Card
                  card={card}
                  selected={isSelected}
                  compact={useCompactCards}
                  showDimension={cheatMode}
                  tagDimension={tagDim}
                  onClick={() => handleCardClick(card.id)}
                />
                {/* "NEW" badge on the just-drawn card. Disappears automatically
                    on next turn (drawnCard becomes null in state). */}
                {isNewCard && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.1 }}
                    className={`absolute z-30 pointer-events-none select-none ${useCompactCards ? '-right-1 top-1' : '-right-1 top-2'}`}
                  >
                    <div
                      className={`${useCompactCards ? 'px-1.5 py-0.5 text-[7px]' : 'px-2 py-0.5 text-[9px]'} rounded-full border font-semibold tracking-[0.16em] text-[var(--psy-accent)] shadow-[0_8px_18px_rgba(0,0,0,0.22)]`}
                      style={{
                        background: 'linear-gradient(180deg, rgba(20,31,46,0.96), rgba(12,21,31,0.98))',
                        borderColor: 'rgba(200,155,93,0.34)',
                      }}
                    >
                      新抽
                    </div>
                  </motion.div>
                )}

                {/* Tag picker popover — only when canTag */}
                <AnimatePresence>
                  {isPickerOpen && canTag && (
                    <motion.div
                      ref={pickerRef}
                      initial={{ opacity: 0, y: 4, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.95 }}
                      transition={{ duration: 0.12 }}
                      className={`psy-panel absolute left-1/2 z-[120] flex min-w-[88px] -translate-x-1/2 flex-col gap-1.5 rounded-xl p-2 shadow-xl ${
                        useCompactCards ? 'top-full mt-1' : 'bottom-full mb-2'
                      }`}
                    >
                      <p className="psy-serif whitespace-nowrap text-center text-[9px] text-[var(--psy-muted)]">标记人格线索</p>
                      <div className="flex flex-col gap-1">
                        {DIMENSIONS.map(dim => {
                          const meta = DIMENSION_META[dim];
                          const active = tagDim === dim;
                          return (
                            <button
                              key={dim}
                              onClick={() => active ? clearTag(card.id) : applyTag(card.id, dim)}
                              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                                active
                                  ? 'text-white'
                                  : 'text-[var(--psy-ink-soft)] hover:bg-white/4'
                              }`}
                              style={active ? { backgroundColor: meta.colorHex + '33', color: meta.colorHex } : {}}
                            >
                              <span className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ backgroundColor: meta.colorHex }} />
                              {meta.name}
                            </button>
                          );
                        })}
                      </div>
                      {tagDim && (
                        <button
                          onClick={() => clearTag(card.id)}
                          className="mt-0.5 text-center text-[9px] text-[var(--psy-muted)] transition-colors hover:text-[var(--psy-ink-soft)]"
                        >
                          清除标记
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
