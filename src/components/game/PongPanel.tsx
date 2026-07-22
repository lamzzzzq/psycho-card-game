'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GameCard, Dimension, DIMENSIONS, Player, isPersonalityCard } from '@/types';
import { getTargetCounts } from '@/lib/scoring';
import { DIMENSION_META } from '@/data/dimensions';
import { TarotCard } from './TarotCard';
import { cardToTarotProps } from './cardToTarotProps';
import { STRINGS, type Locale } from '@/lib/i18n';

interface PongPanelProps {
  pendingCard: GameCard;
  player: Player;
  discardedByName: string;
  selectedCardIds: number[];
  onClaim: (dimension: Dimension, handCardIds: number[]) => void;
  onSkip: () => void;
  onResolveAI: () => void;
  /** Solo play waits for a decision; PVP can retain a timed claim window. */
  autoAdvance?: boolean;
  /** 明牌难度下弃牌堆公开人格 → 判读窗口里这张弃牌也应显示维度 tag。 */
  revealPendingDimension?: boolean;
  locale?: Locale;
}

export function PongPanel({
  pendingCard,
  player,
  discardedByName,
  selectedCardIds,
  onClaim,
  onSkip,
  onResolveAI,
  autoAdvance = true,
  revealPendingDimension = false,
  locale = 'zh',
}: PongPanelProps) {
  const t = STRINGS[locale].game;
  const targets = getTargetCounts(player.bigFiveScores);
  // 已归档维度：目标行里划线花掉（用户反馈：已碰过的维度应实时划线提示）。
  const declaredDims = new Set(player.declaredSets.map((s) => s.dimension));
  const dimName = (d: Dimension) => (locale === 'en' ? DIMENSION_META[d].nameEn : DIMENSION_META[d].name);
  // 倒計時初值分兩檔：能歸檔 20s（要看牌思考+選牌，5s 根本來不及——用戶反饋）；
  // 無法歸檔只有「暫不歸檔」一個選項，5s 快速放行避免拖慢節奏。
  const [countdown, setCountdown] = useState(() => {
    if (!isPersonalityCard(pendingCard)) return 5;
    const dim = pendingCard.dimension;
    const sameCount = player.hand.filter((c) => isPersonalityCard(c) && c.dimension === dim).length;
    return sameCount + 1 >= targets[dim] ? 20 : 5;
  });

  // Solo play is deliberately player-paced. A network claim window can still
  // use its countdown so an abandoned room does not block the table.
  useEffect(() => {
    if (!autoAdvance) return;
    if (countdown <= 0) {
      onResolveAI();
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [autoAdvance, countdown, onResolveAI]);

  // Only personality cards can be claimed
  if (!isPersonalityCard(pendingCard)) return null;

  const pendingDim = pendingCard.dimension;
  // 需從手牌選的張數 = 該維度目標張數 − 1（待判讀的這張弃牌補足最後 1 張）。
  const handNeeded = Math.max(0, targets[pendingDim] - 1);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="psy-panel psy-etched shrink-0 rounded-[1.3rem] p-3 space-y-3 sm:rounded-[1.6rem] sm:p-5 sm:space-y-4"
    >
      <div className="hidden items-center justify-end sm:flex">
        {autoAdvance && (
          <span className={`font-mono text-sm font-medium tabular-nums ${countdown <= 2 ? 'animate-pulse text-[var(--psy-danger)]' : 'text-[var(--psy-accent)]'}`}>
            {countdown}s
          </span>
        )}
      </div>

      {/* Show the pending discard card */}
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="flex flex-col items-center">
          <div className="rounded-xl p-1" style={{ backgroundColor: 'rgba(200, 155, 93, 0.08)', boxShadow: 'inset 0 0 0 1px rgba(200,155,93,0.18)' }}>
            <TarotCard {...cardToTarotProps(pendingCard, locale)} width={108} revealedDimension={revealPendingDimension ? pendingDim : null} />
          </div>
        </div>

        <div className="flex-1 space-y-3 text-[11px] text-[var(--psy-ink-soft)] sm:text-xs">
          <div>
            <p className="psy-serif text-base text-[var(--psy-ink)] sm:text-lg">{discardedByName} {t.pongClueDiscarded}</p>
            <p className="mt-1 text-[var(--psy-ink-soft)]">{locale === 'en' ? (pendingCard.textEn ?? pendingCard.text) : pendingCard.text}</p>
          </div>
          <div className="rounded-xl border border-[rgba(154,116,72,0.16)] bg-[rgba(253,248,241,0.78)] px-3 py-2">
            <p className="font-medium text-[var(--psy-ink)]">{t.pongCanClaim}</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4 marker:text-[var(--psy-accent)] sm:space-y-1">
              <li>{t.pongTip1}</li>
              <li>{t.pongTip2}</li>
              <li>{t.pongTip3}</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 五维目标行：全端显示（原 sm:hidden 只在移动端）。已归档维度划线花掉。 */}
      <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
        {DIMENSIONS.map((dimension) => {
          const done = declaredDims.has(dimension);
          return (
            <div
              key={dimension}
              className={`flex min-w-0 flex-col items-center gap-0.5 rounded-md border px-1 py-1 text-center tabular-nums sm:py-1.5 ${done ? 'border-[rgba(154,116,72,0.1)] bg-[rgba(154,116,72,0.04)] text-[var(--psy-muted)] line-through' : 'border-[rgba(154,116,72,0.16)] bg-[var(--psy-card-content)] text-[var(--psy-ink-soft)]'}`}
            >
              <span className="text-[9px] font-semibold leading-tight sm:text-[11px]">{locale === 'en' ? dimension : dimName(dimension)}</span>
              <span className="text-[8px] leading-none opacity-90 sm:text-[10px]">{locale === 'en' ? `${targets[dimension]}` : `目標 ${targets[dimension]} 張`}</span>
            </div>
          );
        })}
      </div>

      {/* Actions —— 未選牌時左側顯示「先選手牌」引導 + 歸檔鈕禁用（防止空點被罰，
          測試者反饋：不知道要先選牌就點 File → 被罰停）；選了之後顯示「需 N · 已選 M」進度。 */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 text-xs leading-snug text-[var(--psy-ink-soft)]">
          {selectedCardIds.length === 0 ? (
            <span className="font-medium text-[var(--psy-accent-strong)]">{t.pongSelectFirst}</span>
          ) : (
            <>
              {t.pongNeedPrefix} <span className="font-semibold text-[var(--psy-ink)]">{handNeeded}</span> {t.pongSelectedCandidates}
              {' · '}
              {t.selectedPrefix} <span className={`font-medium ${selectedCardIds.length === handNeeded ? 'text-[var(--psy-success)]' : 'text-[var(--psy-accent-strong)]'}`}>{selectedCardIds.length}</span>
            </>
          )}
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={onSkip}
            className="rounded-full border px-3 py-1.5 text-[11px] font-medium transition sm:px-4 sm:py-2 sm:text-xs"
            style={{
              borderColor: 'rgba(200, 155, 93, 0.24)',
              color: 'var(--psy-ink-soft)',
              backgroundColor: '#fdf8f1',
            }}
          >
            {t.pongSkip}
          </button>
          <button
            onClick={() => onClaim(pendingDim, selectedCardIds)}
            disabled={selectedCardIds.length === 0}
            title={selectedCardIds.length === 0 ? t.pongNeedSelect : undefined}
            className="psy-btn psy-btn-accent px-3 py-1.5 text-[11px] font-bold disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 sm:py-2 sm:text-xs"
          >
            {t.archiveJudge}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
