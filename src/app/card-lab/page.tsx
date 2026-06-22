'use client';

// 卡面设计沙盒 —— 仅用于预览新塔罗风卡框，不影响正式游戏组件。定稿后再替换 Card.tsx。
import { useState } from 'react';
import { TarotCard } from '@/components/game/TarotCard';
import { MockGameScene } from '@/components/game/MockGameScene';
import { QUESTIONS } from '@/data/questions';
import { KNOWLEDGE_CARDS } from '@/data/dummy-cards';
import { DIMENSIONS, Dimension } from '@/types';

// 每个维度取一题做样本（中英对照）
const SAMPLES = DIMENSIONS.map((d) => QUESTIONS.find((q) => q.dimension === d)!).filter(Boolean);

export default function CardLabPage() {
  const [locale, setLocale] = useState<'zh' | 'en'>('zh');
  const [width, setWidth] = useState(200);

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-10">
        <header className="space-y-2">
          <p className="psy-serif text-xs uppercase tracking-[0.4em] text-[var(--psy-ink-soft)]">Card Lab · 沙盒</p>
          <h1 className="psy-serif text-3xl text-[var(--psy-ink)]">卡面设计预览</h1>
          <p className="text-sm text-[var(--psy-ink-soft)]">CSS 金色双线框 + 拱形图窗 + 单语文字（跟随用户语言）+ 渐变占位。图片放进 <code>public/cards/</code> 即替换占位。此页不影响游戏。</p>
          <div className="flex flex-wrap items-center gap-4 pt-2 text-sm">
            <span className="flex items-center gap-1 rounded-full border border-[var(--psy-border)] p-1">
              {(['zh', 'en'] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => setLocale(l)}
                  className={`rounded-full px-3 py-1 text-xs transition ${locale === l ? 'bg-[var(--psy-accent-soft)] text-[var(--psy-accent)]' : 'text-[var(--psy-muted)]'}`}
                >
                  {l === 'zh' ? '中文' : 'English'}
                </button>
              ))}
            </span>
            <label className="flex items-center gap-2">
              宽度 {width}px
              <input type="range" min={120} max={260} value={width} onChange={(e) => setWidth(+e.target.value)} />
            </label>
          </div>
        </header>

        {/* 真实插画测试（仅 card-lab，用 _lab-sample.webp，不影响游戏） */}
        <section className="space-y-3">
          <h2 className="psy-serif text-lg text-[var(--psy-ink)]">真实插画测试（AI 生成图进框效果）</h2>
          <p className="text-xs text-[var(--psy-muted)]">测试图 <code>public/cards/_lab-sample.webp</code> 放进塔罗框（图窗 object-cover）。仅此页，不碰真实 /cards/{'{id}'}.webp。</p>
          <div className="flex flex-wrap items-end gap-5">
            {[96, 140, width].map((w, i) => (
              <div key={i} className="space-y-2 text-center">
                <TarotCard text="我和其他人在一起時感覺自在" textEn="Feel comfortable around people." dimension={'E' as Dimension} imageSrc="/cards/_lab-sample.webp" locale={locale} width={w} />
                <p className="text-xs text-[var(--psy-muted)]">{w}px</p>
              </div>
            ))}
          </div>
        </section>

        {/* 全 20 张知识牌（dummy）：术语 + 定义。重点看移动端真实手牌尺寸 96px。 */}
        <section className="space-y-4">
          <h2 className="psy-serif text-lg text-[var(--psy-ink)]">全 20 张知识牌（术语+定义）</h2>
          <p className="text-xs text-[var(--psy-muted)]">下面第一组是<strong>移动端真实手牌尺寸 96px</strong>；第二组放大可读。装饰版：术语在拱区、定义在底框。</p>
          <div>
            <p className="mb-2 text-xs text-[var(--psy-accent)]">① 移动端真实尺寸（96px）</p>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8" style={{ maxWidth: '32rem' }}>
              {KNOWLEDGE_CARDS.map((k, i) => (
                <TarotCard key={i} text={k.term} description={k.definition} isDummy locale={locale} width={96} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs text-[var(--psy-accent)]">② 放大可读（{width}px）</p>
            <div className="flex flex-wrap gap-4">
              {KNOWLEDGE_CARDS.map((k, i) => (
                <TarotCard key={i} text={k.term} description={k.definition} isDummy locale={locale} width={width} />
              ))}
            </div>
          </div>
        </section>

        {/* 已生成卡牌画廊：全 50 题，imageSrc=/cards/{id}.webp，缺图自动回退 ◈。随生随看。 */}
        <section className="space-y-3">
          <h2 className="psy-serif text-lg text-[var(--psy-ink)]">已生成画廊（全 50 题 · 缺图显 ◈）</h2>
          <p className="text-xs text-[var(--psy-muted)]">从 <code>card-art-src/{'{id}'}.png</code> 转出的 <code>/cards/{'{id}'}.webp</code>。已转的显示真图，没转的占位。跑 <code>node scripts/convert-card-art.mjs</code> 刷新。</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-6">
            {QUESTIONS.map((q) => (
              <div key={q.id} className="space-y-1 text-center">
                <TarotCard text={q.text} textEn={q.textEn} dimension={q.dimension as Dimension} imageSrc={`/cards/${q.id}.webp`} locale={locale} fluid />
                <p className="text-[10px] text-[var(--psy-muted)]">#{q.id}</p>
              </div>
            ))}
          </div>
        </section>


        {/* 真实打牌场景（手机优先） */}
        <section className="space-y-3">
          <h2 className="psy-serif text-lg text-[var(--psy-ink)]">真实打牌场景（手机优先）</h2>
          <p className="text-xs text-[var(--psy-muted)]">静态 mock，仅展示新卡在牌桌里的观感。手牌可左右滑。</p>
          <MockGameScene locale={locale} />
        </section>

        {/* 长文本压力测试：最难塞的几张（英文最长） */}
        <section className="space-y-3">
          <h2 className="psy-serif text-lg text-[var(--psy-ink)]">长文本压力测试（最难的几张）</h2>
          <p className="text-xs text-[var(--psy-muted)]">切到 English 看 #28（54字）/#22/#10/#31 会不会溢出。超出面板自动省略。</p>
          <div className="flex flex-wrap gap-5">
            {[28, 22, 10, 31, 20].map((id) => {
              const q = QUESTIONS.find((x) => x.id === id)!;
              return <TarotCard key={id} text={q.text} textEn={q.textEn} dimension={q.dimension as Dimension} locale={locale} width={width} />;
            })}
          </div>
        </section>

        {/* 五维度样本 */}
        <section className="space-y-3">
          <h2 className="psy-serif text-lg text-[var(--psy-ink)]">五维度样本（占位图）</h2>
          <div className="flex flex-wrap gap-5">
            {SAMPLES.map((q) => (
              <TarotCard key={q.id} text={q.text} textEn={q.textEn} dimension={q.dimension as Dimension} locale={locale} width={width} />
            ))}
          </div>
        </section>

        {/* 维度角标·全 5 维（测最长名 Conscientiousness 不溢出） */}
        <section className="space-y-3">
          <h2 className="psy-serif text-lg text-[var(--psy-ink)]">维度角标 · 全 5 维（测长名）</h2>
          <p className="text-xs text-[var(--psy-muted)]">切到 English 看 Conscientiousness 是否撑出卡宽（已按长度自适应缩字号）。</p>
          <div className="flex flex-wrap gap-4">
            {DIMENSIONS.map((d) => {
              const q = QUESTIONS.find((x) => x.dimension === d)!;
              return <TarotCard key={d} text={q.text} textEn={q.textEn} dimension={d} imageSrc={`/cards/${q.id}.webp`} revealedDimension={d} locale={locale} width={width} />;
            })}
          </div>
        </section>

        {/* 状态变体 */}
        <section className="space-y-3">
          <h2 className="psy-serif text-lg text-[var(--psy-ink)]">状态变体</h2>
          <div className="flex flex-wrap items-end gap-5">
            <div className="space-y-2 text-center"><TarotCard text={SAMPLES[0].text} textEn={SAMPLES[0].textEn} locale={locale} width={width} /><p className="text-xs text-[var(--psy-muted)]">默认</p></div>
            <div className="space-y-2 text-center"><TarotCard text={SAMPLES[0].text} textEn={SAMPLES[0].textEn} locale={locale} width={width} selected /><p className="text-xs text-[var(--psy-muted)]">选中（绿光）</p></div>
            <div className="space-y-2 text-center"><TarotCard text={SAMPLES[0].text} textEn={SAMPLES[0].textEn} locale={locale} width={width} revealedDimension={SAMPLES[0].dimension as Dimension} /><p className="text-xs text-[var(--psy-muted)]">揭示维度角标</p></div>
            <div className="space-y-2 text-center"><TarotCard text="Trait Theory" description="Views personality as a configuration of stable, measurable traits." locale={locale} width={width} isDummy /><p className="text-xs text-[var(--psy-muted)]">知识牌/dummy</p></div>
          </div>
        </section>

        {/* 真实游戏尺寸参考 */}
        <section className="space-y-3">
          <h2 className="psy-serif text-lg text-[var(--psy-ink)]">真实游戏尺寸参考（手牌 ≈ 96px）</h2>
          <div className="flex flex-wrap gap-3">
            {SAMPLES.map((q) => (
              <TarotCard key={q.id} text={q.text} textEn={q.textEn} locale={locale} width={96} />
            ))}
          </div>
          <p className="text-xs text-[var(--psy-muted)]">注：手牌这么小时英文会很挤——这也是为什么小卡(compact/tiny)计划不显示图、放大时才显示。</p>
        </section>
      </div>
    </div>
  );
}
