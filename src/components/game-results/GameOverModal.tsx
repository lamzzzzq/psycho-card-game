'use client';

import { motion } from 'framer-motion';
import { DeclaredSet } from '@/types';
import { DeclaredArea } from '@/components/game/DeclaredArea';
import { KnowledgeQuiz } from '@/components/game-results/KnowledgeQuiz';
import { STRINGS, type Locale } from '@/lib/i18n';

// 单机(Player)与 PVP(SerializedPlayer)结构不同——两边各自适配成这个通用结构，
// 共用同一个结算展示。declaredSets 是公开信息(明着碰/归档)，PVP 也有完整卡牌。
export interface GameOverPlayer {
  id: string;
  name: string;
  avatar: string;
  declaredSets: DeclaredSet[];
  remainingCards: number; // 单机=hand.length，PVP=handCount
  isYou: boolean;         // 高亮「你」+ 决定标题是否「你贏了」
}

interface GameOverModalProps {
  players: GameOverPlayer[];
  winnerId: string | null;
  onPlayAgain: () => void;
  onBackToLobby: () => void;
  locale?: Locale;
}

export function GameOverModal({ players, winnerId, onPlayAgain, onBackToLobby, locale = 'zh' }: GameOverModalProps) {
  const tg = STRINGS[locale].game;
  // 名次：winner 置顶（last-standing 结局 winner 不一定归档最多），其余按归档多者前、手牌少者前。
  const ranked = [...players].sort(
    (a, b) =>
      ((b.id === winnerId ? 1 : 0) - (a.id === winnerId ? 1 : 0)) ||
      (b.declaredSets.length - a.declaredSets.length) ||
      (a.remainingCards - b.remainingCards)
  );
  const winner = ranked.find((p) => p.id === winnerId) ?? ranked[0];
  const isYouWinner = !!winner?.isYou;
  const hasFullWinner = (winner?.declaredSets.length ?? 0) === 5;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[90] overflow-y-auto bg-[linear-gradient(180deg,#f2e7cf_0%,#faf5e9_42%,#e9d8b4_100%)] px-4 py-10"
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="mx-auto w-full max-w-3xl space-y-8"
      >
        <div className="space-y-2 text-center">
          <div className="text-5xl">{isYouWinner ? '🏆' : '😯'}</div>
          <h2 className="psy-serif text-4xl text-[var(--psy-ink)] sm:text-5xl">
            {isYouWinner ? tg.youWin : `${winner?.name ?? ''} ${tg.winShort}`}
          </h2>
          <p className="text-sm text-[var(--psy-muted)]">
            {hasFullWinner
              ? `${isYouWinner ? (locale === 'en' ? 'You' : '你') : winner?.name ?? ''} ${tg.wonAllDims}`
              : tg.roundEndRank}
          </p>
        </div>

        <div className="space-y-4">
          {ranked.map((player, i) => {
            const declaredCount = player.declaredSets.length;
            const medals = ['🥇', '🥈', '🥉', ''];
            const isFirst = i === 0;
            return (
              <div
                key={player.id}
                className="space-y-4 rounded-[1.35rem] border bg-[var(--psy-card-content)] p-5 shadow-[0_16px_30px_rgba(96,72,38,0.12)]"
                style={{
                  borderColor: isFirst ? 'var(--psy-border-strong)' : 'rgba(200,155,93,0.14)',
                  background: isFirst ? 'var(--psy-accent-soft)' : 'rgba(255,255,255,0.02)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{medals[i] || `#${i + 1}`}</span>
                    <span>{player.avatar}</span>
                    <div className={`psy-serif text-sm ${player.isYou ? 'text-[var(--psy-accent)]' : 'text-[var(--psy-ink)]'}`}>
                      {player.name}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-[var(--psy-ink)]">
                      {declaredCount}/5 {tg.archiveCount}
                    </div>
                    {player.remainingCards > 0 && (
                      <div className="text-[10px] text-[var(--psy-danger)]">
                        {tg.remainingPrefix} {player.remainingCards} {tg.cardsUnit}
                      </div>
                    )}
                  </div>
                </div>
                <DeclaredArea declaredSets={player.declaredSets} locale={locale} expanded wide />
              </div>
            );
          })}
        </div>

        {/* #8 局末概念小测（可选，激励读知识卡） */}
        <KnowledgeQuiz locale={locale} />

        <div className="mx-auto flex w-full max-w-lg gap-3">
          <button onClick={onPlayAgain} className="psy-btn psy-btn-accent flex-1 py-3 font-medium">
            {tg.playAgain}
          </button>
          <button onClick={onBackToLobby} className="psy-btn psy-btn-ghost px-6 py-3 text-sm">
            {locale === 'en' ? 'Home' : '返回主頁'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
