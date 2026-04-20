'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { GameAction, Player, isDummyCard, isPersonalityCard } from '@/types';

interface GameLogProps {
  actions: GameAction[];
  players: Player[];
}

function getActionLabel(action: GameAction) {
  if ((action.type === 'draw' || action.type === 'discard') && action.card) {
    if (isDummyCard(action.card)) {
      return {
        tone: 'neutral' as const,
        prefix: action.type === 'draw' ? '抽到了档案注记' : '弃掉了档案注记',
        detail: action.card.text,
      };
    }

    if (isPersonalityCard(action.card)) {
      return {
        tone: 'neutral' as const,
        prefix: action.type === 'draw' ? '抽到了一张线索牌' : '弃掉了一张线索牌',
        detail: action.card.text,
      };
    }
  }

  if (action.type === 'draw') {
    return { tone: 'neutral' as const, prefix: '抽了一张牌' };
  }
  if (action.type === 'discard') {
    return { tone: 'neutral' as const, prefix: '弃了一张牌' };
  }
  if (action.type === 'hu-success') {
    return { tone: 'success' as const, prefix: '食胡！游戏结束' };
  }
  if (action.type === 'hu-fail') {
    return { tone: 'danger' as const, prefix: '食胡失败！手牌公开，罚停一轮' };
  }
  if (action.type === 'pong-success' && action.dimension) {
    return {
      tone: 'success' as const,
      prefix: `碰牌成功${action.cardCount ? ` (${action.cardCount}张)` : ''}`,
    };
  }
  if (action.type === 'pong-fail' && action.dimension) {
    return {
      tone: 'danger' as const,
      prefix: '碰牌失败！手牌公开',
    };
  }
  return { tone: 'muted' as const, prefix: '跳过本轮' };
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
        aria-label="查看完整行动记录"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="psy-serif text-sm font-medium text-[var(--psy-ink)]">行动记录</span>
          <span className="text-[10px] text-[var(--psy-accent)]">查看全部</span>
        </div>
        <div className="psy-scroll max-h-32 space-y-1.5 overflow-y-auto pr-1">
          {recentActions.length === 0 ? (
            <p className="text-xs text-[var(--psy-muted)]">暂无线索流动</p>
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
                    <div
                      className={`${
                        label.tone === 'success'
                          ? 'font-bold text-emerald-300'
                          : label.tone === 'danger'
                          ? 'text-red-300'
                          : label.tone === 'muted'
                          ? 'text-[var(--psy-muted)]'
                          : ''
                      }`}
                      style={label.tone === 'dimension' ? { color: label.colorHex } : undefined}
                    >
                      {label.prefix}
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
                  行动记录 · 共 {actions.length} 条
                </h3>
                <button
                  onClick={() => setOpen(false)}
                  className="psy-btn psy-btn-ghost px-3 py-1 text-xs"
                >
                  关闭
                </button>
              </div>

              <div className="psy-scroll flex-1 overflow-y-auto px-5 py-4">
                {allActions.length === 0 ? (
                  <p className="py-8 text-center text-sm text-[var(--psy-muted)]">暂无线索流动</p>
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
                            <div className="mt-1 text-xs text-[var(--psy-muted)]">第 {action.round} 轮</div>
                          </div>
                          <div className="min-w-0 flex-[1.4] text-sm">
                            <div
                              className={`${
                                label.tone === 'success'
                                  ? 'font-bold text-emerald-300'
                                  : label.tone === 'danger'
                                  ? 'text-red-300'
                                  : label.tone === 'muted'
                                  ? 'text-[var(--psy-muted)]'
                                  : ''
                              }`}
                              style={label.tone === 'dimension' ? { color: label.colorHex } : undefined}
                            >
                              {label.prefix}
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
