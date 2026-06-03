'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GameAction, Player, isDummyCard, isPersonalityCard } from '@/types';
import { DIMENSION_META } from '@/data/dimensions';

interface GameLogProps {
  actions: GameAction[];
  players: Player[];
}

interface ActionLabel {
  tone: 'neutral' | 'success' | 'danger' | 'dimension' | 'muted';
  prefix: string;
  detail?: string;
  colorHex?: string;
  badge?: string; // 額外綠色標記，如「解除罰停」
}

function getActionLabel(action: GameAction): ActionLabel {
  // Draw never exposes card contents — that's private information until
  // the holder chooses to discard / declare it. Only show "摸了一張牌".
  if (action.type === 'draw') {
    return { tone: 'neutral', prefix: '摸了一張牌' };
  }

  if (action.type === 'discard') {
    // 兜底：正常流程已在第 2 跳解凍，此處一般不觸發（保留防殘留邊角）。
    const badge = action.clearedPenalty ? '✅ 罰停解除' : undefined;
    if (action.card && isDummyCard(action.card)) {
      return { tone: 'neutral', prefix: '棄掉了檔案註記', detail: action.card.text, badge };
    }
    if (action.card && isPersonalityCard(action.card)) {
      return { tone: 'neutral', prefix: '棄掉了一張線索牌', detail: action.card.text, badge };
    }
    return { tone: 'neutral', prefix: '棄了一張牌', badge };
  }
  if (action.type === 'hu-success') {
    return { tone: 'success', prefix: '食胡！遊戲結束' };
  }
  if (action.type === 'hu-fail') {
    return { tone: 'danger', prefix: '食胡失敗！手牌公開', detail: '罰停：跳過接下來 2 個自己的回合' };
  }
  if (action.type === 'pong-success' && action.dimension) {
    return {
      tone: 'dimension',
      prefix: `碰牌成功${action.cardCount ? ` (${action.cardCount}張)` : ''}`,
      colorHex: DIMENSION_META[action.dimension].colorHex,
    };
  }
  if (action.type === 'pong-fail') {
    const why =
      action.failReason === 'already-declared'
        ? '該維度已歸檔（重複碰）'
        : '牌不對 / 張數不夠';
    return {
      tone: 'danger',
      prefix: '碰牌失敗！手牌公開',
      detail: `${why} · 罰停：跳過接下來 2 個自己的回合`,
    };
  }
  // type === 'skip'：只由罰停自動跳過產生（主動「過」不記錄）。最後一跳會帶
  // clearedPenalty → 標「✅ 罰停解除」，讓玩家直觀看到第 2 跳後即恢復。
  return {
    tone: 'muted',
    prefix: '⛔ 因罰停 · 本回合被自動跳過',
    badge: action.clearedPenalty ? '✅ 罰停解除' : undefined,
  };
}

export function GameLog({ actions, players }: GameLogProps) {
  const [open, setOpen] = useState(false);
  const recentActions = actions.slice(-3).reverse();
  const allActions = [...actions].reverse();
  const getPlayer = (id: string) => players.find((p) => p.id === id);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="psy-panel psy-etched w-full space-y-2 overflow-hidden rounded-[1.35rem] p-3 text-left transition hover:border-[rgba(200,155,93,0.34)]"
        aria-label="查看完整行動記錄"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="psy-serif text-sm font-medium text-[var(--psy-ink)]">行動記錄</span>
          <span className="text-[10px] text-[var(--psy-accent)]">查看全部</span>
        </div>
        <div className="psy-scroll max-h-32 space-y-1.5 overflow-y-auto pr-1">
          {recentActions.length === 0 ? (
            <p className="text-xs text-[var(--psy-muted)]">暫無線索流動</p>
          ) : (
            recentActions.map((action, i) => {
              const player = getPlayer(action.playerId);
              if (!player) return null;
              const label = getActionLabel(action);
              return (
                <div
                  key={`${action.timestamp}-${action.type}-${i}`}
                  className="flex gap-1.5 rounded-xl border px-2.5 py-2 text-xs"
                  style={{
                    borderColor: 'rgba(200,155,93,0.1)',
                    background: 'linear-gradient(180deg, rgba(20,31,46,0.68), rgba(12,21,31,0.82))',
                    color: 'var(--psy-ink-soft)',
                  }}
                >
                  <span className="text-[var(--psy-ink-soft)]">{player.avatar}</span>
                  <div className="min-w-0">
                    <div className="psy-serif text-[11px] font-semibold text-[var(--psy-ink)] truncate">
                      {player.name}
                      <span className="ml-1 text-[9px] font-normal text-[var(--psy-muted)]">第{action.round}輪</span>
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
                      style={label.tone === 'dimension' ? { color: label.colorHex } : undefined}
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
              className="psy-panel psy-etched flex max-h-[80vh] w-full max-w-2xl flex-col rounded-[1.75rem]"
            >
              <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: 'rgba(200,155,93,0.12)' }}>
                <h3 className="psy-serif text-sm font-bold text-[var(--psy-ink)]">
                  行動記錄 · 共 {actions.length} 條
                </h3>
                <button
                  onClick={() => setOpen(false)}
                  className="psy-btn psy-btn-ghost px-3 py-1 text-xs"
                >
                  關閉
                </button>
              </div>

              <div className="psy-scroll flex-1 overflow-y-auto px-5 py-4">
                {allActions.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[var(--psy-muted)]">暫無線索流動</p>
                ) : (
                  <div className="space-y-2">
                    {allActions.map((action, i) => {
                      const player = getPlayer(action.playerId);
                      if (!player) return null;
                      const label = getActionLabel(action);
                      return (
                        <div
                          key={`${action.timestamp}-${action.type}-full-${i}`}
                          className="flex gap-2 rounded-xl border px-3 py-2.5 text-sm"
                          style={{
                            borderColor: 'rgba(200,155,93,0.1)',
                            background: 'linear-gradient(180deg, rgba(20,31,46,0.68), rgba(12,21,31,0.82))',
                            color: 'var(--psy-ink-soft)',
                          }}
                        >
                          <span className="text-base">{player.avatar}</span>
                          <div className="min-w-0 flex-1">
                            <div className="psy-serif text-sm text-[var(--psy-ink)]">{player.name}</div>
                            <div className="mt-1 text-xs text-[var(--psy-muted)]">第 {action.round} 輪</div>
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
                              style={label.tone === 'dimension' ? { color: label.colorHex } : undefined}
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
      </AnimatePresence>
    </>
  );
}
