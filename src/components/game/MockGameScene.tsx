'use client';

// 静态打牌场景 mock —— 仅用于 /card-lab 预览新卡在真实牌桌里的观感（手机优先）。
// 不接任何真实游戏逻辑，纯展示。
import { TarotCard } from '@/components/game/TarotCard';
import { QUESTIONS } from '@/data/questions';
import { STRINGS } from '@/lib/i18n';

const HAND = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 27, 41].map((id) => QUESTIONS.find((q) => q.id === id)!);
const DISCARDS = [12, 24, 35].map((id) => QUESTIONS.find((q) => q.id === id)!);
const DRAWN = QUESTIONS.find((q) => q.id === 15)!;

function Opponent({ avatar, name, count, tg }: { avatar: string; name: string; count: number; tg: { cardsUnit: string; archiveCount: string } }) {
  return (
    <div className="flex items-center gap-2 rounded-[1rem] border border-[var(--psy-border)] bg-[var(--psy-card)] px-2.5 py-1.5">
      <span className="text-lg leading-none">{avatar}</span>
      <div className="min-w-0">
        <div className="psy-serif text-xs text-[var(--psy-ink)]">{name}</div>
        <div className="text-[10px] text-[var(--psy-muted)]">{count} {tg.cardsUnit} · {tg.archiveCount} 2/5</div>
      </div>
      <div className="flex">
        {Array.from({ length: Math.min(count, 5) }).map((_, i) => (
          <div key={i} style={{ marginLeft: i ? -14 : 0 }}>
            <TarotCard faceDown text="" width={22} />
          </div>
        ))}
      </div>
    </div>
  );
}

export function MockGameScene({ locale }: { locale: 'zh' | 'en' }) {
  const tg = STRINGS[locale].game;
  return (
    <div className="mx-auto w-full max-w-[430px] space-y-4 rounded-[1.6rem] border border-[var(--psy-border)] bg-[linear-gradient(180deg,rgba(14,24,38,0.6),rgba(8,15,24,0.6))] p-3">
      {/* 顶部：回合 + 对手 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-[var(--psy-muted)]">
          <span className="psy-serif">{locale === 'en' ? `${tg.roundWord} 3 / 5` : '第 3 / 5 輪'}</span>
          <span className="rounded-full bg-[var(--psy-accent-soft)] px-2 py-0.5 text-[var(--psy-accent)]">{tg.yourTurnShort}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Opponent avatar="🦊" name="20231007" count={5} tg={tg} />
          <Opponent avatar="🐼" name="20231012" count={4} tg={tg} />
        </div>
      </div>

      {/* 中区：弃牌堆 + 刚抽到的牌 */}
      <div className="flex items-start justify-between gap-3 rounded-[1.2rem] border border-[var(--psy-border)] bg-[rgba(0,0,0,0.18)] p-3">
        <div className="space-y-1.5">
          <p className="psy-eyebrow text-[10px]">{tg.discardPileName}</p>
          <div className="flex">
            {DISCARDS.map((q, i) => (
              <div key={q.id} style={{ marginLeft: i ? -34 : 0 }}>
                <TarotCard text={q.text} textEn={q.textEn} locale={locale} width={64} />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-1.5 text-center">
          <p className="psy-eyebrow text-[10px]">{tg.justDrawn}</p>
          <TarotCard text={DRAWN.text} textEn={DRAWN.textEn} locale={locale} width={84} selected />
        </div>
      </div>

      {/* 你的手牌：4 列网格，卡片填满单元、间距收紧 */}
      <div className="space-y-1.5">
        <p className="psy-eyebrow text-[10px]">{tg.yourHand} · {HAND.length} {tg.cardsUnit}</p>
        <div className="grid grid-cols-4 gap-1.5">
          {HAND.map((q) => (
            <TarotCard key={q.id} text={q.text} textEn={q.textEn} locale={locale} fluid />
          ))}
        </div>
      </div>

      {/* 操作栏 */}
      <div className="flex gap-2">
        <button className="psy-btn psy-btn-accent flex-1 py-2 text-xs">{tg.playCard}</button>
        <button className="psy-btn psy-btn-ghost flex-1 py-2 text-xs">{tg.selfPong}</button>
        <button className="psy-btn psy-btn-ghost flex-1 py-2 text-xs">{tg.huCard}</button>
      </div>
    </div>
  );
}
