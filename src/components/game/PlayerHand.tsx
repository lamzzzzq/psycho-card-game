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
  discardPickId?: number | null;
  onDiscardPickChange?: (cardId: number | null) => void;
  showDiscardControls?: boolean;
  /** Keeps the source slot stable while its card clone is flying away. */
  flyingCardId?: number | null;
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
  locale = 'zh',
  selectedCardIds = [],
  viewedCardIds = [],
  discardPickId: controlledDiscardPickId,
  onDiscardPickChange,
  showDiscardControls = true,
  flyingCardId = null,
  viewMode = false,
  pickedViewIds = [],
  onTogglePickView,
  onDiscardCard,
  onToggleSelect,
  onCardHover,
}: PlayerHandProps) {
  const t = STRINGS[locale].game;

  // Newly drawn card goes to the FIRST slot so it's easy to spot.
  const rawCards = drawnCard ? [drawnCard, ...cards] : cards;
  const drawnCardId = drawnCard?.id ?? null;

  // [已移除] Shift 作弊模式（按住 Shift 顯示全部維度）。移除原因：
  //   1) 課堂上按住 Shift 就能破解半公開/隱藏模式（作弊漏洞）；
  //   2) Shift 是無意識高頻按鍵（輸入法切換/大寫/截圖 Cmd+Shift+4），按住時
  //      焦點被搶走會丟 keyup → 卡在全明牌狀態，即用戶報的
  //      「level 2 玩着玩着突然顯示所有牌」。調試需要時走 card-lab。

  // Two-step discard: click a card to pick it (highlight), then press
  // the 出牌 button (or click the same card again) to actually discard.
  const [internalDiscardPickId, setInternalDiscardPickId] = useState<number | null>(null);
  const discardPickId = controlledDiscardPickId ?? internalDiscardPickId;
  const setDiscardPickId = onDiscardPickChange ?? setInternalDiscardPickId;
  useEffect(() => {
    if (isDiscarding) return;
    const id = window.setTimeout(() => setDiscardPickId(null), 0);
    return () => window.clearTimeout(id);
  }, [isDiscarding, setDiscardPickId]);

  function handleCardClick(cardId: number) {
    if (viewMode && onTogglePickView) { onTogglePickView(cardId); return; }
    if (isDeclaring && onToggleSelect) { onToggleSelect(cardId); return; }
    if (isDiscarding) {
      // Click toggles selection only. The actual discard requires the
      // explicit "提交棄牌" button — double-clicking a card no longer
      // commits, to prevent mis-taps.
      setDiscardPickId(discardPickId === cardId ? null : cardId);
      return;
    }
  }

  function getRevealed(card: GameCard): Dimension | null {
    if (!isPersonalityCard(card)) return null;
    if (viewedCardIds.includes(card.id)) return card.dimension;
    return null;
  }

  return (
    <div className="space-y-2">
      {isDiscarding && !viewMode && showDiscardControls && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-wrap items-center justify-center gap-2"
        >
          <p className="psy-serif text-center text-sm text-[var(--psy-accent)]">
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
      {/* viewMode 不再渲染自己的提示行：兩個調用方（單機/PVP 頁面）都有
          自己的面板（含 n/cap 計數），這裏再顯示一條寫死 /2 的會跟 PVP
          半公開檔的 /4 打架（用戶實測截圖裏兩行提示同屏、數字矛盾）。 */}

      {/* Mobile keeps a stable 4-column hand; desktop uses the available table width. */}
      {/* Reserve a stable hand well for the entire round. A discarded card may
          reflow horizontally, but it must never collapse the table vertically. */}
      <div className="mx-auto grid min-h-[26rem] w-full grid-cols-4 content-start gap-x-2 gap-y-3 sm:min-h-[22rem] sm:[grid-template-columns:repeat(auto-fill,minmax(6.5rem,9rem))] sm:gap-x-3">
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
                className={`group relative w-full ${flyingCardId === card.id ? 'pointer-events-none opacity-0' : ''}`}
                onMouseEnter={(e) => { if (isDiscarding) onCardHover(e.currentTarget as HTMLElement); }}
                onMouseLeave={() => { if (isDiscarding) onCardHover(null); }}
              >
                <TarotCard
                  text={card.text}
                  textEn={card.textEn}
                  dimension={isPersonalityCard(card) ? card.dimension : undefined}
                  imageSrc={isPersonalityCard(card) ? `/cards/${card.imageId ?? card.id}.webp` : undefined}
                  isDummy={!isPersonalityCard(card)}
                  description={isPersonalityCard(card) ? undefined : (locale === 'en' ? (card.definitionEn ?? card.definition) : card.definition)}
                  selected={isSelected}
                  revealedDimension={revealed}
                  locale={locale}
                  onClick={() => handleCardClick(card.id)}
                  fluid
                />
                {/* "NEW" badge on the just-drawn card：实心金底 + 深色字，放大。 */}
                {isNewCard && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 18, delay: 0.1 }}
                    className="absolute left-[6%] top-[4%] z-30 pointer-events-none select-none"
                  >
                    <div
                      className="psy-serif rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase leading-none tracking-[0.14em] shadow-[0_6px_14px_rgba(0,0,0,0.45)]"
                      style={{
                        background: 'linear-gradient(180deg, #dcc07f, #b88a3e)',
                        color: '#2a1c06',
                        borderColor: '#efd9a8',
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
