'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GameCard, Dimension, isPersonalityCard } from '@/types';
import { TarotCard } from './TarotCard';
import { STRINGS, type Locale } from '@/lib/i18n';

interface PlayerHandProps {
  cards: GameCard[];
  drawnCard: GameCard | null;
  isDiscarding: boolean;
  isDeclaring?: boolean;
  isMyTurn?: boolean;
  mobileCompact?: boolean;
  locale?: Locale;
  selectedCardIds?: number[];
  // Per-turn "view 2 cards" feature: caller passes which cards are revealed
  // for the current turn (max 2). Caller is responsible for clearing on
  // turn change.
  viewedCardIds?: number[];
  // True when "view 2 cards" mode is active (user picking cards). In this
  // mode, clicking a card adds/removes it from the picked set.
  viewMode?: boolean;
  pickedViewIds?: number[];
  onTogglePickView?: (cardId: number) => void;
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
  locale = 'zh',
  selectedCardIds = [],
  viewedCardIds = [],
  viewMode = false,
  pickedViewIds = [],
  onTogglePickView,
  onDiscardCard,
  onToggleSelect,
  onCardHover,
}: PlayerHandProps) {
  const t = STRINGS[locale].game;
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

  // Cheat mode: hold Shift to reveal dimensions (debug — does not persist)
  const [cheatMode, setCheatMode] = useState(false);
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Shift') setCheatMode(true); };
    const up = (e: KeyboardEvent) => { if (e.key === 'Shift') setCheatMode(false); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // Two-step discard: click a card to pick it (highlight), then press
  // the 出牌 button (or click the same card again) to actually discard.
  const [discardPickId, setDiscardPickId] = useState<number | null>(null);
  useEffect(() => {
    if (!isDiscarding) setDiscardPickId(null);
  }, [isDiscarding]);

  function handleCardClick(cardId: number) {
    if (viewMode && onTogglePickView) { onTogglePickView(cardId); return; }
    if (isDeclaring && onToggleSelect) { onToggleSelect(cardId); return; }
    if (isDiscarding) {
      // Click toggles selection only. The actual discard requires the
      // explicit "提交棄牌" button — double-clicking a card no longer
      // commits, to prevent mis-taps.
      setDiscardPickId((prev) => (prev === cardId ? null : cardId));
      return;
    }
  }

  function getRevealed(card: GameCard): Dimension | null {
    if (!isPersonalityCard(card)) return null;
    if (cheatMode) return card.dimension;
    if (viewedCardIds.includes(card.id)) return card.dimension;
    return null;
  }

  return (
    <div className="space-y-2">
      {isDiscarding && !viewMode && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-2"
        >
          <p className="psy-serif text-sm text-[var(--psy-accent)]">
            {discardPickId === null ? t.pickDiscard : t.confirmDiscardHint}
          </p>
          {discardPickId !== null && (
            <div className="flex gap-2">
              <button
                onClick={() => setDiscardPickId(null)}
                className="psy-btn psy-btn-ghost px-3 py-1.5 text-xs"
              >
                {t.cancel}
              </button>
              <button
                onClick={() => {
                  const id = discardPickId;
                  onDiscardCard(id);
                  setDiscardPickId(null);
                }}
                className="psy-btn psy-btn-accent px-4 py-1.5 text-xs font-bold"
              >
                {t.submitDiscard}
              </button>
            </div>
          )}
        </motion.div>
      )}
      {isDeclaring && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="psy-serif text-center text-sm text-[var(--psy-accent)]">
          {t.selectSameDim}
        </motion.p>
      )}
      {viewMode && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="psy-serif text-center text-sm text-[var(--psy-accent)]">
          {t.pickViewHand}（{pickedViewIds.length}/2）
        </motion.p>
      )}

      <div className={useCompactCards
        ? 'grid grid-cols-4 justify-items-center gap-x-1.5 gap-y-2 px-1 pb-2 pt-1'
        : 'grid grid-cols-4 justify-items-center gap-x-2 gap-y-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8'
      }>
        <AnimatePresence>
          {rawCards.map((card) => {
            const isSelected =
              selectedCardIds.includes(card.id) ||
              discardPickId === card.id ||
              pickedViewIds.includes(card.id);
            const revealed = getRevealed(card);
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
                className={`relative group ${useCompactCards ? 'w-full max-w-[5rem] justify-self-center' : 'w-full max-w-[6rem] justify-self-center'}`}
                onMouseEnter={(e) => { if (isDiscarding) onCardHover(e.currentTarget as HTMLElement); }}
                onMouseLeave={() => { if (isDiscarding) onCardHover(null); }}
              >
                <TarotCard
                  text={card.text}
                  textEn={isPersonalityCard(card) ? card.textEn : undefined}
                  dimension={isPersonalityCard(card) ? card.dimension : undefined}
                  imageSrc={isPersonalityCard(card) ? `/cards/${card.id}.webp` : undefined}
                  isDummy={!isPersonalityCard(card)}
                  selected={isSelected}
                  revealedDimension={revealed}
                  locale={locale}
                  onClick={() => handleCardClick(card.id)}
                  fluid
                />
                {/* "NEW" badge on the just-drawn card. */}
                {isNewCard && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.1 }}
                    className={`absolute z-30 pointer-events-none select-none ${useCompactCards ? '-left-1 top-1' : '-left-1 top-2'}`}
                  >
                    <div
                      className={`${useCompactCards ? 'px-1.5 py-0.5 text-[7px]' : 'px-2 py-0.5 text-[9px]'} rounded-full border font-semibold tracking-[0.16em] text-[var(--psy-accent)] shadow-[0_8px_18px_rgba(0,0,0,0.22)]`}
                      style={{
                        background: 'linear-gradient(180deg, rgba(20,31,46,0.96), rgba(12,21,31,0.98))',
                        borderColor: 'rgba(200,155,93,0.34)',
                      }}
                    >
                      {t.newDraw}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
