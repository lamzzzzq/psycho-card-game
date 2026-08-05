'use client';

// HEXACO 遊戲組件預覽頁（仿 /card-lab 慣例）：不接引擎，用假數據擺出
// 六維歸檔進度卡（移動端 3+3 / 桌面單行 6）、判讀窗維度行、三種卡面形態。
// 給老闆/自己快速走查版式用；正式對局在 /hexaco-game。

import { useState } from 'react';
import { DIMENSIONS, Dimension } from '@/types/hexaco-game';
import { FilingProgressCard } from '@/components/hexaco-game/FilingProgressCard';
import { HexacoCard } from '@/components/game/HexacoCard';
import { HEXACO_QUESTIONS } from '@/data/hexaco-questions';
import { KNOWLEDGE_CARDS } from '@/data/dummy-cards';
import { useLocaleStore } from '@/lib/i18n';
import { useHydrated } from '@/stores/useHydration';

const SAMPLE_TARGETS: Record<Dimension, number> = { H: 3, E: 4, X: 2, A: 3, C: 5, O: 3 };

export default function HexacoLabPage() {
  const hydrated = useHydrated();
  const localeRaw = useLocaleStore((s) => s.locale);
  const locale = hydrated ? localeRaw : 'zh';
  const [declared, setDeclared] = useState<Set<Dimension>>(new Set(['X', 'O']));

  const q = HEXACO_QUESTIONS.find((x) => x.dimension === 'H')!;
  const k = KNOWLEDGE_CARDS[0];

  return (
    <main className="mx-auto w-full max-w-4xl space-y-8 px-4 py-10">
      <h1 className="psy-serif text-2xl text-[var(--psy-ink)]">HEXACO 遊戲組件預覽</h1>

      <section className="space-y-2">
        <p className="psy-eyebrow text-[10px]">歸檔進度卡（縮窄窗口看 3+3 兩行）</p>
        <FilingProgressCard
          locale={locale}
          roundText={locale === 'en' ? 'Round 1/10' : '第 1/10 輪'}
          info={<span className="ml-auto truncate font-medium">已完成 {declared.size}/6</span>}
          targets={SAMPLE_TARGETS}
          declaredDims={declared}
          collapsible
          onOpenArchive={() => {
            // 預覽：點格子隨機切換一維歸檔態，方便看兩種底色
            const d = DIMENSIONS[Math.floor(Math.random() * 6)];
            setDeclared((prev) => {
              const next = new Set(prev);
              if (next.has(d)) next.delete(d); else next.add(d);
              return next;
            });
          }}
        />
      </section>

      <section className="space-y-2">
        <p className="psy-eyebrow text-[10px]">卡面三態：人格題面 / 揭示維度角標 / 知識牌</p>
        <div className="flex flex-wrap items-start gap-4">
          <HexacoCard text={q.text} textEn={q.textEn} imageSrc={`/cards/hexaco/${q.id}.webp`} locale={locale} width={170} />
          <HexacoCard text={q.text} textEn={q.textEn} imageSrc={`/cards/hexaco/${q.id}.webp`} locale={locale} width={170} revealedDimension="H" />
          <HexacoCard
            text={k.termZh}
            textEn={k.term}
            isDummy
            description={locale === 'en' ? k.definition : k.definitionZh}
            locale={locale}
            width={170}
          />
          <HexacoCard text={q.text} textEn={q.textEn} locale={locale} width={170} selected />
          <HexacoCard text="" faceDown locale={locale} width={170} />
        </div>
      </section>
    </main>
  );
}
