'use client';

/**
 * 知识牌(dummy card)版式对比 —— /card-lab/dummy
 * 原版：术语标题(上) + 定义正文(下)；对调版：定义(上) + 术语标题(下)。
 * 用真实 TarotCard/OrnateCard 渲染（swapKnowledge），不影响正式游戏。一律繁体。
 */
import { useState } from 'react';
import { TarotCard } from '@/components/game/TarotCard';
import { KNOWLEDGE_CARDS } from '@/data/dummy-cards';

const SAMPLES = KNOWLEDGE_CARDS.slice(0, 6);

export default function DummySwapPage() {
  const [width, setWidth] = useState(200);

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-10">
      <header className="space-y-2 text-center">
        <p className="psy-eyebrow text-[11px] text-[var(--psy-accent)]">DUMMY CARD · 版式对比</p>
        <h1 className="psy-serif text-3xl text-[var(--psy-ink)]">知识牌：标题 / 描述 位置对调</h1>
        <p className="text-sm text-[var(--psy-muted)]">左＝原版（术语在上·定义在下）　右＝对调版（定义在上·术语在下）</p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <span className="text-xs text-[var(--psy-muted)]">卡宽</span>
          <input type="range" min={140} max={280} value={width} onChange={(e) => setWidth(Number(e.target.value))} />
          <span className="text-xs tabular-nums text-[var(--psy-ink-soft)]">{width}px</span>
        </div>
      </header>

      <div className="space-y-10">
        {SAMPLES.map((c) => (
          <div key={c.term} className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-center sm:gap-12">
            <div className="flex flex-col items-center gap-2">
              <span className="psy-eyebrow text-[10px] text-[var(--psy-muted)]">原版</span>
              <TarotCard text={c.termZh} isDummy description={c.definitionZh} width={width} />
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="psy-eyebrow text-[10px] text-[var(--psy-accent)]">对调版</span>
              <TarotCard text={c.termZh} isDummy description={c.definitionZh} width={width} swapKnowledge />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
