'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { GameAction, Player, isDummyCard, isPersonalityCard } from '@/types';
import { DIMENSION_META } from '@/data/dimensions';
import { STRINGS, playerLabel, type Locale } from '@/lib/i18n';

interface GameLogProps {
  actions: GameAction[];
  players: Player[];
  locale?: Locale;
  overlayZIndex?: number;
  /** 移动 sheet 里直接内联渲染完整列表（一步到位，不再套「最近3条摘要卡 + 查看全部」两步）。 */
  inline?: boolean;
  /** 竖卡模式：与抽/弃牌堆同尺寸同风格的竖卡片，三者并排。点开看全部。 */
  vertical?: boolean;
}

interface ActionLabel {
  tone: 'neutral' | 'success' | 'danger' | 'dimension' | 'muted';
  prefix: string;
  detail?: string;
  colorHex?: string;
  badge?: string; // 額外綠色標記，如「解除罰停」
}

function getActionLabel(action: GameAction, locale: Locale): ActionLabel {
  const tg = STRINGS[locale].game;
  // Draw never exposes card contents — that's private information until
  // the holder chooses to discard / declare it. Only show "drew a card".
  if (action.type === 'draw') {
    return { tone: 'neutral', prefix: tg.logDrew };
  }

  if (action.type === 'discard') {
    // 兜底：正常流程已在第 2 跳解凍，此處一般不觸發（保留防殘留邊角）。
    const badge = action.clearedPenalty ? tg.logPenaltyCleared : undefined;
    if (action.card && isDummyCard(action.card)) {
      const detail = locale === 'en' ? (action.card.textEn ?? action.card.text) : action.card.text;
      return { tone: 'neutral', prefix: tg.logDiscardedNote, detail, badge };
    }
    if (action.card && isPersonalityCard(action.card)) {
      const detail = locale === 'en' ? (action.card.textEn ?? action.card.text) : action.card.text;
      return { tone: 'neutral', prefix: tg.logDiscardedClue, detail, badge };
    }
    return { tone: 'neutral', prefix: tg.logDiscardedCard, badge };
  }
  if (action.type === 'hu-success') {
    return { tone: 'success', prefix: tg.logHuSuccess };
  }
  if (action.type === 'hu-fail') {
    return { tone: 'danger', prefix: tg.logHuFailPrefix, detail: tg.logHuFailDetail };
  }
  if (action.type === 'pong-success' && action.dimension) {
    return {
      tone: 'dimension',
      prefix: `${tg.logPongSuccessPrefix}${action.cardCount ? ` (${action.cardCount}${tg.logCardsUnit})` : ''}`,
      colorHex: DIMENSION_META[action.dimension].colorHex,
    };
  }
  if (action.type === 'pong-fail') {
    const why =
      action.failReason === 'already-declared'
        ? tg.logPongFailDupe
        : tg.logPongFailWrong;
    return {
      tone: 'danger',
      prefix: tg.logPongFailPrefix,
      detail: `${why} · ${tg.logPongFailPenalty}`,
    };
  }
  // type === 'skip'：只由罰停自動跳過產生（主動「過」不記錄）。最後一跳會帶
  // clearedPenalty → 標「✅ 罰停解除」，讓玩家直觀看到第 2 跳後即恢復。
  return {
    tone: 'muted',
    prefix: tg.logSkip,
    badge: action.clearedPenalty ? tg.logPenaltyCleared : undefined,
  };
}

export function GameLog({ actions, players, locale = 'zh', overlayZIndex = 80, inline = false, vertical = false }: GameLogProps) {
  const tg = STRINGS[locale].game;
  const [open, setOpen] = useState(false);
  const recentActions = actions.slice(-3).reverse();
  const allActions = [...actions].reverse();
  const getPlayer = (id: string) => players.find((p) => p.id === id);

  // 完整列表单行（摘要卡的 modal 与 inline 模式共用）。
  const renderFullRow = (action: GameAction, i: number) => {
    const player = getPlayer(action.playerId);
    if (!player) return null;
    const label = getActionLabel(action, locale);
    return (
      <div
        key={`${action.timestamp}-${action.type}-full-${i}`}
        className="flex gap-2 rounded-xl border px-3 py-2.5 text-sm"
        style={{ borderColor: 'rgba(154,116,72,0.14)', background: 'linear-gradient(180deg, #fdf8f1, #f8f1e4)', boxShadow: '0 8px 18px rgba(96,72,38,0.08)', color: 'var(--psy-ink-soft)' }}
      >
        <span className="text-base">{player.avatar}</span>
        <div className="min-w-0 flex-1">
          <div className="psy-serif text-sm text-[var(--psy-ink)]">{playerLabel(player, locale)}</div>
          <div className="mt-1 text-xs text-[var(--psy-muted)]">{tg.roundWord} {action.round}</div>
        </div>
        <div className="min-w-0 flex-[1.4] text-sm">
          <div
            className={label.tone === 'success' ? 'font-medium text-[var(--psy-success)]' : label.tone === 'danger' ? 'text-[var(--psy-danger)]' : label.tone === 'muted' ? 'text-[var(--psy-muted)]' : ''}
            style={label.tone === 'dimension' ? { color: 'var(--psy-accent)' } : undefined}
          >
            {label.prefix}
            {label.badge && <span className="ml-1.5 text-xs font-semibold text-[var(--psy-success)]">{label.badge}</span>}
          </div>
          {label.detail && <div className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--psy-muted)]">{label.detail}</div>}
        </div>
      </div>
    );
  };

  // 移动 sheet：一步直达完整列表，无摘要卡、无二级弹窗。
  if (inline) {
    return allActions.length === 0 ? (
      <p className="py-8 text-center text-sm text-[var(--psy-muted)]">{tg.logNoActions}</p>
    ) : (
      <div className="space-y-2">{allActions.map(renderFullRow)}</div>
    );
  }

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      {vertical && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={tg.sheetLogTitle}
          className="psy-etched flex aspect-[4/7] w-[72px] flex-col overflow-hidden rounded-[1.1rem] p-1.5 text-left transition hover:border-[rgba(200,155,93,0.45)] sm:w-32 sm:rounded-[1.35rem] sm:p-2.5"
          style={{ background: 'linear-gradient(180deg, #fdf8f1, #f3ead9)', borderColor: 'rgba(154,116,72,0.28)', boxShadow: 'inset 0 0 0 1px rgba(255,250,240,0.46), 0 14px 24px rgba(96,72,38,0.12)' }}
        >
          <div className="mb-1 flex items-center justify-between gap-1">
            <span className="truncate text-[10px] font-semibold text-[var(--psy-ink)] sm:text-xs">{tg.sheetLogTitle}</span>
            <span className="hidden shrink-0 text-[8px] text-[var(--psy-accent)] sm:inline">{tg.logViewAll}</span>
          </div>
          <div className="psy-scroll flex-1 space-y-1 overflow-y-auto pr-0.5">
            {recentActions.length === 0 ? (
              <p className="text-[9px] leading-tight text-[var(--psy-muted)] sm:text-[10px]">{tg.logNoActions}</p>
            ) : (
              recentActions.map((action, i) => {
                const player = getPlayer(action.playerId);
                if (!player) return null;
                const label = getActionLabel(action, locale);
                return (
                  <div key={`${action.timestamp}-v-${i}`} className="text-[9px] leading-tight sm:text-[10px]">
                    <span className="text-[var(--psy-ink-soft)]">{player.avatar} </span>
                    <span
                      className={label.tone === 'success' ? 'text-[var(--psy-success)]' : label.tone === 'danger' ? 'text-[var(--psy-danger)]' : 'text-[var(--psy-ink-soft)]'}
                      style={label.tone === 'dimension' ? { color: 'var(--psy-accent)' } : undefined}
                    >
                      {label.prefix}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </button>
      )}
      {!vertical && (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="psy-panel psy-etched w-full space-y-2 overflow-hidden rounded-[1.35rem] p-3 text-left transition hover:border-[rgba(200,155,93,0.34)]"
        aria-label={tg.sheetLogTitle}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="psy-serif text-sm font-medium text-[var(--psy-ink)]">{tg.sheetLogTitle}</span>
          <span className="text-[10px] text-[var(--psy-accent)]">{tg.logViewAll}</span>
        </div>
        <div className="psy-scroll max-h-32 space-y-1.5 overflow-y-auto pr-1">
          {recentActions.length === 0 ? (
            <p className="text-xs text-[var(--psy-muted)]">{tg.logNoActions}</p>
          ) : (
            recentActions.map((action, i) => {
              const player = getPlayer(action.playerId);
              if (!player) return null;
              const label = getActionLabel(action, locale);
              return (
                <div
                  key={`${action.timestamp}-${action.type}-${i}`}
                  className="flex gap-1.5 rounded-xl border px-2.5 py-2 text-xs"
                  style={{
                    borderColor: 'rgba(154,116,72,0.14)',
                    background: 'linear-gradient(180deg, #fdf8f1, #f8f1e4)',
                    boxShadow: '0 8px 18px rgba(96,72,38,0.08)',
                    color: 'var(--psy-ink-soft)',
                  }}
                >
                  <span className="text-[var(--psy-ink-soft)]">{player.avatar}</span>
                  <div className="min-w-0">
                    <div className="psy-serif text-[11px] font-semibold text-[var(--psy-ink)] truncate">
                      {playerLabel(player, locale)}
                      <span className="ml-1 text-[9px] font-normal text-[var(--psy-muted)]">{tg.logRoundPrefix}{action.round}{tg.logRoundSuffix}</span>
                    </div>
                    <div
                      className={`mt-0.5 ${
                        label.tone === 'success'
                          ? 'font-medium text-[var(--psy-success)]'
                          : label.tone === 'danger'
                          ? 'text-[var(--psy-danger)]'
                          : label.tone === 'muted'
                          ? 'text-[var(--psy-muted)]'
                          : ''
                      }`}
                      style={label.tone === 'dimension' ? { color: 'var(--psy-accent)' } : undefined}
                    >
                      {label.prefix}
                      {label.badge && (
                        <span className="ml-1 text-[10px] font-semibold text-[var(--psy-success)]">{label.badge}</span>
                      )}
                    </div>
                    {label.detail && (
                      <div className="mt-0.5 line-clamp-1 text-[10px] text-[var(--psy-muted)]">
                        {label.detail}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </button>
      )}

      {/* 弹窗必须 portal 到 body：移动端此组件渲染在 MobileGameSheet（有
          transform 动画）内部，fixed 会相对 transformed 祖先定位 → 弹窗被
          抽屉裁切、无法滚动、关闭按钮不可见（用户实测反馈）。 */}
      {typeof document !== 'undefined' && createPortal(
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[80] flex items-center justify-center overflow-hidden bg-[rgba(58,48,32,0.42)] p-4 backdrop-blur-sm"
            style={{ position: 'fixed', inset: 0, zIndex: overlayZIndex, display: 'flex', overflow: 'hidden' }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 12 }}
              transition={{ type: 'spring', stiffness: 320, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="psy-panel psy-etched flex max-h-[80vh] w-full max-w-2xl flex-col rounded-[1.75rem]"
            >
              <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: 'rgba(200,155,93,0.12)' }}>
                <h3 className="psy-serif text-sm font-bold text-[var(--psy-ink)]">
                  {tg.logFullTitlePrefix}{actions.length}{tg.logFullTitleSuffix}
                </h3>
                <button
                  onClick={() => setOpen(false)}
                  className="psy-btn psy-btn-ghost px-3 py-1 text-xs"
                >
                  {tg.close}
                </button>
              </div>

              <div className="psy-scroll flex-1 overflow-y-auto px-5 py-4">
                {allActions.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[var(--psy-muted)]">{tg.logNoActions}</p>
                ) : (
                  <div className="space-y-2">
                    {allActions.map((action, i) => {
                      const player = getPlayer(action.playerId);
                      if (!player) return null;
                      const label = getActionLabel(action, locale);
                      return (
                        <div
                          key={`${action.timestamp}-${action.type}-full-${i}`}
                          className="flex gap-2 rounded-xl border px-3 py-2.5 text-sm"
                          style={{
                            borderColor: 'rgba(154,116,72,0.14)',
                            background: 'linear-gradient(180deg, #fdf8f1, #f8f1e4)',
                            boxShadow: '0 8px 18px rgba(96,72,38,0.08)',
                            color: 'var(--psy-ink-soft)',
                          }}
                        >
                          <span className="text-base">{player.avatar}</span>
                          <div className="min-w-0 flex-1">
                            <div className="psy-serif text-sm text-[var(--psy-ink)]">{playerLabel(player, locale)}</div>
                            <div className="mt-1 text-xs text-[var(--psy-muted)]">{tg.roundWord} {action.round}</div>
                          </div>
                          <div className="min-w-0 flex-[1.4] text-sm">
                            <div
                              className={`${
                                label.tone === 'success'
                                  ? 'font-medium text-[var(--psy-success)]'
                                  : label.tone === 'danger'
                                  ? 'text-[var(--psy-danger)]'
                                  : label.tone === 'muted'
                                  ? 'text-[var(--psy-muted)]'
                                  : ''
                              }`}
                              style={label.tone === 'dimension' ? { color: 'var(--psy-accent)' } : undefined}
                            >
                              {label.prefix}
                              {label.badge && (
                                <span className="ml-1.5 text-xs font-semibold text-[var(--psy-success)]">{label.badge}</span>
                              )}
                            </div>
                            {label.detail && (
                              <div className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--psy-muted)]">
                                {label.detail}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>,
      document.body)}
    </>
  );
}
