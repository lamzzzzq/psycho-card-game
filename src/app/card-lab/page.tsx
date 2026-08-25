'use client';

// 卡面设计沙盒 —— 仅用于预览新塔罗风卡框，不影响正式游戏组件。定稿后再替换 Card.tsx。
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { TarotCard } from '@/components/game/TarotCard';
import { HexacoCard } from '@/components/game/HexacoCard';
import { MockGameScene } from '@/components/game/MockGameScene';
import { QUESTIONS } from '@/data/questions';
import { KNOWLEDGE_CARDS } from '@/data/dummy-cards';
import { DIMENSIONS, Dimension } from '@/types';
import { HEXACO_QUESTIONS } from '@/data/hexaco-questions';
import { SD4_QUESTIONS } from '@/data/sd4-questions';
import { SD4_DIMENSION_META } from '@/data/sd4-dimensions';
import type { Sd4Dimension } from '@/data/sd4-types';
import { PrintEditionSpec } from '@/components/card-lab/PrintEditionSpec';

// 每个维度取一题做样本（中英对照）
const SAMPLES = DIMENSIONS.map((d) => QUESTIONS.find((q) => q.dimension === d)!).filter(Boolean);

type LabDeck = 'big-five' | 'hexaco' | 'sd4' | 'print';

function DeckTabs({ deck }: { deck: LabDeck }) {
  const setDeck = (nextDeck: LabDeck) => {
    window.history.pushState(null, '', `/card-lab?deck=${nextDeck}`);
  };

  return (
    <nav aria-label="人格牌堆" className="flex w-fit items-center gap-1 rounded-full border border-[var(--psy-border)] bg-white/60 p-1">
      {([
        ['big-five', 'Big Five · 50 張'],
        ['hexaco', 'HEXACO · 60 張'],
        ['sd4', 'Dark Tetrad · 28 張'],
        ['print', '🖨 印刷版方案'],
      ] as const).map(([id, label]) => (
        <button
          key={id}
          type="button"
          aria-current={deck === id ? 'page' : undefined}
          onClick={() => setDeck(id)}
          className={`rounded-full px-4 py-2 text-sm transition ${deck === id ? 'bg-[var(--psy-accent)] font-semibold text-white shadow-sm' : 'text-[var(--psy-ink-soft)] hover:bg-[var(--psy-accent-soft)]'}`}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}

function Sd4PreviewCard({
  question,
  locale,
  fluid = false,
  width = 200,
}: {
  question: (typeof SD4_QUESTIONS)[number];
  locale: 'zh' | 'en';
  fluid?: boolean;
  width?: number;
}) {
  const meta = SD4_DIMENSION_META[question.dimension];
  const label = locale === 'en' ? meta.nameEn : meta.name;
  const fontSize = label.length > 16 ? 5.4 : label.length > 12 ? 5.9 : label.length > 8 ? 6.8 : 8.2;

  return (
    <div
      className="relative shrink-0"
      style={{ containerType: 'inline-size', width: fluid ? '100%' : width }}
    >
      <HexacoCard
        text={question.text}
        textEn={question.textEn}
        imageSrc={`/cards/sd4/${question.id}.webp`}
        locale={locale}
        fluid
      />
      <div
        className="pointer-events-none absolute z-20"
        style={{ left: '50%', top: '53%', transform: 'translate(-50%,-50%)', maxWidth: '95%' }}
      >
        <span
          className="psy-sans inline-flex items-center rounded-full font-bold uppercase leading-none whitespace-nowrap"
          style={{
            padding: '2.6cqw 6cqw',
            fontSize: `${fontSize}cqw`,
            letterSpacing: '0.06em',
            background: meta.colorHex,
            color: '#ffffff',
            border: '1.5px solid rgba(154,116,72,0.45)',
            boxShadow: '0 0.5cqw 1.6cqw rgba(96,72,38,0.24)',
          }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

function Sd4Gallery({ locale, width }: { locale: 'zh' | 'en'; width: number }) {
  const dimensions: Sd4Dimension[] = ['M', 'N', 'P', 'S'];
  const longestZh = SD4_QUESTIONS.find((item) => item.id === 17)!;
  const longestEn = SD4_QUESTIONS.find((item) => item.id === 3)!;
  // 邊界測試要能直接判斷可讀性，不跟 3 欄縮圖一起縮到約 100px。
  // 只放大這個預覽容器，卡片本身的 4:7 結構、圖文比例與文字面板完全不動。
  const boundaryWidth = Math.max(width, 240);

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h2 className="psy-serif text-lg text-[var(--psy-ink)]">Dark Tetrad 維度角標 · 全 4 維</h2>
        <p className="text-xs text-[var(--psy-muted)]">
          角標沿用拱底中央膠囊；顏色與 SD4 報告一致。切到 English 檢查最長的 Machiavellianism。
        </p>
        <div className="flex flex-wrap gap-4">
          {dimensions.map((dimension) => {
            const question = SD4_QUESTIONS.find((item) => item.dimension === dimension)!;
            return <Sd4PreviewCard key={dimension} question={question} locale={locale} width={width} />;
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="psy-serif text-lg text-[var(--psy-ink)]">最長題面邊界測試</h2>
        <p className="text-xs text-[var(--psy-muted)]">
          中文最長為 #17（卡面 27 字）；英文最長為 #3（卡面 74 字／13 詞），且 #3 同時帶全套最長角標 Machiavellianism。
          此區只放大預覽，不改卡片尺寸比例、圖片占比或文字空間。
        </p>
        <div className="flex flex-wrap gap-6">
          <div className="space-y-2 text-center">
            <Sd4PreviewCard question={longestZh} locale="zh" width={boundaryWidth} />
            <p className="text-xs text-[var(--psy-muted)]">中文最長 · #17 · 27 字 · 9.5cqw</p>
          </div>
          <div className="space-y-2 text-center">
            <Sd4PreviewCard question={longestEn} locale="en" width={boundaryWidth} />
            <p className="text-xs text-[var(--psy-muted)]">英文最長＋最長角標 · #3 · 74 字／13 詞 · 8.8cqw</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="psy-serif text-lg text-[var(--psy-ink)]">Dark Tetrad 已生成畫廊（28 題）</h2>
        <p className="text-xs text-[var(--psy-muted)]">
          圖片固定讀取 <code>public/cards/sd4/</code>，原圖存放於 <code>card-art-src/sd4/</code>；與 Big Five、HEXACO 完全分離。
        </p>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-6">
          {SD4_QUESTIONS.map((question) => (
            <div key={question.id} className="space-y-1 text-center">
              <Sd4PreviewCard question={question} locale={locale} fluid />
              <p className="text-[10px] text-[var(--psy-muted)]">#{question.id} · {question.dimension}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function HexacoGallery({ locale }: { locale: 'zh' | 'en' }) {
  return (
    <section className="space-y-3">
      <h2 className="psy-serif text-lg text-[var(--psy-ink)]">HEXACO 已生成畫廊（60 題）</h2>
      <p className="text-xs text-[var(--psy-muted)]">HEXACO 圖片固定讀取 <code>public/cards/hexaco/</code>，與 Big Five 的 <code>public/cards/</code> 完全分離。題面長 2～3 倍，改用獨立元件 <code>HexacoCard</code>（拱區收高、底框加大），與 Big Five 的卡面元件完全分離。</p>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-6">
        {HEXACO_QUESTIONS.map((q) => (
          <div key={q.id} className="space-y-1 text-center">
            <HexacoCard text={q.text} textEn={q.textEn} imageSrc={`/cards/hexaco/${q.id}.webp`} locale={locale} fluid />
            <p className="text-[10px] text-[var(--psy-muted)]">#{q.id} · {q.dimension}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CardLabContent() {
  const searchParams = useSearchParams();
  const deckParam = searchParams.get('deck');
  const deck: LabDeck = deckParam === 'hexaco' ? 'hexaco' : deckParam === 'sd4' ? 'sd4' : deckParam === 'print' ? 'print' : 'big-five';
  const [locale, setLocale] = useState<'zh' | 'en'>('zh');
  const [width, setWidth] = useState(200);

  return (
    <div className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-6xl space-y-10">
        <header className="space-y-2">
          <p className="psy-serif text-xs uppercase tracking-[0.4em] text-[var(--psy-ink-soft)]">Card Lab · 沙盒</p>
          <h1 className="psy-serif text-3xl text-[var(--psy-ink)]">{deck === 'print' ? '實體卡牌印刷方案' : deck === 'hexaco' ? 'HEXACO 卡面設計預覽' : deck === 'sd4' ? 'Dark Tetrad 卡面設計預覽' : 'Big Five 卡面設計預覽'}</h1>
          <p className="text-sm text-[var(--psy-ink-soft)]">{deck === 'print' ? '要印多少張、2／3／4 人各怎麼配牌、以及實體版的完整規則（洗牌發牌判定全部靠人手，規則必須寫死）。' : 'CSS 金色雙線框 + 拱形圖窗 + 單語文字（跟隨使用者語言）。三套牌以獨立目錄與網址分開，此頁不影響遊戲。'}</p>
          <div className="flex flex-wrap items-center gap-4 pt-2 text-sm">
            <DeckTabs deck={deck} />
            <span className={`flex items-center gap-1 rounded-full border border-[var(--psy-border)] p-1 ${deck === 'print' ? 'hidden' : ''}`}>
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
            <label className={`flex items-center gap-2 ${deck === 'print' ? 'hidden' : ''}`}>
              宽度 {width}px
              <input type="range" min={120} max={260} value={width} onChange={(e) => setWidth(+e.target.value)} />
            </label>
          </div>
        </header>

        {deck === 'print' ? <PrintEditionSpec /> : deck === 'hexaco' ? <HexacoGallery locale={locale} /> : deck === 'sd4' ? <Sd4Gallery locale={locale} width={width} /> : <>

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
                <TarotCard key={i} text={k.termZh} textEn={k.term} description={locale === 'en' ? k.definition : k.definitionZh} isDummy locale={locale} width={96} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs text-[var(--psy-accent)]">② 放大可读（{width}px）</p>
            <div className="flex flex-wrap gap-4">
              {KNOWLEDGE_CARDS.map((k, i) => (
                <TarotCard key={i} text={k.termZh} textEn={k.term} description={locale === 'en' ? k.definition : k.definitionZh} isDummy locale={locale} width={width} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs text-[var(--psy-accent)]">③ 对调版全 20 张（定义在拱区·术语在底框，{width}px）</p>
            <div className="flex flex-wrap gap-4">
              {KNOWLEDGE_CARDS.map((k, i) => (
                <TarotCard key={i} text={k.termZh} textEn={k.term} description={locale === 'en' ? k.definition : k.definitionZh} isDummy swapKnowledge locale={locale} width={width} />
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
        </>}
      </div>
    </div>
  );
}

export default function CardLabPage() {
  return (
    <Suspense fallback={<div className="min-h-screen px-6 py-10 text-sm text-[var(--psy-muted)]">載入卡牌實驗室…</div>}>
      <CardLabContent />
    </Suspense>
  );
}
