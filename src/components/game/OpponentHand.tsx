'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useAnimationControls } from 'framer-motion';
import { Player } from '@/types';
import { TarotCard } from './TarotCard';
import { cardToTarotProps } from './cardToTarotProps';
import { DeclaredArea } from './DeclaredArea';
import { STRINGS, playerLabel, type Locale } from '@/lib/i18n';

interface OpponentHandProps {
  player: Player;
  isCurrentTurn: boolean;
  isTentativeOffline?: boolean;
  locale?: Locale;
}

export function OpponentHand({ player, isCurrentTurn, isTentativeOffline = false, locale = 'zh' }: OpponentHandProps) {
  const t = STRINGS[locale].game;
  const [openModal, setOpenModal] = useState(false);
  // Portal guard. The modal needs to escape OpponentHand's outer
  // motion.div, which gets `transform` from the bounce animation and
  // therefore breaks `position: fixed` containment. Portal-to-body fixes
  // the squeeze.
  const mounted = typeof document !== 'undefined';
  const showCards = player.revealedHand;
  const hasRevealedSubset = !showCards && (player.revealedSelectedCards?.length ?? 0) > 0;
  const bounceControls = useAnimationControls();

  useEffect(() => {
    if (isCurrentTurn) {
      bounceControls.start({
        scale: [1, 1.06, 0.98, 1.02, 1],
        transition: { duration: 0.45, ease: 'easeOut' },
      });
    }
  }, [isCurrentTurn, bounceControls]);

  useEffect(() => {
    if (!openModal) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [openModal]);

  const stackWidth = Math.max(20, Math.min(72, (player.hand.length - 1) * 4 + 18));
  const isPenalized = player.skipNextTurn || !!player.frozenUntilOwnDiscard;
  const hasLeft = player.hasLeft === true;

  // Modal contents differ slightly: full reveal (hu-fail) shows the
  // entire hand; subset (pong-fail) shows only the cards the offender
  // bet with.
  const modalCards = showCards
    ? player.hand
    : hasRevealedSubset
    ? player.revealedSelectedCards!
    : [];
  const modalTitle = showCards ? t.revealedFullTitle : t.revealedSubsetTitle;
  const modalAccent = showCards ? 'var(--psy-accent)' : 'var(--psy-danger)';
  const triggerLabel = showCards
    ? `${t.viewPublicFile}（${player.hand.length}）`
    : hasRevealedSubset
    ? `${t.viewSample}（${player.revealedSelectedCards!.length}）`
    : '';

  return (
    <motion.div
      animate={bounceControls}
      className={`psy-panel psy-etched relative flex flex-col gap-2 overflow-hidden rounded-[1rem] px-2.5 py-2 sm:rounded-[1.25rem] sm:px-3 sm:py-2.5 transition ${
        isCurrentTurn ? 'border-[rgba(195,154,82,0.9)] bg-[rgba(255,249,234,0.94)] ring-4 ring-[rgba(195,154,82,0.24)] shadow-[0_12px_28px_rgba(154,116,72,0.22)]' : ''
      }`}
    >
      {isCurrentTurn && !isPenalized && !hasLeft && !isTentativeOffline && (
        <div
          aria-hidden
          className="psy-turn-border pointer-events-none absolute inset-0 z-20 rounded-[1rem] sm:rounded-[1.25rem]"
        />
      )}
      {/* Header: avatar + name + count */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="text-base shrink-0">{player.avatar}</span>
          <div className="min-w-0">
            <div className="psy-serif truncate text-[11px] font-medium text-[var(--psy-ink)] sm:text-xs">
              {playerLabel(player, locale)}
            </div>
            <div className="truncate text-[9px] text-[var(--psy-muted)] sm:text-[10px]">
              {player.hand.length} {t.cardsUnit}
              {player.revealedHand && <span className="ml-1 text-[var(--psy-accent)]">· {t.archivePublic}</span>}
              {hasLeft && <span className="ml-1 text-[var(--psy-danger)]">· {t.leftGame}</span>}
              {!hasLeft && isTentativeOffline && (
                <span className="ml-1 text-[var(--psy-accent-strong)]">· {t.offline}</span>
              )}
            </div>
          </div>
        </div>

        {isCurrentTurn && !isPenalized && !hasLeft && !isTentativeOffline && (
          <span className="shrink-0 rounded-full border border-[rgba(195,154,82,0.55)] bg-[var(--psy-accent)] px-2 py-0.5 text-[9px] font-semibold text-white shadow-[0_4px_10px_rgba(154,116,72,0.24)]">
            {locale === 'en' ? 'Playing' : '出牌中'}
          </span>
        )}

        {/* Card-back stack visual */}
        <div className="relative h-4 shrink-0 sm:h-5" style={{ width: stackWidth }}>
          {player.hand.slice(0, 16).map((card, i) => (
            <div
              key={card.id}
              className="absolute top-0 flex h-full w-3 items-center justify-center rounded-[0.3rem] border sm:w-4 sm:rounded-[0.4rem]"
              style={{
                left: i * 4,
                zIndex: i,
                background: 'linear-gradient(180deg, #eaddc4, #d7c49e)',
                borderColor: 'rgba(154,116,72,0.28)',
              }}
            >
              <span className="text-[6px] text-[var(--psy-ink-soft)] opacity-70 sm:text-[7px]">◈</span>
            </div>
          ))}
        </div>
      </div>

      {/* Offline badge — overrides penalty if hasLeft is false. Three
          mutex states: hasLeft > tentativeOffline > isPenalized. */}
      {!hasLeft && isTentativeOffline && (
        <div
          className="flex items-center justify-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold sm:text-[10px]"
          style={{
            borderColor: 'rgba(154,116,72,0.36)',
            backgroundColor: 'rgba(195,154,82,0.14)',
            color: 'var(--psy-accent-strong)',
          }}
        >
          <span>⚠</span>
          <span className="truncate">{t.offlineFull}</span>
        </div>
      )}

      {/* Left badge — overrides penalty badge */}
      {hasLeft && (
        <div
          className="flex items-center justify-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold sm:text-[10px]"
          style={{
            borderColor: 'rgba(220,106,79,0.45)',
            backgroundColor: 'rgba(120,120,120,0.15)',
            color: 'var(--psy-danger)',
          }}
        >
          <span>🚪</span>
          <span className="truncate">{t.leftGameBadge}</span>
        </div>
      )}

      {/* Penalty badge — visible to everyone (hidden when offline or left) */}
      {!hasLeft && !isTentativeOffline && isPenalized && (
        <div
          className="flex items-center justify-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold sm:text-[10px]"
          style={{
            borderColor: 'rgba(220,106,79,0.45)',
            backgroundColor: 'rgba(220,106,79,0.12)',
            color: 'var(--psy-danger)',
          }}
        >
          <span>⛔</span>
          <span className="truncate">{t.penaltyBadge}</span>
        </div>
      )}

      {/* Archive */}
      <DeclaredArea declaredSets={player.declaredSets} compact title={`${playerLabel(player, locale)}${t.archiveOf}`} locale={locale} />

      {/* Reveal trigger — opens modal */}
      {(showCards || hasRevealedSubset) && (
        <button
          type="button"
          onClick={() => setOpenModal(true)}
          className="psy-btn psy-btn-ghost w-full px-2 py-1 text-[10px]"
          style={{
            borderColor: showCards ? 'rgba(200,155,93,0.32)' : 'rgba(220,106,79,0.32)',
            color: modalAccent,
            background: showCards
              ? 'rgba(200,155,93,0.08)'
              : 'rgba(220,106,79,0.08)',
          }}
        >
          {triggerLabel}
        </button>
      )}

      {mounted && createPortal(
        <AnimatePresence>
          {openModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-[80] flex items-center justify-center overflow-hidden bg-[rgba(58,48,32,0.42)] p-4 backdrop-blur-sm"
              style={{ position: 'fixed', inset: 0, zIndex: 80, display: 'flex', overflow: 'hidden' }}
              onClick={() => setOpenModal(false)}
            >
              <motion.div
                initial={{ scale: 0.92, y: 12 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.92, y: 12 }}
                transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                onClick={(e) => e.stopPropagation()}
                className="psy-panel psy-etched flex max-h-[85vh] w-full max-w-3xl flex-col rounded-[1.75rem]"
              >
                <div
                  className="flex items-center justify-between border-b px-5 py-3"
                  style={{ borderColor: 'rgba(200,155,93,0.12)' }}
                >
                  <h3 className="psy-serif text-sm font-bold text-[var(--psy-ink)]">
                    {modalTitle}
                    <span className="ml-2 text-xs font-normal text-[var(--psy-muted)]">
                      {player.avatar} {playerLabel(player, locale)} · {t.totalCards} {modalCards.length} {t.cardsUnit}
                    </span>
                  </h3>
                  <button
                    onClick={() => setOpenModal(false)}
                    className="px-2 py-1 text-sm text-[var(--psy-ink-soft)] hover:text-[var(--psy-danger)]"
                    aria-label={t.close}
                  >
                    ✕
                  </button>
                </div>

                <div className="psy-scroll flex-1 overflow-y-auto px-5 py-4">
                  {modalCards.length === 0 ? (
                    <p className="py-8 text-center text-sm text-[var(--psy-muted)]">{t.noCardsToShow}</p>
                  ) : (
                    <div className="grid grid-cols-3 justify-items-center gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                      {modalCards.map((card) => (
                        <TarotCard key={card.id} {...cardToTarotProps(card, locale)} fluid />
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </motion.div>
  );
}
