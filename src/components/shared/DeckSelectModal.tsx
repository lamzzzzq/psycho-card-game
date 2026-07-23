'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { STRINGS, type Locale } from '@/lib/i18n';
import { renderCjk } from '@/lib/renderCjk';

// 三个人格牌堆入口（与 pvp 建房牌堆选择一致）：目前仅 Big Five 可玩；HEXACO 未开放对局，
// 但可点开介绍预览页(/hexaco)；CPAI 仍完全锁定「即将上线」。
const DECKS = [
  { id: 'big-five', name: 'Big Five', nameKey: null, subKey: 'deckBigFiveSub', locked: false, previewHref: null },
  { id: 'hexaco', name: null, nameKey: 'deckHexacoName', subKey: 'deckHexacoSub', locked: true, previewHref: '/hexaco' },
  { id: 'cpai', name: null, nameKey: 'deckCpaiName', subKey: 'deckCpaiSub', locked: true, previewHref: null },
] as const;

/**
 * 全屏遮罩牌堆选择模态。「玩法教学」「开始测评」点下先弹此模态，选 Big Five 才继续。
 * onSelect 由调用方决定去向（tutorial / assessment）。
 */
export function DeckSelectModal({
  open,
  onClose,
  onSelect,
  loc,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: () => void;
  loc: Locale;
}) {
  const router = useRouter();
  const p = STRINGS[loc].pvpLobby;
  const h = STRINGS[loc].home;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(58,48,32,0.5)] px-5 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="psy-panel psy-etched relative w-full max-w-lg space-y-5 rounded-[1.6rem] p-6 sm:p-7"
          >
            <button
              onClick={onClose}
              aria-label={h.deckModalClose}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--psy-border)] bg-[var(--psy-card-content)] text-xl leading-none text-[var(--psy-muted)] shadow-[0_2px_8px_rgba(96,72,38,0.12)] transition hover:text-[var(--psy-ink)]"
            >
              ×
            </button>

            <div className="space-y-1 pr-10 text-left">
              <h2 className="psy-serif text-2xl text-[var(--psy-ink)]">{h.deckModalTitle}</h2>
              <p className="text-sm leading-6 text-[var(--psy-ink-soft)]">{h.deckModalSub}</p>
            </div>

            <div className="grid gap-3">
              {DECKS.map((d) => {
                // 可点：未锁(Big Five 进入流程) 或 锁但有预览页(HEXACO → /hexaco)。CPAI 完全禁用。
                const clickable = !d.locked || d.previewHref !== null;
                const handleClick = () => {
                  if (!d.locked) { onSelect(); return; }
                  if (d.previewHref) { onClose(); router.push(d.previewHref); }
                };
                return (
                  <button
                    key={d.id}
                    disabled={!clickable}
                    onClick={handleClick}
                    title={d.locked && !d.previewHref ? p.comingSoon : ''}
                    className={`psy-tile flex flex-col items-start gap-1 px-4 py-4 text-left transition ${!clickable ? 'cursor-not-allowed opacity-55' : ''}`}
                  >
                    <div className="flex w-full items-center justify-between gap-2">
                      <span className="psy-serif text-base text-[var(--psy-ink)]">{d.name ?? p[d.nameKey as 'deckCpaiName' | 'deckHexacoName']}</span>
                      {d.locked && d.previewHref && (
                        <span className="shrink-0 text-[10px] font-medium text-[var(--psy-accent)]">{p.deckPreview} →</span>
                      )}
                      {d.locked && !d.previewHref && (
                        <span className="shrink-0 text-[10px] text-[var(--psy-muted)]">🔒 {p.comingSoon}</span>
                      )}
                    </div>
                    <span className="text-xs leading-snug text-[var(--psy-muted)]">{renderCjk(p[d.subKey], loc)}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
