import type { ReactNode } from 'react';

// 品牌规范页 /brand —— 供内部交付：整理玩法/概念/目标/配色 + logo 方案(麻将风 & 塔罗风)。
// 纯静态展示页，不接入正式游戏逻辑；同事可据此发散更多 logo 可行性。

export const metadata = {
  title: 'Brand Kit · 人格麻將 Personalities Mahjong',
};

/* ── 配色 ── */
const NEUTRALS = [
  { name: 'Background 背景', hex: '#f4edd9' },
  { name: 'Surface 面', hex: '#fdf9f0' },
  { name: 'Card 卡', hex: '#eaddc4' },
  { name: 'Card content', hex: '#fdf8f1' },
];
const INKS = [
  { name: 'Ink 主文字', hex: '#3a3020' },
  { name: 'Ink soft', hex: '#6b5a3f' },
  { name: 'Muted 弱', hex: '#9a8a68' },
];
const ACCENTS = [
  { name: 'Accent 金', hex: '#c39a52' },
  { name: 'Accent strong', hex: '#9a7448' },
  { name: 'Success', hex: '#6f8f55' },
  { name: 'Danger', hex: '#c9603f' },
];
const DIMS = [
  { name: 'Openness 開放性', hex: '#c084fc' },
  { name: 'Conscientiousness 盡責性', hex: '#60a5fa' },
  { name: 'Extraversion 外向性', hex: '#facc15' },
  { name: 'Agreeableness 宜人性', hex: '#4ade80' },
  { name: 'Neuroticism 神經質', hex: '#f87171' },
];

function Swatch({ name, hex, dark }: { name: string; hex: string; dark?: boolean }) {
  return (
    <div className="overflow-hidden rounded-[0.9rem] border border-[var(--psy-border)] bg-[var(--psy-card-content)]">
      <div className="h-14" style={{ backgroundColor: hex }} />
      <div className="px-2.5 py-1.5">
        <div className="text-[11px] font-medium text-[var(--psy-ink)]">{name}</div>
        <div className="font-mono text-[10px] uppercase text-[var(--psy-muted)]">{hex}</div>
      </div>
    </div>
  );
}

function Section({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <p className="psy-eyebrow text-[10px]">{eyebrow}</p>
        <h2 className="psy-serif text-2xl text-[var(--psy-ink)] sm:text-3xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}

/* ── Logo 基元 ── */
const INK = '#3a3020';
const GOLD = '#c39a52';
const GOLD_STRONG = '#9a7448';
const CREAM = '#fdf8f1';

// 五维雷达小图形（麻将/塔罗内部通用）
function RadarGlyph({ cx = 60, cy = 62, r = 20 }: { cx?: number; cy?: number; r?: number }) {
  const pts = [-90, -18, 54, 126, 198].map((a) => {
    const rad = (a * Math.PI) / 180;
    return `${(cx + r * Math.cos(rad)).toFixed(1)},${(cy + r * Math.sin(rad)).toFixed(1)}`;
  });
  const data = [0.55, 0.72, 0.6, 0.78, 0.5].map((f, i) => {
    const a = (-90 + i * 72) * (Math.PI / 180);
    return `${(cx + f * r * Math.cos(a)).toFixed(1)},${(cy + f * r * Math.sin(a)).toFixed(1)}`;
  });
  return (
    <g>
      <polygon points={pts.join(' ')} fill="none" stroke={GOLD} strokeWidth="1.4" opacity="0.55" />
      {pts.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.split(',')[0]} y2={p.split(',')[1]} stroke={GOLD} strokeWidth="1" opacity="0.35" />
      ))}
      <polygon points={data.join(' ')} fill={GOLD} fillOpacity="0.28" stroke={GOLD_STRONG} strokeWidth="1.8" />
    </g>
  );
}

function CompassGlyph({ cx = 60, cy = 60 }: { cx?: number; cy?: number }) {
  return (
    <g>
      <path d={`M${cx} ${cy - 22} L${cx + 5} ${cy - 5} L${cx + 22} ${cy} L${cx + 5} ${cy + 5} L${cx} ${cy + 22} L${cx - 5} ${cy + 5} L${cx - 22} ${cy} L${cx - 5} ${cy - 5} Z`} fill={GOLD} />
      <path d={`M${cx} ${cy - 12} L${cx + 3} ${cy - 3} L${cx + 12} ${cy} L${cx + 3} ${cy + 3} L${cx} ${cy + 12} L${cx - 3} ${cy + 3} L${cx - 12} ${cy} L${cx - 3} ${cy - 3} Z`} fill={GOLD_STRONG} />
    </g>
  );
}

/* 麻将牌基底：圆角矩形 + 内金线 */
function TileBase({ children, x = 30, rot = 0 }: { children?: ReactNode; x?: number; rot?: number }) {
  return (
    <g transform={rot ? `rotate(${rot} 60 60)` : undefined}>
      <rect x={x} y="12" width="60" height="96" rx="13" fill={CREAM} stroke={INK} strokeWidth="3.4" />
      <rect x={x + 6} y="18" width="48" height="84" rx="8" fill="none" stroke={GOLD} strokeWidth="1.4" opacity="0.7" />
      {children}
    </g>
  );
}

/* 塔罗牌基底：拱顶卡框 */
function TarotBase({ children }: { children?: ReactNode }) {
  return (
    <g>
      <path d="M30 42 Q30 16 60 16 Q90 16 90 42 L90 100 Q90 108 82 108 L38 108 Q30 108 30 100 Z" fill={CREAM} stroke={INK} strokeWidth="3.4" />
      <path d="M37 44 Q37 24 60 24 Q83 24 83 44" fill="none" stroke={GOLD} strokeWidth="1.5" opacity="0.75" />
      <line x1="37" y1="96" x2="83" y2="96" stroke={GOLD} strokeWidth="1.2" opacity="0.6" />
      {children}
    </g>
  );
}

function LogoCard({ label, note, children }: { label: string; note: string; children: ReactNode }) {
  return (
    <div className="psy-panel psy-etched flex flex-col items-center gap-3 rounded-[1.3rem] p-4 text-center">
      <div className="flex h-32 w-full items-center justify-center rounded-[1rem] bg-[var(--psy-card-content)]">
        <svg viewBox="0 0 120 120" className="h-28 w-28">{children}</svg>
      </div>
      <div>
        <div className="psy-serif text-sm font-semibold text-[var(--psy-ink)]">{label}</div>
        <div className="mt-0.5 text-[11px] leading-snug text-[var(--psy-muted)]">{note}</div>
      </div>
    </div>
  );
}

export default function BrandPage() {
  return (
    <div className="flex flex-1 flex-col items-center px-6 py-10">
      <div className="w-full max-w-4xl space-y-12">
        {/* Header */}
        <header className="space-y-3">
          <p className="psy-eyebrow text-[10px]">Brand Kit · 品牌规范</p>
          <h1 className="psy-serif text-4xl leading-none text-[var(--psy-ink)] sm:text-5xl">人格麻將 · Personalities Mahjong</h1>
          <p className="max-w-2xl text-base leading-7 text-[var(--psy-ink-soft)]">
            这份文档整理项目的玩法、概念、目标与视觉配色，供同事在同一套设计语言下发散更多 logo / 视觉可行性。下方给出两个方向的 logo 草案：<strong>麻将风</strong>（老板偏向）与<strong>塔罗风</strong>（卡面延伸），仅为方向示意，非最终稿。
          </p>
        </header>

        {/* Concept */}
        <Section eyebrow="Concept · 概念" title="心理学 × 麻将">
          <div className="space-y-3 text-[15px] leading-7 text-[var(--psy-ink-soft)]">
            <p>
              一句话：<strong className="text-[var(--psy-ink)]">把人格测评、心理线索判断与卡牌对战编织在一起——先读懂自己，再在牌桌上读懂别人。</strong>
            </p>
            <p>
              玩家先完成大五人格（Big Five / OCEAN）测评得到自己的五维画像；这份画像决定牌局里每个维度需要凑齐的「目标张数」。牌桌沿用麻将的「摸牌 / 碰 / 胡」节奏，但每张牌都是一句人格陈述，归档 = 用同维度的牌凑齐一组、公开锁定。对手打出的每一张弃牌都在暴露他的人格倾向——这是「识人破局」的核心乐趣。
            </p>
          </div>
        </Section>

        {/* Gameplay */}
        <Section eyebrow="Gameplay · 玩法" title="从测评到牌桌">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { n: '01', t: '完成人格测评', d: '50 题 IPIP 量表，得到五维（OCEAN）画像与雷达图。' },
              { n: '02', t: '画像决定目标', d: '每个维度按你的分数换算成「目标张数」，分数越高越难凑。' },
              { n: '03', t: '摸牌 · 归档（碰）', d: '凑齐同维度的目标张数即可公开归档锁定；含刚抽到的牌。' },
              { n: '04', t: '识人 · 食胡', d: '读对手弃牌判断其人格；五维全部凑齐点「胡」获胜。' },
            ].map((s) => (
              <div key={s.n} className="psy-panel psy-etched rounded-[1.2rem] p-4">
                <div className="psy-serif text-xs text-[var(--psy-accent)]">{s.n}</div>
                <div className="psy-serif mt-1 text-base text-[var(--psy-ink)]">{s.t}</div>
                <p className="mt-1.5 text-[13px] leading-6 text-[var(--psy-ink-soft)]">{s.d}</p>
              </div>
            ))}
          </div>
          <p className="text-[13px] leading-6 text-[var(--psy-muted)]">
            两种形态：<strong>单人</strong>（对 3 个 AI 对手，可调难度）与<strong>联机</strong>（创建/加入房间，与真人同桌）。看牌难度分明牌 / 半公开 / 隐藏三档。
          </p>
        </Section>

        {/* Goals */}
        <Section eyebrow="Goals · 目标" title="用一局麻将学会大五人格">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { t: '教学工具', d: '香港理工大学应用社会科学系课程用；把抽象的人格理论变成可玩、可讨论的互动体验。' },
              { t: '目标受众', d: '中文母语的大学生 / 心理学入门学习者；移动端优先，也支持桌面。' },
              { t: '体验基调', d: '学术但不枯燥、有游戏乐趣但不喧闹；温润、可信、带一点仪式感。' },
            ].map((g) => (
              <div key={g.t} className="rounded-[1.2rem] border border-[var(--psy-border)] bg-[var(--psy-card-content)] p-4">
                <div className="psy-serif text-base text-[var(--psy-ink)]">{g.t}</div>
                <p className="mt-1.5 text-[13px] leading-6 text-[var(--psy-ink-soft)]">{g.d}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Color */}
        <Section eyebrow="Color · 配色方案" title="暖奶油 + 金 + 墨">
          <div className="space-y-5">
            <div>
              <p className="mb-2 text-[13px] font-medium text-[var(--psy-ink-soft)]">中性 / 背景 · Neutrals</p>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">{NEUTRALS.map((c) => <Swatch key={c.hex} {...c} />)}</div>
            </div>
            <div>
              <p className="mb-2 text-[13px] font-medium text-[var(--psy-ink-soft)]">文字 · Ink</p>
              <div className="grid grid-cols-3 gap-2.5">{INKS.map((c) => <Swatch key={c.hex} {...c} />)}</div>
            </div>
            <div>
              <p className="mb-2 text-[13px] font-medium text-[var(--psy-ink-soft)]">强调 / 语义 · Accent & Semantic</p>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">{ACCENTS.map((c) => <Swatch key={c.hex} {...c} />)}</div>
            </div>
            <div>
              <p className="mb-2 text-[13px] font-medium text-[var(--psy-ink-soft)]">五维专属色 · Dimension colors（仅用于图表 / 维度标识）</p>
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">{DIMS.map((c) => <Swatch key={c.hex} {...c} />)}</div>
            </div>
          </div>
        </Section>

        {/* Typography + keywords */}
        <Section eyebrow="Type & Tone · 字体与气质" title="干净无衬线 + 温润气质">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="psy-panel psy-etched rounded-[1.2rem] p-5">
              <div className="text-[13px] font-medium text-[var(--psy-ink-soft)]">字体 Typeface</div>
              <div className="psy-serif mt-2 text-3xl text-[var(--psy-ink)]">Noto Sans SC</div>
              <p className="mt-2 text-[13px] leading-6 text-[var(--psy-muted)]">全站统一无衬线（正文 / 标题 / 卡面）。logo wordmark 建议沿用同一套干净字体，<strong>不要用毛笔手写体</strong>——与产品气质冲突。</p>
            </div>
            <div className="psy-panel psy-etched rounded-[1.2rem] p-5">
              <div className="text-[13px] font-medium text-[var(--psy-ink-soft)]">气质关键词 Keywords</div>
              <div className="mt-3 flex flex-wrap gap-2">
                {['温润 warm', '学术 academic', '克制 restrained', '手感 tactile', '一点仪式感 ritual', '不喧闹 calm'].map((k) => (
                  <span key={k} className="rounded-full border border-[var(--psy-border)] bg-[var(--psy-card-content)] px-3 py-1 text-[12px] text-[var(--psy-ink-soft)]">{k}</span>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/* Logo direction — Mahjong */}
        <Section eyebrow="Logo · 方向 A" title="麻将风（老板偏向）">
          <p className="text-[13px] leading-6 text-[var(--psy-muted)]">以麻将牌为主体，牌面嵌入心理符号（心 / 五维雷达 / 罗盘）。稳、直观、和「麻将」名字直接呼应。</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <LogoCard label="A1 · 心牌" note="麻将牌面嵌「心」——心理 × 麻将最直接的组合">
              <TileBase>
                <text x="60" y="74" textAnchor="middle" fontSize="40" fontWeight="700" fill={GOLD_STRONG}>心</text>
              </TileBase>
            </LogoCard>
            <LogoCard label="A2 · 五维牌" note="牌面是大五雷达——点出「人格」内核">
              <TileBase>
                <RadarGlyph cx={60} cy={62} r={20} />
              </TileBase>
            </LogoCard>
            <LogoCard label="A3 · 对牌" note="两张叠放的牌（成局/胡）+ 心，暗示对战">
              <>
                <TileBase rot={-9} />
                <TileBase>
                  <text x="60" y="74" textAnchor="middle" fontSize="38" fontWeight="700" fill={GOLD_STRONG}>心</text>
                </TileBase>
              </>
            </LogoCard>
          </div>
        </Section>

        {/* Logo direction — Tarot */}
        <Section eyebrow="Logo · 方向 B" title="塔罗风（卡面延伸）">
          <p className="text-[13px] leading-6 text-[var(--psy-muted)]">以游戏内塔罗风卡框为主体（拱顶 + 金线），嵌入罗盘 / 心 / 雷达。更「读心 / 揭示」的意象，和游戏卡面强一致。</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <LogoCard label="B1 · 罗盘卡" note="拱顶卡框 + 罗盘——识人、指向、揭示">
              <TarotBase>
                <CompassGlyph cx={60} cy={60} />
              </TarotBase>
            </LogoCard>
            <LogoCard label="B2 · 心卡" note="卡框 + 心 + 放射，读心意象">
              <TarotBase>
                <text x="60" y="72" textAnchor="middle" fontSize="34" fontWeight="700" fill={GOLD_STRONG}>心</text>
                {[-40, 0, 40].map((a) => {
                  const rad = ((a - 90) * Math.PI) / 180;
                  return <circle key={a} cx={60 + 30 * Math.cos(rad)} cy={58 + 30 * Math.sin(rad)} r="1.6" fill={GOLD} />;
                })}
              </TarotBase>
            </LogoCard>
            <LogoCard label="B3 · 雷达卡" note="卡框 + 五维雷达，画像即牌面">
              <TarotBase>
                <RadarGlyph cx={60} cy={64} r={19} />
              </TarotBase>
            </LogoCard>
          </div>
        </Section>

        {/* Wordmark */}
        <Section eyebrow="Lockup · 组合" title="图标 + 字标">
          <div className="psy-panel psy-etched flex flex-col items-center gap-4 rounded-[1.4rem] p-6 sm:flex-row sm:justify-center sm:gap-6">
            <svg viewBox="0 0 120 120" className="h-20 w-20 shrink-0">
              <TileBase>
                <text x="60" y="74" textAnchor="middle" fontSize="40" fontWeight="700" fill={GOLD_STRONG}>心</text>
              </TileBase>
            </svg>
            <div className="text-center sm:text-left">
              <div className="psy-serif text-2xl font-bold tracking-wide text-[var(--psy-ink)]">PERSONALITIES</div>
              <div className="psy-serif text-2xl font-bold tracking-[0.12em]" style={{ color: GOLD_STRONG }}>MAHJONG · 人格麻將</div>
            </div>
          </div>
          <p className="text-[13px] leading-6 text-[var(--psy-muted)]">
            落地建议：网页顶栏 / favicon 用<strong>纯图标</strong>（避免与页面标题文字重复）；完整「图标+字标」留给启动页、宣传图、打印物。字标用站内干净字体，别用毛笔体；配色只用奶油 / 金 / 墨，避免藏青+砖红那种与现有系统冲突的组合。
          </p>
        </Section>

        {/* Do / Don't */}
        <Section eyebrow="Guidelines · 规范" title="Do / Don't">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.2rem] border border-[rgba(111,143,85,0.35)] bg-[rgba(111,143,85,0.08)] p-4">
              <div className="psy-serif text-sm font-semibold text-[var(--psy-success)]">✓ Do</div>
              <ul className="mt-2 space-y-1.5 text-[13px] leading-6 text-[var(--psy-ink-soft)]">
                <li>· 只用奶油 / 金 / 墨的核心配色</li>
                <li>· 图标以麻将牌或塔罗卡框为主体</li>
                <li>· 嵌入心理符号：心 / 五维雷达 / 罗盘</li>
                <li>· wordmark 用干净无衬线字体</li>
                <li>· 顶栏 / favicon 用纯图标版</li>
              </ul>
            </div>
            <div className="rounded-[1.2rem] border border-[rgba(201,96,63,0.35)] bg-[rgba(201,96,63,0.08)] p-4">
              <div className="psy-serif text-sm font-semibold text-[var(--psy-danger)]">✕ Don't</div>
              <ul className="mt-2 space-y-1.5 text-[13px] leading-6 text-[var(--psy-ink-soft)]">
                <li>· 用毛笔 / 书法手写体做 MAHJONG</li>
                <li>· 用藏青 + 砖红等高饱和主色</li>
                <li>· 图标里再放一遍品牌全称文字</li>
                <li>· 过密的圆形徽章（缩到 favicon 会糊）</li>
                <li>· 五维专属色当品牌主色（只用于图表）</li>
              </ul>
            </div>
          </div>
        </Section>

        <p className="border-t border-[var(--psy-border)] pt-6 text-center text-[12px] text-[var(--psy-muted)]">
          内部品牌参考页 · 非最终稿 · 欢迎在此配色 / 气质框架下发散更多方案
        </p>
      </div>
    </div>
  );
}
