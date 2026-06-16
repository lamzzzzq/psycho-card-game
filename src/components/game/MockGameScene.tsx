'use client';

// 静态打牌场景 mock —— 仅用于 /card-lab 预览新卡在真实牌桌里的观感（手机优先）。
// 不接任何真实游戏逻辑，纯展示。
import { TarotCard } from '@/components/game/TarotCard';
import { QUESTIONS } from '@/data/questions';

const HAND = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((id) => QUESTIONS.find((q) => q.id === id)!);
const DISCARDS = [12, 24, 35].map((id) => QUESTIONS.find((q) => q.id === id)!);
const DRAWN = QUESTIONS.find((q) => q.id === 15)!;

function Opponent({ avatar, name, count }: { avatar: string; name: string; count: number }) {
  return (
    <div className="flex items-center gap-2 rounded-[1rem] border border-[var(--psy-border)] bg-[var(--psy-card)] px-2.5 py-1.5">
      <span className="text-lg leading-none">{avatar}</span>
      <div className="min-w-0">
        <div className="psy-serif text-xs text-[var(--psy-ink)]">{name}</div>
        <div className="text-[10px] text-[var(--psy-muted)]">{count} 張 · 歸檔 2/5</div>
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
  return (
    <div className="mx-auto w-full max-w-[430px] space-y-4 rounded-[1.6rem] border border-[var(--psy-border)] bg-[linear-gradient(180deg,rgba(14,24,38,0.6),rgba(8,15,24,0.6))] p-3">
      {/* 顶部：回合 + 对手 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-[var(--psy-muted)]">
          <span className="psy-serif">第 3 / 5 回合</span>
          <span className="rounded-full bg-[var(--psy-accent-soft)] px-2 py-0.5 text-[var(--psy-accent)]">輪到你</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Opponent avatar="🦊" name="20231007" count={5} />
          <Opponent avatar="🐼" name="20231012" count={4} />
        </div>
      </div>

      {/* 中区：弃牌堆 + 刚抽到的牌 */}
      <div className="flex items-start justify-between gap-3 rounded-[1.2rem] border border-[var(--psy-border)] bg-[rgba(0,0,0,0.18)] p-3">
        <div className="space-y-1.5">
          <p className="psy-eyebrow text-[10px]">棄牌堆</p>
          <div className="flex">
            {DISCARDS.map((q, i) => (
              <div key={q.id} style={{ marginLeft: i ? -34 : 0 }}>
                <TarotCard text={q.text} textEn={q.textEn} locale={locale} width={64} />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-1.5 text-center">
          <p className="psy-eyebrow text-[10px]">剛抽到</p>
          <TarotCard text={DRAWN.text} textEn={DRAWN.textEn} locale={locale} width={84} selected />
        </div>
      </div>

      {/* 你的手牌：横向滚动 */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <p className="psy-eyebrow text-[10px]">你的手牌 · {HAND.length} 張</p>
          <span className="text-[10px] text-[var(--psy-muted)]">← 左右滑動 →</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {HAND.map((q) => (
            <TarotCard key={q.id} text={q.text} textEn={q.textEn} locale={locale} width={92} />
          ))}
        </div>
      </div>

      {/* 操作栏 */}
      <div className="flex gap-2">
        <button className="psy-btn psy-btn-accent flex-1 py-2 text-xs">打出</button>
        <button className="psy-btn psy-btn-ghost flex-1 py-2 text-xs">自摸碰</button>
        <button className="psy-btn psy-btn-ghost flex-1 py-2 text-xs">胡牌</button>
      </div>
    </div>
  );
}
