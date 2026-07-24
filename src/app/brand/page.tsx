import type { ReactNode } from 'react';
import Image from 'next/image';

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
const BRAND_LOGO_RULES = [
  { name: '唯一主 Logo', use: '品牌识别', desc: '只指定一个：Psi Tile。它代表整款产品，不按页面或功能变化。' },
  { name: '默认带底板', use: '层次规范', desc: '主 Logo 不建议裸放在米白网页上；默认使用暖牌底板，保证牌框、留白和页面背景分开。' },
  { name: 'Logo Lockup', use: '完整品牌露出', desc: '带底板的 Psi Tile + 人格麻將 / Personalities Mahjong 字标，用在首页首屏、页眉、海报和课件封面。' },
  { name: 'Logo Mark', use: '小尺寸品牌露出', desc: 'favicon、导航栏、App icon 优先用带底板版本；裸 PNG 只作为源标记和特殊场景备用。' },
  { name: '备选不混用', use: '品牌一致性', desc: '其他图形可以作为 Logo 备选参与评审，但一旦选定主 Logo，网页各处只使用同一个主 Logo。' },
];
const LOGO_BACKPLATES = [
  { id: 'warm-tile', src: '/brand/generated/logo-backplates/logo-backplate-warm-tile.png', title: '推荐：暖牌底板', desc: '最适合当前网页。暖砂底 + 象牙内层 + 金边，让 Logo 从米白背景里浮出来。' },
  { id: 'ivory-card', src: '/brand/generated/logo-backplates/logo-backplate-ivory-card.png', title: '轻量：象牙卡底', desc: '更克制，适合导航栏、规则页角标和正文附近的小尺寸露出。' },
  { id: 'terracotta', src: '/brand/generated/logo-backplates/logo-backplate-terracotta.png', title: '强调：陶土底', desc: '更醒目，适合活动入口、分享图或需要强品牌识别的按钮区域。' },
];
const MAIN_LOGO_ASSETS = [
  { id: 'logo-backplate-warm-tile', src: '/brand/generated/logo-backplates/logo-backplate-warm-tile.png', label: '默认网页 Logo' },
  { id: 'logo-backplate-ivory-card', src: '/brand/generated/logo-backplates/logo-backplate-ivory-card.png', label: '小尺寸 / 导航轻量版' },
  { id: 'logo-backplate-terracotta', src: '/brand/generated/logo-backplates/logo-backplate-terracotta.png', label: '强调场景版' },
  { id: 'alt-directions-A', src: '/brand/generated/marks-tight/alt-directions-A.png', label: '裸标记源文件' },
];
const LOGO_ALTERNATIVES = [
  { id: 'alt-directions-A', src: '/brand/generated/marks-tight/alt-directions-A.png', title: 'Original A', note: '早期方向候选，保留用于横向比较主 Logo 是否需要牌框、轨道或抽象化。' },
  { id: 'alt-directions-B', src: '/brand/generated/marks-tight/alt-directions-B.png', title: 'Original B', note: '早期方向候选，保留用于横向比较主 Logo 是否需要牌框、轨道或抽象化。' },
  { id: 'alt-directions-C', src: '/brand/generated/marks-tight/alt-directions-C.png', title: 'Original C', note: '早期方向候选，保留用于横向比较主 Logo 是否需要牌框、轨道或抽象化。' },
  { id: 'alt-directions-D', src: '/brand/generated/marks-tight/alt-directions-D.png', title: 'Original D', note: '早期方向候选，保留用于横向比较主 Logo 是否需要牌框、轨道或抽象化。' },
  { id: 'alt-directions-E', src: '/brand/generated/marks-tight/alt-directions-E.png', title: 'Original E', note: '早期方向候选，保留用于横向比较主 Logo 是否需要牌框、轨道或抽象化。' },
  { id: 'alt-directions-F', src: '/brand/generated/marks-tight/alt-directions-F.png', title: 'Original F', note: '早期方向候选，保留用于横向比较主 Logo 是否需要牌框、轨道或抽象化。' },
  { id: 'alt-directions-G', src: '/brand/generated/marks-tight/alt-directions-G.png', title: 'Original G', note: '早期方向候选，保留用于横向比较主 Logo 是否需要牌框、轨道或抽象化。' },
  { id: 'alt-directions-H', src: '/brand/generated/marks-tight/alt-directions-H.png', title: 'Original H', note: '早期方向候选，保留用于横向比较主 Logo 是否需要牌框、轨道或抽象化。' },
  { id: 'alt-directions-I', src: '/brand/generated/marks-tight/alt-directions-I.png', title: 'Original I', note: '早期方向候选，保留用于横向比较主 Logo 是否需要牌框、轨道或抽象化。' },
  { id: 'psi-vase-A', src: '/brand/generated/marks-tight/psi-vase-A.png', title: 'Psi Vase A', note: '鲁宾花瓶 / Ψ 方向候选，概念感强，但需评估小尺寸识别和复杂度。' },
  { id: 'psi-vase-B', src: '/brand/generated/marks-tight/psi-vase-B.png', title: 'Psi Vase B', note: '鲁宾花瓶 / Ψ 方向候选，概念感强，但需评估小尺寸识别和复杂度。' },
  { id: 'psi-vase-C', src: '/brand/generated/marks-tight/psi-vase-C.png', title: 'Psi Vase C', note: '鲁宾花瓶 / Ψ 方向候选，概念感强，但需评估小尺寸识别和复杂度。' },
  { id: 'psi-vase-D', src: '/brand/generated/marks-tight/psi-vase-D.png', title: 'Psi Vase D', note: '鲁宾花瓶 / Ψ 方向候选，概念感强，但需评估小尺寸识别和复杂度。' },
  { id: 'psi-vase-E', src: '/brand/generated/marks-tight/psi-vase-E.png', title: 'Psi Vase E', note: '鲁宾花瓶 / Ψ 方向候选，概念感强，但需评估小尺寸识别和复杂度。' },
  { id: 'psi-vase-F', src: '/brand/generated/marks-tight/psi-vase-F.png', title: 'Psi Vase F', note: '鲁宾花瓶 / Ψ 方向候选，概念感强，但需评估小尺寸识别和复杂度。' },
  { id: 'open-directions-H1', src: '/brand/generated/marks-tight/open-directions-H1.png', title: 'Open H1', note: '开放式 Ψ + 轻圆弧。我的偏好之一：不靠硬牌框，品牌感更强。' },
  { id: 'open-directions-H2', src: '/brand/generated/marks-tight/open-directions-H2.png', title: 'Open H2', note: '软徽章 + 双侧脸。比硬框更温和，但边缘仍略复杂。' },
  { id: 'open-directions-H3', src: '/brand/generated/marks-tight/open-directions-H3.png', title: 'Open H3', note: '人格点阵 + Ψ。学术感强，但可能偏测评工具。' },
  { id: 'open-directions-H4', src: '/brand/generated/marks-tight/open-directions-H4.png', title: 'Open H4', note: '软四叶徽章。比麻将牌框更亲和，可继续简化。' },
  { id: 'open-directions-H5', src: '/brand/generated/marks-tight/open-directions-H5.png', title: 'Open H5', note: 'PM 字母 + Ψ。更像真实品牌 monogram，但麻将感较弱。' },
  { id: 'open-directions-H6', src: '/brand/generated/marks-tight/open-directions-H6.png', title: 'Open H6', note: '双人负形 + Ψ。概念完整，适合重点评审。' },
  { id: 'open-directions-H7', src: '/brand/generated/marks-tight/open-directions-H7.png', title: 'Open H7', note: '无限环 + Ψ。最抽象，延展性强，但需要补麻将关联。' },
  { id: 'open-directions-H8', src: '/brand/generated/marks-tight/open-directions-H8.png', title: 'Open H8', note: '折叠卡 + 轨道。游戏感强，仍比硬牌框轻。' },
  { id: 'open-directions-H9', src: '/brand/generated/marks-tight/open-directions-H9.png', title: 'Open H9', note: '人物手牌。叙事强但细节多，不建议最终主 Logo。' },
];
const ROUND_SIX_FOUR_DIRECTIONS = [
  {
    id: 'hive',
    eyebrow: 'Direction 01 · Hive Negative',
    title: '蜂巢负形',
    note: '不把蜂巢当背景图案：Ψ 从拼合关系中出现。九张分别拉开色彩、聚合方式与外轮廓。',
    variants: ['暖金六片', '陶土三片', '绿金环簇', '线框蜂群', '多彩散簇', '不对称大块', '横向牌阵', '嵌套六角窗', '三片极简'],
  },
  {
    id: 'polyhedron',
    eyebrow: 'Direction 02 · Polyhedron Cutout',
    title: '多面体切面',
    note: '同一“多面人格”母题分别展开成实面、线框、折页、层叠与断面；不再只是同一颗五边形。',
    variants: ['多色切面', '线框金面', '菱形折页', '陶土棱柱', '层叠面板', '线框晶体', '风筝断面', '三块拼面', '双半极简'],
  },
  {
    id: 'orbit',
    eyebrow: 'Direction 03 · Orbit Mark',
    title: '轨道标记',
    note: '01 保留你点名的母版：暖金外轨、柔绿内轨、陶土/柔绿/棕色节点。其余八张从轨迹、节点和留白真正展开。',
    variants: ['原始双轨母版', '倾斜双轨', '金色大月弧', '牌片断轨', '蓝金穿越环', '对话双弧', '紧凑节点花', '角落大弧', '单笔极简'],
  },
  {
    id: 'growth',
    eyebrow: 'Direction 04 · Growing Psi',
    title: '生长 Ψ',
    note: '让 Ψ 自己成为根、枝、藤或叶片的骨架；九张在生命力与抽象程度间切换，不锁死节点数。',
    variants: ['种子与根', '单枝新芽', '根系延展', '三叶 Ψ', '陶土珊瑚枝', '藤蔓穿行', '竖向芽序', '叶片负形', '极简新芽'],
  },
] as const;
const HIVE_REFINEMENTS = [
  {
    id: 'core',
    src: '/brand/generated/round6-four-directions/hive/refinements/hive-06-refined-core.png',
    title: 'A · 网站主调',
    note: '暖金主块 + 墨色锚点 + 柔绿/陶土点缀，直接取自首页的按钮、正文与状态色；识别最强，也最像现有产品。',
  },
  {
    id: 'paper',
    src: '/brand/generated/round6-four-directions/hive/refinements/hive-06-refined-paper.png',
    title: 'B · 内容卡调',
    note: '暖砂、深金、象牙与柔绿降低饱和度，贴近首页四张象牙内容卡；适合想让 Logo 更安静、学术感更强的方向。',
  },
  {
    id: 'warm',
    src: '/brand/generated/round6-four-directions/hive/refinements/hive-06-refined-warm.png',
    title: 'C · 暖色强调',
    note: '暖金与陶土拉开主次，墨色只保留为压舱；更适合活动入口、分享图或需要更高情绪能量的场景。',
  },
] as const;
const MAIN_LOGO_PLACEMENTS = [
  { name: 'Homepage 首屏', use: '完整品牌露出', desc: '使用暖牌底板 Logo + 人格麻將 / Personalities Mahjong 字标，是最完整的品牌出现方式。' },
  { name: 'Top Navigation', use: '全站导航', desc: '使用轻量象牙底板 Logo，放在品牌名左侧；所有一级页面保持一致。' },
  { name: 'favicon / Browser tab', use: '浏览器标签', desc: '使用轻量底板版本，避免透明裸标记在浅色浏览器背景上没有边界。' },
  { name: 'PWA / App icon', use: '安装图标', desc: '使用暖牌底板版本导出 192px / 512px，保留圆角和阴影层次。' },
  { name: 'Share / OG image', use: '分享预览图', desc: '使用暖牌底板 Logo + 标题与一句说明，确保截图和社交预览里品牌明确。' },
  { name: 'Slides / Poster', use: '课件与海报', desc: '使用完整锁版；空间不足时只放带底板 Logo，不使用其他图形替代。' },
];

function Swatch({ name, hex }: { name: string; hex: string }) {
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

function CollapsibleSection({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <details className="group rounded-[1.35rem] border border-[var(--psy-border)] bg-[rgba(253,249,240,0.5)] p-4">
      <summary className="cursor-pointer list-none">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="psy-eyebrow text-[10px]">{eyebrow}</p>
            <h2 className="psy-serif text-2xl text-[var(--psy-ink)] sm:text-3xl">{title}</h2>
          </div>
          <span className="rounded-full border border-[var(--psy-border)] bg-[var(--psy-card-content)] px-3 py-1 text-[12px] text-[var(--psy-muted)]">
            展开
          </span>
        </div>
      </summary>
      <div className="mt-4 space-y-4">{children}</div>
    </details>
  );
}

/* ── Logo 基元 ── */
const INK = '#3a3020';
const NAVY = '#16324a';
const BRAND_RED = '#a93a2f';
const GOLD = '#c39a52';
const GOLD_STRONG = '#9a7448';
const CREAM = '#fdf8f1';
const DIM_COLORS = ['#c084fc', '#60a5fa', '#facc15', '#4ade80', '#f87171'] as const;
const SAGE = '#6f8f55';
const SKY = '#60a5fa';
const VIOLET = '#a78bfa';

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

function HeartMindGlyph({ cx = 60, cy = 61 }: { cx?: number; cy?: number }) {
  return (
    <g>
      <text x={cx} y={cy + 13} textAnchor="middle" fontSize="35" fontWeight="760" fill={GOLD_STRONG}>心</text>
      {[-90, -18, 54, 126, 198].map((a, i) => {
        const rad = (a * Math.PI) / 180;
        return <circle key={i} cx={cx + 29 * Math.cos(rad)} cy={cy + 29 * Math.sin(rad)} r="2.2" fill={GOLD} opacity="0.86" />;
      })}
      <circle cx={cx} cy={cy} r="30" fill="none" stroke={GOLD} strokeWidth="1.2" opacity="0.35" />
    </g>
  );
}

function ColorHeartMindGlyph({ cx = 60, cy = 61 }: { cx?: number; cy?: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r="31" fill="rgba(195,154,82,0.08)" stroke={GOLD} strokeWidth="1.1" opacity="0.8" />
      {DIM_COLORS.map((color, i) => {
        const rad = ((-90 + i * 72) * Math.PI) / 180;
        return (
          <g key={color}>
            <line x1={cx} y1={cy} x2={cx + 30 * Math.cos(rad)} y2={cy + 30 * Math.sin(rad)} stroke={color} strokeWidth="1.2" opacity="0.48" />
            <circle cx={cx + 30 * Math.cos(rad)} cy={cy + 30 * Math.sin(rad)} r="2.8" fill={color} />
          </g>
        );
      })}
      <text x={cx} y={cy + 13} textAnchor="middle" fontSize="34" fontWeight="780" fill={INK}>心</text>
    </g>
  );
}

function ColorRadarGlyph({ cx = 60, cy = 62, r = 22 }: { cx?: number; cy?: number; r?: number }) {
  const ring = DIM_COLORS.map((color, i) => {
    const a1 = (-90 + i * 72) * (Math.PI / 180);
    const a2 = (-90 + (i + 1) * 72) * (Math.PI / 180);
    return (
      <path
        key={color}
        d={`M${cx} ${cy} L${(cx + r * Math.cos(a1)).toFixed(1)} ${(cy + r * Math.sin(a1)).toFixed(1)} A${r} ${r} 0 0 1 ${(cx + r * Math.cos(a2)).toFixed(1)} ${(cy + r * Math.sin(a2)).toFixed(1)} Z`}
        fill={color}
        opacity="0.2"
      />
    );
  });
  return (
    <g>
      {ring}
      <RadarGlyph cx={cx} cy={cy} r={r * 0.76} />
    </g>
  );
}

function RadarCompassGlyph({ cx = 60, cy = 60 }: { cx?: number; cy?: number }) {
  return (
    <g>
      <CompassGlyph cx={cx} cy={cy} />
      <circle cx={cx} cy={cy} r="25" fill="none" stroke={GOLD} strokeWidth="1.2" opacity="0.46" />
      <RadarGlyph cx={cx} cy={cy} r={15} />
    </g>
  );
}

function BloomGlyph({ cx = 60, cy = 60 }: { cx?: number; cy?: number }) {
  return (
    <g>
      {DIM_COLORS.map((color, i) => {
        const rad = ((-90 + i * 72) * Math.PI) / 180;
        return (
          <ellipse
            key={color}
            cx={cx + 12 * Math.cos(rad)}
            cy={cy + 12 * Math.sin(rad)}
            rx="10"
            ry="20"
            fill={color}
            opacity="0.72"
            transform={`rotate(${-90 + i * 72} ${cx + 12 * Math.cos(rad)} ${cy + 12 * Math.sin(rad)})`}
          />
        );
      })}
      <circle cx={cx} cy={cy} r="12" fill={CREAM} stroke={GOLD_STRONG} strokeWidth="2" />
      <text x={cx} y={cy + 7} textAnchor="middle" fontSize="18" fontWeight="760" fill={INK}>心</text>
    </g>
  );
}

function ColorSealGlyph({ cx = 60, cy = 60 }: { cx?: number; cy?: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r="39" fill="#fff8eb" stroke={INK} strokeWidth="3" />
      <circle cx={cx} cy={cy} r="32" fill="none" stroke={GOLD} strokeWidth="1.5" opacity="0.8" />
      {DIM_COLORS.map((color, i) => {
        const rad = ((-90 + i * 72) * Math.PI) / 180;
        return <circle key={color} cx={cx + 32 * Math.cos(rad)} cy={cy + 32 * Math.sin(rad)} r="4" fill={color} stroke={CREAM} strokeWidth="1" />;
      })}
      <text x={cx} y={cy + 9} textAnchor="middle" fontSize="27" fontWeight="780" fill={GOLD_STRONG}>心</text>
    </g>
  );
}

function FanTilesGlyph() {
  return (
    <g>
      {[-18, 0, 18].map((rot, i) => (
        <g key={rot} transform={`rotate(${rot} 60 70)`}>
          <rect x={42 + i * 3} y="24" width="39" height="62" rx="9" fill={i === 1 ? '#fff8eb' : '#f1e5cb'} stroke={INK} strokeWidth="2.4" />
          <rect x={46 + i * 3} y="29" width="31" height="52" rx="6" fill="none" stroke={DIM_COLORS[i]} strokeWidth="1.4" opacity="0.9" />
        </g>
      ))}
      <text x="60" y="76" textAnchor="middle" fontSize="28" fontWeight="760" fill={GOLD_STRONG}>心</text>
    </g>
  );
}

function GateTileGlyph() {
  return (
    <g>
      <path d="M33 100 V44 Q33 18 60 18 Q87 18 87 44 V100" fill="#fff8eb" stroke={INK} strokeWidth="3.1" />
      <path d="M41 97 V45 Q41 28 60 28 Q79 28 79 45 V97" fill="none" stroke={SAGE} strokeWidth="2" opacity="0.8" />
      <path d="M47 69 C53 57 67 57 73 69 C68 75 52 75 47 69Z" fill={GOLD} opacity="0.48" />
      <RadarGlyph cx={60} cy={59} r={16} />
    </g>
  );
}

function ProfileTileGlyph() {
  return (
    <g>
      <ColorTileBase fill="#fff8eb" rail={SAGE}>
        <path d="M47 73 C48 60 54 52 61 52 C69 52 75 60 76 73" fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
        <circle cx="60" cy="42" r="10" fill="rgba(195,154,82,0.24)" stroke={GOLD_STRONG} strokeWidth="2" />
        {DIM_COLORS.map((color, i) => <circle key={color} cx={43 + i * 8.5} cy="88" r="2.5" fill={color} />)}
      </ColorTileBase>
    </g>
  );
}

function TarotMirrorGlyph() {
  return (
    <TarotBase>
      <path d="M45 64 C45 48 52 38 60 38 C68 38 75 48 75 64 C70 72 50 72 45 64Z" fill="rgba(96,165,250,0.18)" stroke={SKY} strokeWidth="2" />
      <path d="M52 62 C57 58 63 58 68 62" fill="none" stroke={GOLD_STRONG} strokeWidth="2" strokeLinecap="round" />
      <circle cx="60" cy="51" r="4" fill={GOLD_STRONG} />
    </TarotBase>
  );
}

function TarotStudyGlyph() {
  return (
    <TarotBase>
      <path d="M43 44 H77 M43 54 H77 M43 64 H70" stroke={INK} strokeWidth="3" strokeLinecap="round" opacity="0.72" />
      <path d="M47 77 C55 71 65 71 73 77" fill="none" stroke={GOLD} strokeWidth="2.3" strokeLinecap="round" />
      {DIM_COLORS.map((color, i) => <circle key={color} cx={44 + i * 8} cy="86" r="2.4" fill={color} />)}
    </TarotBase>
  );
}

function TarotPortalGlyph() {
  return (
    <TarotBase>
      <path d="M43 80 V54 Q43 37 60 37 Q77 37 77 54 V80" fill="rgba(192,132,252,0.16)" stroke={VIOLET} strokeWidth="2.4" />
      <path d="M52 75 V57 Q52 46 60 46 Q68 46 68 57 V75" fill="none" stroke={GOLD_STRONG} strokeWidth="2" />
      <circle cx="60" cy="62" r="3" fill={INK} />
    </TarotBase>
  );
}

function AbstractOrbitGlyph() {
  return (
    <g>
      <circle cx="60" cy="60" r="34" fill="none" stroke={GOLD} strokeWidth="2" opacity="0.6" />
      <ellipse cx="60" cy="60" rx="42" ry="18" fill="none" stroke={SAGE} strokeWidth="2.8" transform="rotate(-18 60 60)" />
      <ellipse cx="60" cy="60" rx="42" ry="18" fill="none" stroke={VIOLET} strokeWidth="2.2" transform="rotate(54 60 60)" opacity="0.72" />
      {DIM_COLORS.map((color, i) => {
        const rad = ((-90 + i * 72) * Math.PI) / 180;
        return <circle key={color} cx={60 + 34 * Math.cos(rad)} cy={60 + 34 * Math.sin(rad)} r="4.2" fill={color} />;
      })}
      <circle cx="60" cy="60" r="9" fill={CREAM} stroke={INK} strokeWidth="2.4" />
    </g>
  );
}

function AbstractFoldGlyph() {
  return (
    <g>
      <path d="M31 78 C43 38 67 29 90 46 C76 50 68 62 64 91 C54 78 43 74 31 78Z" fill="rgba(96,165,250,0.2)" stroke={SKY} strokeWidth="2.6" />
      <path d="M30 47 C52 32 76 39 91 70 C72 62 55 65 41 84 C42 66 38 55 30 47Z" fill="rgba(195,154,82,0.22)" stroke={GOLD_STRONG} strokeWidth="2.6" />
      <path d="M45 56 C55 51 66 53 75 62" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}

function AbstractWaveGlyph() {
  return (
    <g>
      {[0, 1, 2, 3, 4].map((i) => (
        <path
          key={i}
          d={`M28 ${42 + i * 8} C42 ${25 + i * 7} 60 ${60 + i * 2} 76 ${42 + i * 8} C84 ${34 + i * 5} 91 ${37 + i * 6} 96 ${43 + i * 7}`}
          fill="none"
          stroke={DIM_COLORS[i]}
          strokeWidth={i === 2 ? 4 : 3}
          strokeLinecap="round"
          opacity={i === 2 ? 0.9 : 0.66}
        />
      ))}
      <circle cx="60" cy="60" r="7" fill={INK} />
    </g>
  );
}

function AbstractKnotGlyph() {
  return (
    <g>
      <path d="M34 60 C34 35 57 30 60 52 C63 30 86 35 86 60 C86 85 63 90 60 68 C57 90 34 85 34 60Z" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M38 60 C47 55 52 55 60 60 C68 65 73 65 82 60" fill="none" stroke={GOLD} strokeWidth="3" strokeLinecap="round" />
      <circle cx="60" cy="60" r="5" fill={DIM_COLORS[4]} />
    </g>
  );
}

function AbstractFivefoldGlyph() {
  const pts = DIM_COLORS.map((color, i) => {
    const rad = ((-90 + i * 72) * Math.PI) / 180;
    return { color, x: 60 + 30 * Math.cos(rad), y: 60 + 30 * Math.sin(rad) };
  });
  return (
    <g>
      <polygon points={pts.map((p) => `${p.x},${p.y}`).join(' ')} fill="rgba(253,248,241,0.78)" stroke={INK} strokeWidth="2.8" />
      <polygon points={pts.map((p, i) => `${60 + (0.46 + i * 0.07) * (p.x - 60)},${60 + (0.46 + i * 0.07) * (p.y - 60)}`).join(' ')} fill={GOLD} fillOpacity="0.22" stroke={GOLD_STRONG} strokeWidth="2" />
      {pts.map((p) => <circle key={p.color} cx={p.x} cy={p.y} r="5" fill={p.color} stroke={CREAM} strokeWidth="1.4" />)}
      <circle cx="60" cy="60" r="5" fill={INK} />
    </g>
  );
}

function AbstractMonogramGlyph() {
  return (
    <g>
      <path d="M30 87 V34 H45 C58 34 66 42 66 55 C66 68 58 76 45 76 H42" fill="none" stroke={INK} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M57 87 V34 L73 63 L90 34 V87" fill="none" stroke={GOLD_STRONG} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <g transform="translate(37 96)">
        {DIM_COLORS.map((color, i) => <circle key={color} cx={i * 11.5} cy="0" r="3" fill={color} />)}
      </g>
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

function ColorTileBase({ children, x = 30, rot = 0, fill = '#fff8eb', rail = GOLD, stroke = INK }: { children?: ReactNode; x?: number; rot?: number; fill?: string; rail?: string; stroke?: string }) {
  return (
    <g transform={rot ? `rotate(${rot} 60 60)` : undefined}>
      <rect x={x} y="12" width="60" height="96" rx="13" fill={fill} stroke={stroke} strokeWidth="3.2" />
      <rect x={x + 5.5} y="17.5" width="49" height="85" rx="8.5" fill="none" stroke={rail} strokeWidth="1.6" opacity="0.82" />
      <path d={`M${x + 9} 24 H${x + 51}`} stroke={rail} strokeWidth="2" opacity="0.38" />
      {children}
    </g>
  );
}

function SplitColorTile({ children }: { children?: ReactNode }) {
  return (
    <g>
      <clipPath id="splitTileClip"><rect x="30" y="12" width="60" height="96" rx="13" /></clipPath>
      <g clipPath="url(#splitTileClip)">
        <rect x="30" y="12" width="60" height="96" fill="#fff8eb" />
        <rect x="30" y="12" width="30" height="96" fill="rgba(111,143,85,0.18)" />
        <rect x="60" y="12" width="30" height="96" fill="rgba(201,96,63,0.14)" />
      </g>
      <rect x="30" y="12" width="60" height="96" rx="13" fill="none" stroke={INK} strokeWidth="3.2" />
      <rect x="36" y="18" width="48" height="84" rx="8" fill="none" stroke={GOLD} strokeWidth="1.5" opacity="0.72" />
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

function BrandLockupCard({ label, note, children }: { label: string; note: string; children: ReactNode }) {
  return (
    <div className="psy-panel psy-etched flex flex-col gap-3 rounded-[1.3rem] p-4 text-center">
      <div className="flex h-56 w-full items-center justify-center rounded-[1rem] bg-[var(--psy-card-content)] px-3">
        <svg viewBox="0 0 360 220" className="h-full w-full max-w-[360px]">{children}</svg>
      </div>
      <div>
        <div className="psy-serif text-sm font-semibold text-[var(--psy-ink)]">{label}</div>
        <div className="mt-0.5 text-[11px] leading-snug text-[var(--psy-muted)]">{note}</div>
      </div>
    </div>
  );
}

function MiniCardsMark({ x = 146, y = 14, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <g transform="rotate(-10 34 42)">
        <rect x="8" y="4" width="44" height="66" rx="8" fill="#fff8eb" stroke={NAVY} strokeWidth="4" />
        <rect x="13" y="10" width="34" height="54" rx="5" fill="none" stroke={GOLD} strokeWidth="1.7" />
        <CompassGlyph cx={30} cy={38} />
      </g>
      <g transform="rotate(8 58 46)">
        <rect x="45" y="10" width="44" height="66" rx="8" fill="#fff8eb" stroke={NAVY} strokeWidth="4" />
        <rect x="50" y="16" width="34" height="54" rx="5" fill="none" stroke={GOLD} strokeWidth="1.7" />
        <path d="M62 43 C51 32 58 22 68 31 C78 22 85 32 74 43 L68 49Z" fill="none" stroke={GOLD_STRONG} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </g>
  );
}

function SwooshCardMark({ x = 142, y = 12, scale = 1 }: { x?: number; y?: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <g transform="rotate(-8 48 54)">
        <rect x="22" y="8" width="58" height="82" rx="12" fill="#fff8eb" stroke={NAVY} strokeWidth="5" />
        <rect x="28" y="15" width="46" height="68" rx="8" fill="none" stroke={GOLD} strokeWidth="2" />
        <path d="M34 63 C43 37 62 31 75 38" fill="none" stroke={GOLD} strokeWidth="6" strokeLinecap="round" />
        <path d="M35 72 C49 45 65 46 75 62" fill="none" stroke={NAVY} strokeWidth="5" strokeLinecap="round" />
        <path d="M47 56 C53 43 65 43 70 56 C65 65 52 65 47 56Z" fill="rgba(195,154,82,0.18)" />
      </g>
    </g>
  );
}

function Wordmark({ x = 180, y = 132, align = 'middle', compact = false }: { x?: number; y?: number; align?: 'start' | 'middle'; compact?: boolean }) {
  return (
    <g>
      <text x={x} y={y} textAnchor={align} fontFamily="Georgia, 'Times New Roman', serif" fontSize={compact ? 23 : 34} fontWeight="800" fill={NAVY}>PERSONALITIES</text>
      <text x={x} y={y + (compact ? 32 : 45)} textAnchor={align} fontFamily="Georgia, 'Times New Roman', serif" fontSize={compact ? 34 : 48} fontWeight="900" fill={BRAND_RED}>MAHJONG</text>
    </g>
  );
}

function BrushWordmark({ x = 180, y = 128, align = 'middle' }: { x?: number; y?: number; align?: 'start' | 'middle' }) {
  return (
    <g>
      <text x={x} y={y} textAnchor={align} fontFamily="Georgia, 'Times New Roman', serif" fontSize="33" fontWeight="800" fill={NAVY}>PERSONALITIES</text>
      <text x={x} y={y + 47} textAnchor={align} fontFamily="Trebuchet MS, Arial, sans-serif" fontSize="50" fontWeight="900" fill={BRAND_RED}>MAHJONG</text>
      <path d={`M${align === 'middle' ? x - 82 : x} ${y + 54} C${align === 'middle' ? x - 30 : x + 52} ${y + 67} ${align === 'middle' ? x + 36 : x + 116} ${y + 67} ${align === 'middle' ? x + 91 : x + 183} ${y + 52}`} fill="none" stroke={BRAND_RED} strokeWidth="3" strokeLinecap="round" opacity="0.55" />
    </g>
  );
}

function GeminiSealLockup() {
  return (
    <g>
      <text x="180" y="30" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="18" fontWeight="800" fill={NAVY}>PERSONALITIES</text>
      <circle cx="180" cy="100" r="58" fill="#fff8eb" stroke={NAVY} strokeWidth="5" />
      <circle cx="180" cy="100" r="47" fill="none" stroke={GOLD} strokeWidth="2" opacity="0.8" />
      <path d="M136 101 C149 78 170 70 200 75 C219 79 232 91 238 111" fill="none" stroke="rgba(195,154,82,0.28)" strokeWidth="8" strokeLinecap="round" />
      <MiniCardsMark x={148} y={70} scale={0.55} />
      <text x="180" y="190" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="26" fontWeight="900" fill={BRAND_RED}>MAHJONG</text>
      <path d="M96 35 H133 M227 35 H264 M92 181 H129 M231 181 H268" stroke={GOLD} strokeWidth="2" strokeLinecap="round" opacity="0.55" />
    </g>
  );
}

function AnalysisCard({ title, tone, children }: { title: string; tone: 'good' | 'risk' | 'pick'; children: ReactNode }) {
  const toneClass = {
    good: 'border-[rgba(111,143,85,0.35)] bg-[rgba(111,143,85,0.08)]',
    risk: 'border-[rgba(201,96,63,0.32)] bg-[rgba(201,96,63,0.07)]',
    pick: 'border-[rgba(195,154,82,0.4)] bg-[rgba(195,154,82,0.1)]',
  }[tone];
  return (
    <div className={`rounded-[1.2rem] border p-4 ${toneClass}`}>
      <div className="psy-serif text-base font-semibold text-[var(--psy-ink)]">{title}</div>
      <div className="mt-2 text-[13px] leading-6 text-[var(--psy-ink-soft)]">{children}</div>
    </div>
  );
}

function StrategyCard({ title, eyebrow, children }: { title: string; eyebrow: string; children: ReactNode }) {
  return (
    <div className="rounded-[1.2rem] border border-[var(--psy-border)] bg-[var(--psy-card-content)] p-4">
      <div className="psy-eyebrow text-[9px]">{eyebrow}</div>
      <div className="psy-serif mt-1 text-base font-semibold text-[var(--psy-ink)]">{title}</div>
      <div className="mt-2 text-[13px] leading-6 text-[var(--psy-ink-soft)]">{children}</div>
    </div>
  );
}

function LogoProposalCard({ label, title, note, children }: { label: string; title: string; note: string; children: ReactNode }) {
  return (
    <div className="psy-panel flex flex-col gap-3 rounded-[1.25rem] p-4">
      <div className="flex h-48 items-center justify-center rounded-[1rem] bg-[var(--psy-card-content)]">
        <div className="h-40 w-40">{children}</div>
      </div>
      <div>
        <div className="psy-eyebrow text-[9px]">{label}</div>
        <div className="psy-serif mt-1 text-base font-semibold text-[var(--psy-ink)]">{title}</div>
        <p className="mt-1 text-[12px] leading-5 text-[var(--psy-muted)]">{note}</p>
      </div>
    </div>
  );
}

function LogoPng({ src, alt, className = 'h-full w-full' }: { src: string; alt: string; className?: string }) {
  return <Image src={src} alt={alt} width={640} height={640} className={`${className} object-contain`} sizes="(max-width: 768px) 160px, 240px" />;
}

function UsageMockup({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <div className="rounded-[1.2rem] border border-[var(--psy-border)] bg-[var(--psy-card-content)] p-4">
      <div className="min-h-32 rounded-[0.9rem] border border-[rgba(150,118,78,0.18)] bg-[var(--psy-surface)] p-4">
        {children}
      </div>
      <div className="psy-serif mt-3 text-sm font-semibold text-[var(--psy-ink)]">{title}</div>
      <p className="mt-1 text-[12px] leading-5 text-[var(--psy-muted)]">{note}</p>
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
            这份文档现在只整理主 Logo 的使用方式：<strong className="text-[var(--psy-ink)]">Logo 只有一个</strong>，负责整款产品的品牌识别；其他图形可以作为 Logo 备选参与评审，但不会被描述成某个页面或功能的小 icon。
          </p>
        </header>

        {/* Final logo */}
        <Section eyebrow="Brand Logo · 唯一主标识" title="主 Logo 只有一个：Psi Tile">
          <div className="rounded-[1.35rem] border border-[rgba(195,154,82,0.38)] bg-[rgba(195,154,82,0.08)] p-5">
            <div className="flex flex-col gap-5 md:flex-row md:items-center">
              <div className="mx-auto h-40 w-40 shrink-0 md:mx-0">
                <LogoPng src="/brand/generated/logo-backplates/logo-backplate-warm-tile.png" alt="Personalities Mahjong main logo with warm tile backplate" />
              </div>
              <div>
                <div className="psy-serif text-lg font-semibold text-[var(--psy-ink)]">确定主线：Psi Tile 是主 Logo，但默认要带暖色底板</div>
                <p className="mt-2 text-[14px] leading-7 text-[var(--psy-ink-soft)]">
                  Logo 在这里指品牌主标识，不是每个页面的小图。当前建议只选 <strong className="text-[var(--psy-ink)]">alt-directions-A</strong> 作为唯一主 Logo：它保留 Ψ、麻将牌框和暖金/陶土红配色，能代表「心理学 × 麻将」这个产品本体。
                </p>
                <p className="mt-2 text-[14px] leading-7 text-[var(--psy-ink-soft)]">
                  但它不能直接透明裸放在当前网页的米白背景上；透明版会显得平、没有层次。网页默认使用 <strong className="text-[var(--psy-ink)]">logo-backplate-warm-tile</strong>：暖砂底板 + 象牙内层 + 金边，把主 Logo 托起来。
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {BRAND_LOGO_RULES.map((item) => (
              <StrategyCard key={item.name} eyebrow={item.use} title={item.name}>
                {item.desc}
              </StrategyCard>
            ))}
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            {LOGO_BACKPLATES.map((plate) => (
              <LogoProposalCard key={plate.id} label={plate.id} title={plate.title} note={plate.desc}>
                <LogoPng src={plate.src} alt={`${plate.title} logo backplate`} />
              </LogoProposalCard>
            ))}
          </div>
          <div className="grid gap-3 lg:grid-cols-3">
            <UsageMockup title="网页页眉 Logo" note="主 Logo + 中英文品牌名，所有一级页面保持一致。">
              <div className="flex items-center gap-3 rounded-[0.9rem] border border-[var(--psy-border)] bg-[#fffaf2] px-4 py-3">
                <div className="h-12 w-12 shrink-0">
                  <LogoPng src="/brand/generated/logo-backplates/logo-backplate-ivory-card.png" alt="main logo in navbar with backplate" />
                </div>
                <div>
                  <div className="psy-serif text-lg font-semibold text-[var(--psy-ink)]">人格麻將</div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--psy-muted)]">Personalities Mahjong</div>
                </div>
              </div>
            </UsageMockup>
            <UsageMockup title="favicon / 小尺寸 Logo" note="只用主 Logo 图形，不换成鲁宾花瓶或节点图。">
              <div className="flex items-center gap-3 rounded-[0.75rem] border border-[var(--psy-border)] bg-[#fffaf2] px-3 py-2">
                <div className="h-6 w-6 rounded-[0.45rem] bg-[var(--psy-card-content)] p-0.5">
                  <LogoPng src="/brand/generated/logo-backplates/logo-backplate-ivory-card.png" alt="favicon main logo preview with backplate" />
                </div>
                <div className="min-w-0 flex-1 truncate text-[12px] font-medium text-[var(--psy-ink)]">人格麻將 · Personalities Mahjong</div>
              </div>
            </UsageMockup>
            <UsageMockup title="PWA / App icon" note="可以使用主 Logo 的容器化版本，本质仍是同一个 Logo。">
              <div className="flex items-center justify-center">
                <div className="h-24 w-24">
                  <LogoPng src="/brand/generated/logo-backplates/logo-backplate-warm-tile.png" alt="PWA app icon logo preview with warm backplate" />
                </div>
              </div>
            </UsageMockup>
          </div>
        </Section>

        <Section eyebrow="Round 6 · Four Directions Expanded" title="基于四条母题，展开 36 张真正不同的平面 PNG">
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-[1.25rem] border border-[rgba(195,154,82,0.38)] bg-[rgba(195,154,82,0.08)] p-4">
              <div className="psy-serif text-lg font-semibold text-[var(--psy-ink)]">这一轮在解决什么</div>
              <p className="mt-2 text-[14px] leading-7 text-[var(--psy-ink-soft)]">
                不是替换 36 次中央 Ψ，而是让四条母题分别承担不同的品牌能力：<strong className="text-[var(--psy-ink)]">蜂巢</strong>负责负形与组合感，<strong className="text-[var(--psy-ink)]">多面体</strong>负责切面与变化，<strong className="text-[var(--psy-ink)]">轨道</strong>负责关系与动势，<strong className="text-[var(--psy-ink)]">生长 Ψ</strong>负责人格理解与成长。
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-[rgba(195,154,82,0.38)] bg-[rgba(195,154,82,0.08)] p-4">
              <div className="psy-serif text-lg font-semibold text-[var(--psy-ink)]">当前评审方式</div>
              <p className="mt-2 text-[14px] leading-7 text-[var(--psy-ink-soft)]">
                先选<strong className="text-[var(--psy-ink)]">一个主方向</strong>，再从其余 8 张里选构图。优先比较：缩到 32px 是否仍能读出 Ψ、能否在首页的暖纸底与象牙卡上成立、以及反白到暖金按钮时是否仍有识别力。不要把四个方向混用成四个正式 Logo。
              </p>
            </div>
          </div>

          <div className="rounded-[1.45rem] border border-[var(--psy-border)] bg-[rgba(253,249,240,0.62)] p-4 sm:p-5">
            <div className="max-w-3xl">
              <p className="psy-eyebrow text-[10px]">Surface System · 真实页面底色</p>
              <h3 className="psy-serif mt-1 text-xl font-semibold text-[var(--psy-ink)] sm:text-2xl">负形只发生在首页已经存在的暖金表面</h3>
              <p className="mt-1 text-[13px] leading-6 text-[var(--psy-ink-soft)]">
                首页并没有深色品牌大底。为了不凭空引入另一套视觉，暖纸页底与象牙卡保持正标；只有暖金 CTA / 强调块使用象牙反白的负形标。定稿后，将所选图形本体转为这个反白切口，而不是额外新增一枚“深色版 Logo”。
              </p>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="overflow-hidden rounded-[1rem] border border-[var(--psy-border)]">
                <div className="relative flex h-32 items-center justify-center overflow-hidden bg-[var(--psy-bg)]">
                  <div className="absolute inset-0 opacity-70 [background:repeating-linear-gradient(90deg,transparent_0,transparent_54px,rgba(120,90,50,0.05)_55px,transparent_56px)]" />
                  <span className="relative psy-serif text-6xl text-[var(--psy-ink)]">Ψ</span>
                </div>
                <div className="bg-[var(--psy-surface)] p-3">
                  <div className="text-[12px] font-semibold text-[var(--psy-ink)]">暖纸页底</div>
                  <p className="mt-1 text-[11px] leading-5 text-[var(--psy-ink-soft)]">使用深墨正标；保留页面的竖格和呼吸感，不强造色底。</p>
                </div>
              </div>
              <div className="overflow-hidden rounded-[1rem] border border-[var(--psy-border)] bg-[var(--psy-surface)]">
                <div className="flex h-32 items-center justify-center bg-[var(--psy-card-content)]">
                  <span className="psy-serif text-6xl text-[var(--psy-accent-strong)]">Ψ</span>
                </div>
                <div className="border-t border-[var(--psy-border)] bg-[var(--psy-surface)] p-3">
                  <div className="text-[12px] font-semibold text-[var(--psy-ink)]">象牙内容卡</div>
                  <p className="mt-1 text-[11px] leading-5 text-[var(--psy-ink-soft)]">使用暖金或深墨正标，和首页四张功能卡保持同一层级。</p>
                </div>
              </div>
              <div className="overflow-hidden rounded-[1rem] border border-[rgba(154,116,72,0.42)] bg-[var(--psy-surface)]">
                <div className="flex h-32 items-center justify-center bg-[var(--psy-accent)]">
                  <span className="psy-serif text-6xl text-[#fff9f0]">Ψ</span>
                </div>
                <div className="border-t border-[var(--psy-border)] bg-[var(--psy-surface)] p-3">
                  <div className="text-[12px] font-semibold text-[var(--psy-ink)]">暖金 CTA / 强调块</div>
                  <p className="mt-1 text-[11px] leading-5 text-[var(--psy-ink-soft)]">唯一使用象牙负形的场景；最终选中的母题需在此提供反白切口版。</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.25rem] border border-[rgba(195,154,82,0.38)] bg-[rgba(195,154,82,0.08)] p-4">
            <p className="text-[14px] leading-7 text-[var(--psy-ink-soft)]">
              四条母题固定为<strong className="text-[var(--psy-ink)]">蜂巢负形、多面体切面、轨道标记、生长 Ψ</strong>。每条都从色彩、形状、构图与符号位置拉开，而不是重复「中央 Ψ + 一圈装饰」。
            </p>
          </div>
          <div className="space-y-8">
            {ROUND_SIX_FOUR_DIRECTIONS.map((direction) => (
              <div key={direction.id} className="rounded-[1.45rem] border border-[var(--psy-border)] bg-[rgba(253,249,240,0.6)] p-4 sm:p-5">
                <div className="mb-4 max-w-3xl">
                  <p className="psy-eyebrow text-[10px]">{direction.eyebrow}</p>
                  <h3 className="psy-serif mt-1 text-xl font-semibold text-[var(--psy-ink)] sm:text-2xl">{direction.title}</h3>
                  <p className="mt-1 text-[13px] leading-6 text-[var(--psy-ink-soft)]">{direction.note}</p>
                </div>
                {direction.id === 'hive' && (
                  <div className="mb-5 rounded-[1.2rem] border border-[rgba(195,154,82,0.38)] bg-[rgba(195,154,82,0.08)] p-3 sm:p-4">
                    <div className="mb-3">
                      <p className="psy-eyebrow text-[9px]">Focused Refinement · HIVE 06</p>
                      <h4 className="psy-serif mt-1 text-lg font-semibold text-[var(--psy-ink)]">保留不规则蜂巢重心，修正 Ψ 的中心、圆角与拼缝</h4>
                    </div>
                    <div className="grid gap-3 md:grid-cols-3">
                      {HIVE_REFINEMENTS.map((refinement) => (
                        <LogoProposalCard key={refinement.id} label={`HIVE 06 · ${refinement.id.toUpperCase()}`} title={refinement.title} note={refinement.note}>
                          <LogoPng src={refinement.src} alt={`${refinement.title} refined honeycomb logo`} />
                        </LogoProposalCard>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {direction.variants.map((title, index) => {
                    const no = String(index + 1).padStart(2, '0');
                    const src = `/brand/generated/round6-four-directions/${direction.id}/${direction.id}-${no}.png`;
                    return (
                      <LogoProposalCard key={src} label={`${direction.id.toUpperCase()} ${no}`} title={title} note="平面 PNG 视觉稿；优先看缩小后识别与是否贴合现有暖纸 UI。">
                        <LogoPng src={src} alt={`${direction.title} ${title} logo proposal`} />
                      </LogoProposalCard>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Archived logo alternatives */}
        <CollapsibleSection eyebrow="Archived Alternatives · 早期备选" title="早期 Logo 备选（已折叠）">
          <div className="grid gap-3 lg:grid-cols-2">
            <div className="rounded-[1.25rem] border border-[rgba(195,154,82,0.38)] bg-[rgba(195,154,82,0.08)] p-4">
              <div className="psy-serif text-lg font-semibold text-[var(--psy-ink)]">候选范围</div>
              <p className="mt-2 text-[14px] leading-7 text-[var(--psy-ink-soft)]">
                下面完整放入目前已生成并切好的 24 个方向：早期 A-I、Psi Vase A-F、以及新生成的 Open H1-H9。它们不是功能 icon，也不对应某个页面功能；只用于评审「哪一个方向最适合作为唯一主 Logo」。
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-[rgba(195,154,82,0.38)] bg-[rgba(195,154,82,0.08)] p-4">
              <div className="psy-serif text-lg font-semibold text-[var(--psy-ink)]">我对硬边框的判断</div>
              <p className="mt-2 text-[14px] leading-7 text-[var(--psy-ink-soft)]">
                我不建议最终主 Logo 过度依赖死板的麻将牌粗框。它识别游戏性很快，但容易变成“牌面图标”，品牌感和延展性会弱。更值得继续推进的是 <strong className="text-[var(--psy-ink)]">Open H1 / H6 / H7</strong> 这类开放式 Ψ、负形人物或抽象关系结构；如果需要保留麻将感，可以只用很轻的卡牌暗示，而不是厚重外框。
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {LOGO_ALTERNATIVES.map((logo) => (
              <LogoProposalCard key={logo.id} label={logo.id} title={logo.title} note={logo.note}>
                <LogoPng src={logo.src} alt={`${logo.title} logo alternative`} />
              </LogoProposalCard>
            ))}
          </div>
        </CollapsibleSection>

        {/* Main logo assets */}
        <Section eyebrow="Logo Assets · 主 Logo 文件" title="只展示主 Logo 的几种导出形态">
          <div className="rounded-[1.25rem] border border-[var(--psy-border)] bg-[rgba(253,249,240,0.66)] p-4">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="psy-eyebrow text-[9px]">Main Logo PNG · 主 Logo 资产</div>
                <div className="psy-serif mt-1 text-lg font-semibold text-[var(--psy-ink)]">同一个 Logo，不同底板和尺寸用途</div>
              </div>
              <div className="text-[12px] text-[var(--psy-muted)]">网页默认使用带底板版本</div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {MAIN_LOGO_ASSETS.map((logo) => (
                <div key={logo.id} className="rounded-[0.95rem] border border-[rgba(150,118,78,0.18)] bg-[var(--psy-card-content)] p-3">
                  <div className="flex h-28 items-center justify-center">
                    <div className="h-24 w-24">
                      <LogoPng src={logo.src} alt={`${logo.id} main logo asset`} />
                    </div>
                  </div>
                  <div className="mt-2 truncate text-[11px] font-semibold text-[var(--psy-ink)]">{logo.id}</div>
                  <div className="truncate text-[10px] text-[var(--psy-muted)]">{logo.label}</div>
                </div>
              ))}
            </div>
          </div>
        </Section>

        {/* Real usage examples */}
        <Section eyebrow="Usage · 主 Logo 出现位置" title="只设计主 Logo 在哪里出现">
          <div className="grid gap-3 lg:grid-cols-3">
            <UsageMockup title="Homepage 首屏" note="完整品牌露出：Logo + 中英文品牌名 + 一句说明。">
              <div className="rounded-[1rem] border border-[var(--psy-border)] bg-[#fffaf2] p-5">
                <div className="mx-auto h-20 w-20">
                  <LogoPng src="/brand/generated/logo-backplates/logo-backplate-warm-tile.png" alt="homepage hero logo preview" />
                </div>
                <div className="psy-serif mt-3 text-center text-xl font-semibold text-[var(--psy-ink)]">人格麻將</div>
                <div className="text-center text-[11px] uppercase tracking-[0.18em] text-[var(--psy-muted)]">Personalities Mahjong</div>
              </div>
            </UsageMockup>
            <UsageMockup title="Top Navigation" note="全站页眉：轻量底板 Logo + 品牌名。">
              <div className="flex items-center justify-between rounded-[0.9rem] border border-[var(--psy-border)] bg-[#fffaf2] px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 shrink-0">
                    <LogoPng src="/brand/generated/logo-backplates/logo-backplate-ivory-card.png" alt="navbar main logo preview" />
                  </div>
                  <div>
                    <div className="psy-serif text-base font-semibold text-[var(--psy-ink)]">人格麻將</div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--psy-muted)]">Personalities Mahjong</div>
                  </div>
                </div>
                <span className="rounded-full bg-[var(--psy-accent)] px-3 py-1 text-[11px] font-semibold text-[#fff9f0]">开始</span>
              </div>
            </UsageMockup>
            <UsageMockup title="favicon / Browser tab" note="浏览器小尺寸：只用轻量底板版。">
              <div className="flex items-center gap-3 rounded-[0.75rem] border border-[var(--psy-border)] bg-[#fffaf2] px-3 py-2">
                <div className="h-6 w-6 rounded-[0.45rem] bg-[var(--psy-card-content)] p-0.5">
                  <LogoPng src="/brand/generated/logo-backplates/logo-backplate-ivory-card.png" alt="favicon main logo preview" />
                </div>
                <div className="min-w-0 flex-1 truncate text-[12px] font-medium text-[var(--psy-ink)]">人格麻將 · Personalities Mahjong</div>
              </div>
            </UsageMockup>
            <UsageMockup title="PWA / App icon" note="安装图标：暖牌底板版，导出 192px / 512px。">
              <div className="flex items-center justify-center">
                <div className="h-24 w-24">
                  <LogoPng src="/brand/generated/logo-backplates/logo-backplate-warm-tile.png" alt="PWA app icon main logo preview" />
                </div>
              </div>
            </UsageMockup>
            <UsageMockup title="Share / OG image" note="分享预览：主 Logo + 标题 + 一句产品说明。">
              <div className="rounded-[0.9rem] border border-[var(--psy-border)] bg-[#fffaf2] p-4">
                <div className="flex items-center gap-3">
                  <div className="h-14 w-14 shrink-0">
                    <LogoPng src="/brand/generated/logo-backplates/logo-backplate-warm-tile.png" alt="share preview main logo" />
                  </div>
                  <div>
                    <div className="psy-serif text-lg font-semibold text-[var(--psy-ink)]">人格麻將</div>
                    <div className="text-[11px] text-[var(--psy-muted)]">用一局麻将读懂人格线索</div>
                  </div>
                </div>
              </div>
            </UsageMockup>
            <UsageMockup title="Slides / Poster" note="课件和海报：完整锁版，空间不足时只保留带底板 Logo。">
              <div className="rounded-[0.9rem] border border-[var(--psy-border)] bg-[#fffaf2] p-4">
                <div className="mx-auto h-16 w-16">
                  <LogoPng src="/brand/generated/logo-backplates/logo-backplate-warm-tile.png" alt="slides poster main logo" />
                </div>
                <div className="mt-3 text-center">
                  <div className="psy-serif text-lg font-semibold text-[var(--psy-ink)]">Personalities Mahjong</div>
                  <div>
                    <span className="text-[11px] text-[var(--psy-muted)]">Course material / Poster header</span>
                  </div>
                </div>
              </div>
            </UsageMockup>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MAIN_LOGO_PLACEMENTS.map((item) => (
              <StrategyCard key={item.name} eyebrow={item.use} title={item.name}>
                {item.desc}
              </StrategyCard>
            ))}
          </div>
        </Section>

        {/* Logo strategy */}
        <Section eyebrow="Logo Strategy · 主 Logo 策略" title="主 Logo 只服务品牌识别">
          <div className="space-y-4">
            <div className="rounded-[1.35rem] border border-[rgba(195,154,82,0.38)] bg-[rgba(195,154,82,0.08)] p-5">
              <div className="psy-serif text-lg font-semibold text-[var(--psy-ink)]">设计背景</div>
              <p className="mt-2 text-[14px] leading-7 text-[var(--psy-ink-soft)]">
                新主 Logo 的核心不再只是「像麻将」或「像心理测评」，而是把两件事合成一个语言无关的品牌符号：<strong className="text-[var(--psy-ink)]">Ψ 代表心理学</strong>，<strong className="text-[var(--psy-ink)]">麻将牌框代表游戏本体</strong>。它需要服务中文、英文和未来其他语言版本，所以主 Logo 本体不放文字。
              </p>
              <p className="mt-2 text-[14px] leading-7 text-[var(--psy-ink-soft)]">
                当前阶段不讨论其他功能图标。所有对外品牌露出都围绕同一个 Psi Tile 主 Logo，只通过底板、尺寸、字标组合来适配不同位置。
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StrategyCard eyebrow="Core" title="Ψ 心理符号">
                心理学 / 心智的通用符号，语言无关，适合中英和未来多语言版本。
              </StrategyCard>
              <StrategyCard eyebrow="Game" title="麻将牌框">
                圆角牌框连接游戏本体，也能直接复用现有卡牌的象牙面与金边。
              </StrategyCard>
              <StrategyCard eyebrow="Depth" title="必须带底板">
                主 Logo 裸放在米白网页上会缺少层次；默认使用暖牌底板或象牙卡底。
              </StrategyCard>
              <StrategyCard eyebrow="Consistency" title="全站一致">
                Homepage、导航、favicon、PWA、分享图和课件都使用同一个主 Logo。
              </StrategyCard>
            </div>
          </div>
        </Section>

        {/* Asset palette */}
        <Section eyebrow="Logo Palette · 主 Logo 配色" title="主 Logo 沿用网站暖纸系统">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StrategyCard eyebrow="Base" title="象牙 / 暖纸">
              <p>牌面与底板使用 `#fdf8f1` / `#fdf9f0`，页面背景使用 `#f4edd9`，让 Logo 放进页面时自然但有层次。</p>
            </StrategyCard>
            <StrategyCard eyebrow="Hero color" title="暖金 Ψ">
              <p>Ψ 使用 `#c39a52` 与 `#9a7448`，既有心理学符号的权威感，也延续卡牌金边和按钮强调色。</p>
            </StrategyCard>
            <StrategyCard eyebrow="Accent" title="陶土红">
              <p>陶土红 `#c9603f` 只作为主 Logo 内部重点色，让 Ψ 的负形更清晰，也和当前网页按钮/提示色相协调。</p>
            </StrategyCard>
            <StrategyCard eyebrow="Support" title="墨色描边">
              <p>墨色 `#3a3020` 只负责小尺寸识别和边界，不大面积使用，避免变成传统棋牌或冷硬科技感。</p>
            </StrategyCard>
          </div>
        </Section>

        {/* Logo output system */}
        <Section eyebrow="Output · 主 Logo 导出" title="最终只交付主 Logo 的几种格式">
          <div className="grid gap-3 sm:grid-cols-2">
            {BRAND_LOGO_RULES.map((item) => (
              <StrategyCard key={item.name} eyebrow={item.use} title={item.name}>
                {item.desc}
              </StrategyCard>
            ))}
          </div>
          <p className="text-[13px] leading-6 text-[var(--psy-muted)]">
            当前页面里的 PNG 是评审与网页展示用资产。正式落地时，主 Logo 应重绘为 <strong>SVG</strong> 源文件，并同时导出「裸标记」和「带底板」两套；网页默认使用带底板版本，再导出 `favicon.ico` / `icon.svg` / `apple-icon.png` / PWA 尺寸 PNG。
          </p>
        </Section>

        {/* Placement */}
        <Section eyebrow="Web Usage · 主 Logo 呈现" title="主 Logo 出现位置汇总">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <StrategyCard eyebrow="Small" title="favicon / App icon / 导航栏">
              使用唯一主 Logo：Psi Tile。默认选择带暖色底板版本，负责告诉用户“这是 Personalities Mahjong”，不随页面内容变化。
            </StrategyCard>
            <StrategyCard eyebrow="Large" title="Homepage / 海报 / 课件封面">
              使用主 Logo + 中英文品牌名的完整锁版；空间不足时只保留带底板 Logo。
            </StrategyCard>
            <StrategyCard eyebrow="Share" title="OG image / 分享预览">
              使用主 Logo + 标题 + 一句产品说明；不要加入其他候选图形，避免误解为副 Logo。
            </StrategyCard>
          </div>
        </Section>

        {/* Concept */}
        <Section eyebrow="Concept · 概念" title="心理学 × 麻将">
          <div className="space-y-3 text-[15px] leading-7 text-[var(--psy-ink-soft)]">
            <p>
              一句话：<strong className="text-[var(--psy-ink)]">把人格测评、心理线索判断与卡牌对战编织在一起——先读懂自己，再在牌桌上读懂别人。</strong>
            </p>
            <p>
              玩家先完成五大人格（Big Five / OCEAN）测评得到自己的五维画像；这份画像决定牌局里每个维度需要凑齐的「目标张数」。牌桌沿用麻将的「摸牌 / 碰 / 胡」节奏，但每张牌都是一句人格陈述，归档 = 用同维度的牌凑齐一组、公开锁定。对手打出的每一张弃牌都在暴露他的人格倾向——这是「识人破局」的核心乐趣。
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
        <Section eyebrow="Goals · 目标" title="用一局麻将学会五大人格">
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
        <CollapsibleSection eyebrow="Logo · 方向 A" title="麻将风（牌局识别）">
          <p className="text-[13px] leading-6 text-[var(--psy-muted)]">以麻将牌为主体，牌面嵌入心理符号（心 / 五维雷达 / 罗盘）。稳、直观、和「麻将」名字直接呼应。</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <LogoCard label="A1 · 心牌" note="麻将牌面嵌「心」——心理 × 麻将最直接的组合">
              <TileBase>
                <text x="60" y="74" textAnchor="middle" fontSize="40" fontWeight="700" fill={GOLD_STRONG}>心</text>
              </TileBase>
            </LogoCard>
            <LogoCard label="A2 · 五维牌" note="牌面是五大雷达——点出「人格」内核">
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
            <LogoCard label="A4 · 手牌扇面" note="三张牌形成手牌展开，更有牌局和选择感">
              <FanTilesGlyph />
            </LogoCard>
            <LogoCard label="A5 · 心门牌" note="把牌框做成入口，强调进入人格牌局">
              <GateTileGlyph />
            </LogoCard>
            <LogoCard label="A6 · 画像牌" note="用人物轮廓 + 五维点，偏测评档案感">
              <ProfileTileGlyph />
            </LogoCard>
          </div>
        </CollapsibleSection>

        {/* Logo direction — Tarot */}
        <CollapsibleSection eyebrow="Logo · 方向 B" title="塔罗风（卡面延伸）">
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
            <LogoCard label="B4 · 镜像卡" note="像读牌也像看见自己，心理测评感更强">
              <TarotMirrorGlyph />
            </LogoCard>
            <LogoCard label="B5 · 研究卡" note="卡面像记录纸，适合教学/课程语境">
              <TarotStudyGlyph />
            </LogoCard>
            <LogoCard label="B6 · 门廊卡" note="偏仪式感，强调揭示和进入内在空间">
              <TarotPortalGlyph />
            </LogoCard>
          </div>
        </CollapsibleSection>

        {/* Recommendation */}
        <CollapsibleSection eyebrow="My take · 我的判断" title="主线用「麻将牌」，气质用「心理测评」">
          <div className="grid gap-3 lg:grid-cols-3">
            <AnalysisCard title="Claude 方向可取" tone="good">
              麻将牌、心、五维雷达这些元素是对的：一眼能读出「这是麻将相关的心理游戏」。其中 A3 的对牌关系最好，天然有牌局、对战、胡牌的语义。
            </AnalysisCard>
            <AnalysisCard title="Gemini 方向要收敛" tone="risk">
              牌叠 + 英文字标的商业感更强，但藏青、砖红、毛笔式 MAHJONG 会把品牌推向传统棋牌或餐饮感，和当前温润学术的产品界面不一致；圆形徽章也太密，缩小后不利于 favicon。
            </AnalysisCard>
            <AnalysisCard title="建议定版方向" tone="pick">
              用「两张麻将牌 + 心/五维」作为核心图标，字标保持无衬线、墨色为主、金色点睛。这样既保留麻将识别，也避免过度传统化。
            </AnalysisCard>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <LogoCard label="C1 · 心局（推荐）" note="两张牌代表牌局与对手，心 + 五点代表人格测评">
              <>
                <TileBase x={34} rot={-8} />
                <TileBase x={28} rot={4}>
                  <HeartMindGlyph cx={58} cy={61} />
                </TileBase>
              </>
            </LogoCard>
            <LogoCard label="C2 · 人格罗盘" note="麻将牌内放罗盘雷达，强调识人、判断、指向">
              <TileBase>
                <RadarCompassGlyph cx={60} cy={61} />
              </TileBase>
            </LogoCard>
            <LogoCard label="C3 · 极简心牌" note="适合 favicon / app icon，缩小后仍能识别">
              <TileBase>
                <HeartMindGlyph cx={60} cy={61} />
              </TileBase>
            </LogoCard>
            <LogoCard label="C4 · 彩线心局" note="在 C1 基础上把五维色做成更明显的关系线">
              <>
                <ColorTileBase x={35} rot={-8} fill="#f2e7cf" rail={SAGE} />
                <ColorTileBase x={27} rot={4} fill="#fff8eb" rail={VIOLET}>
                  <ColorHeartMindGlyph cx={57} cy={61} />
                </ColorTileBase>
              </>
            </LogoCard>
            <LogoCard label="C5 · 手牌心局" note="从双牌扩成手牌，游戏感更足但复杂度上升">
              <FanTilesGlyph />
            </LogoCard>
            <LogoCard label="C6 · 画像心局" note="更偏学习平台/测评报告，可用于课程版本">
              <ProfileTileGlyph />
            </LogoCard>
          </div>

          <div className="rounded-[1.2rem] border border-[var(--psy-border)] bg-[var(--psy-card-content)] p-4">
            <div className="psy-serif text-base font-semibold text-[var(--psy-ink)]">落地优先级</div>
            <p className="mt-2 text-[13px] leading-6 text-[var(--psy-ink-soft)]">
              第一版先推进 <strong>C1 心局</strong>：它比单张心牌更有游戏感，比圆形徽章更轻，比毛笔字标更贴近当前产品。视觉上只保留三件事：<strong>牌形、心字、五维点</strong>。罗盘可以作为二级图形，不建议放进主 logo 的第一版。
            </p>
          </div>
        </CollapsibleSection>

        {/* Color variants */}
        <CollapsibleSection eyebrow="Color Logo · 彩色尝试" title="可以加颜色，但要小面积、有理由">
          <p className="text-[13px] leading-6 text-[var(--psy-muted)]">
            现在的粗框 + 白底确实偏保守。更适合本网页的做法不是换成强烈主色，而是把五维人格色放到牌面小符号、内衬或边线里：既跟测评系统连上，也不会破坏暖纸米白的整体气质。
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            <LogoCard label="D1 · 彩色心局（推荐）" note="保留 C1 架构，五维色作为心字周围的测评点">
              <>
                <ColorTileBase x={35} rot={-8} fill="#f4ead3" rail={SAGE} stroke="#3f3424" />
                <ColorTileBase x={27} rot={4} fill="#fff8eb" rail={GOLD_STRONG}>
                  <ColorHeartMindGlyph cx={57} cy={61} />
                </ColorTileBase>
              </>
            </LogoCard>
            <LogoCard label="D2 · 五维牌面" note="牌面内放彩色雷达，直接把人格画像变成 logo 记忆点">
              <ColorTileBase fill="#fff8eb" rail={VIOLET}>
                <ColorRadarGlyph cx={60} cy={62} r={25} />
              </ColorTileBase>
            </LogoCard>
            <LogoCard label="D3 · 双性格牌" note="左右微染色，表达人与人/自我两面，不用大面积彩虹">
              <SplitColorTile>
                <ColorHeartMindGlyph cx={60} cy={62} />
              </SplitColorTile>
            </LogoCard>
            <LogoCard label="D4 · 五维花牌" note="彩色更明显，弱化牌框，偏亲和与学习工具">
              <ColorTileBase fill="#fff8eb" rail={SAGE}>
                <BloomGlyph cx={60} cy={61} />
              </ColorTileBase>
            </LogoCard>
            <LogoCard label="D5 · 彩环印记" note="保留圆环和五维点，可作为 favicon 备选">
              <ColorSealGlyph cx={60} cy={60} />
            </LogoCard>
            <LogoCard label="D6 · 彩色轨道" note="少用具体图形，用五维关系线表达人格结构">
              <ColorTileBase fill="#fff8eb" rail={VIOLET}>
                <AbstractOrbitGlyph />
              </ColorTileBase>
            </LogoCard>
          </div>
          <div className="rounded-[1.2rem] border border-[rgba(195,154,82,0.38)] bg-[rgba(195,154,82,0.08)] p-4">
            <div className="psy-serif text-base font-semibold text-[var(--psy-ink)]">颜色建议</div>
            <p className="mt-2 text-[13px] leading-6 text-[var(--psy-ink-soft)]">
              如果要定一个彩色版，我会选 <strong>D1 彩色心局</strong>：框架还是稳定的麻将牌，颜色只负责说明「人格五维」。D2 更适合测评页或报告页，D3 更有概念但识别门槛稍高。
            </p>
          </div>
        </CollapsibleSection>

        {/* Explorations */}
        <CollapsibleSection eyebrow="More styles · 新风格" title="再开几条不同路线">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <LogoCard label="E1 · 徽章印章" note="更像课程/研究项目标识，适合报告封面">
              <ColorSealGlyph cx={60} cy={60} />
            </LogoCard>
            <LogoCard label="E2 · 五瓣心花" note="五维色组成花/人格结构，游戏感较弱但亲和">
              <BloomGlyph cx={60} cy={60} />
            </LogoCard>
            <LogoCard label="E3 · 牌桌视角" note="四张牌围成桌面，中间是心，强调多人牌局">
              <>
                {[0, 90, 180, 270].map((rot, i) => (
                  <g key={rot} transform={`rotate(${rot} 60 60)`}>
                    <rect x="50" y="14" width="20" height="38" rx="5" fill={i % 2 ? '#fff4df' : '#f1e5cb'} stroke={INK} strokeWidth="2" />
                    <rect x="53" y="18" width="14" height="30" rx="3" fill="none" stroke={DIM_COLORS[i]} strokeWidth="1.2" opacity="0.85" />
                  </g>
                ))}
                <circle cx="60" cy="60" r="19" fill={CREAM} stroke={GOLD_STRONG} strokeWidth="2.2" />
                <text x="60" y="68" textAnchor="middle" fontSize="22" fontWeight="780" fill={INK}>心</text>
              </>
            </LogoCard>
            <LogoCard label="E4 · 学术标签" note="少图形、重字标，适合网页页眉和课件标题">
              <>
                <rect x="16" y="32" width="88" height="56" rx="14" fill="#fff8eb" stroke={INK} strokeWidth="3" />
                <rect x="23" y="39" width="74" height="42" rx="9" fill="none" stroke={GOLD} strokeWidth="1.4" />
                <text x="60" y="59" textAnchor="middle" fontSize="18" fontWeight="780" fill={INK}>PM</text>
                <g transform="translate(38 68)">
                  {DIM_COLORS.map((color, i) => <circle key={color} cx={i * 11} cy="0" r="3" fill={color} />)}
                </g>
              </>
            </LogoCard>
            <LogoCard label="E5 · 研究印章" note="比 E1 更简化，适合课程 slide 和讲义页脚">
              <>
                <circle cx="60" cy="60" r="37" fill="#fff8eb" stroke={INK} strokeWidth="3" />
                <path d="M38 60 H82 M60 38 V82" stroke={GOLD} strokeWidth="2" opacity="0.56" />
                <AbstractFivefoldGlyph />
              </>
            </LogoCard>
            <LogoCard label="E6 · 牌桌徽章" note="把多人牌局做成圆徽章，宣传物上更完整">
              <>
                <circle cx="60" cy="60" r="40" fill="#fff8eb" stroke={INK} strokeWidth="3" />
                {[0, 90, 180, 270].map((rot, i) => (
                  <g key={rot} transform={`rotate(${rot} 60 60)`}>
                    <rect x="53" y="22" width="14" height="27" rx="4" fill={DIM_COLORS[i]} opacity="0.72" />
                  </g>
                ))}
                <circle cx="60" cy="60" r="16" fill={CREAM} stroke={GOLD_STRONG} strokeWidth="2" />
              </>
            </LogoCard>
            <LogoCard label="E7 · 字标圆章" note="更偏品牌应用，不依赖中文心字">
              <>
                <circle cx="60" cy="60" r="38" fill="#fff8eb" stroke={INK} strokeWidth="3" />
                <text x="60" y="57" textAnchor="middle" fontSize="17" fontWeight="800" fill={INK}>PM</text>
                <text x="60" y="74" textAnchor="middle" fontSize="9" fontWeight="700" fill={GOLD_STRONG}>OCEAN</text>
                <circle cx="60" cy="60" r="27" fill="none" stroke={GOLD} strokeWidth="1.4" />
              </>
            </LogoCard>
            <LogoCard label="E8 · 课程标签" note="最克制，适合导航栏、文档页和课堂材料">
              <>
                <rect x="20" y="39" width="80" height="42" rx="10" fill="#fff8eb" stroke={INK} strokeWidth="3" />
                <path d="M32 60 H88" stroke={GOLD} strokeWidth="2" opacity="0.52" />
                <text x="60" y="57" textAnchor="middle" fontSize="15" fontWeight="800" fill={INK}>人格麻将</text>
                <g transform="translate(38 69)">
                  {DIM_COLORS.map((color, i) => <rect key={color} x={i * 10.5} y="0" width="6" height="6" rx="2" fill={color} />)}
                </g>
              </>
            </LogoCard>
          </div>
          <p className="text-[13px] leading-6 text-[var(--psy-muted)]">
            这几条不是都适合做主 logo：E1/E5 偏正式，E2 偏亲和，E3/E6 最游戏化，E4/E8 最克制。它们可以作为分支参考，主路线仍建议从 D1 / C1 继续打磨。
          </p>
        </CollapsibleSection>

        {/* Abstract explorations */}
        <CollapsibleSection eyebrow="Abstract · 抽象方向" title="不依赖具体物件的符号">
          <p className="text-[13px] leading-6 text-[var(--psy-muted)]">
            这组故意减少麻将牌、塔罗卡、心字等具象元素，转向「人格结构 / 关系 / 选择 / 自我折叠」的抽象表达。它们更像品牌符号，识别门槛更高，但成熟度和延展性更强。
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <LogoCard label="F1 · 五维轨道" note="五个维度围绕中心人格，适合动态 logo">
              <AbstractOrbitGlyph />
            </LogoCard>
            <LogoCard label="F2 · 人格折面" note="两片折面叠合，表达自我与他人的读解">
              <AbstractFoldGlyph />
            </LogoCard>
            <LogoCard label="F3 · 心理波形" note="用五条行为曲线表达测评数据，不像游戏图标">
              <AbstractWaveGlyph />
            </LogoCard>
            <LogoCard label="F4 · 关系结" note="像两个人格互相缠绕，适合对战/识人主题">
              <AbstractKnotGlyph />
            </LogoCard>
            <LogoCard label="F5 · 五维晶体" note="雷达图再抽象成晶体，成熟但仍有测评来源">
              <AbstractFivefoldGlyph />
            </LogoCard>
            <LogoCard label="F6 · PM 字母织构" note="用 Personalities Mahjong 首字母做半抽象字标">
              <AbstractMonogramGlyph />
            </LogoCard>
          </div>
          <div className="rounded-[1.2rem] border border-[rgba(96,165,250,0.28)] bg-[rgba(96,165,250,0.07)] p-4">
            <div className="psy-serif text-base font-semibold text-[var(--psy-ink)]">抽象路线判断</div>
            <p className="mt-2 text-[13px] leading-6 text-[var(--psy-ink-soft)]">
              如果想从「具体游戏图标」升级成更像品牌的标志，可以重点看 F1、F2、F5。F1 最容易和五维测评绑定；F2 最有品牌感；F5 介于雷达图和抽象晶体之间，适合做长期视觉母题。
            </p>
          </div>
        </CollapsibleSection>

        {/* Gemini-like brand lockups */}
        <CollapsibleSection eyebrow="Brand Lockup · 品牌组合" title="接近 Gemini 那种完整品牌感">
          <p className="text-[13px] leading-6 text-[var(--psy-muted)]">
            这组不是单独的小图标，而是更像真实品牌提案的完整组合：图形标 + 英文字标 + 徽章/横版应用。参考 Gemini 的商业完成度，但把红蓝压暗、金色降低面积，避免和当前暖纸米白网页脱节。
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <BrandLockupCard label="G1 · 双牌经典版" note="最接近参考图的品牌组合：牌组在上，粗衬线字标在下">
              <MiniCardsMark x={129} y={20} scale={1.05} />
              <Wordmark x={180} y={130} />
            </BrandLockupCard>
            <BrandLockupCard label="G2 · 心罗盘横版" note="适合网页页眉、海报横幅；图标和字标更像正式 logo">
              <MiniCardsMark x={30} y={58} scale={0.88} />
              <Wordmark x={140} y={88} align="start" compact />
            </BrandLockupCard>
            <BrandLockupCard label="G3 · 单牌旋纹版" note="像 Gemini 3C 的单牌品牌标，更简洁、更像 app icon">
              <SwooshCardMark x={138} y={8} scale={0.86} />
              <BrushWordmark x={180} y={143} />
            </BrandLockupCard>
            <BrandLockupCard label="G4 · 圆章徽章版" note="适合课程证书、讲义封面、社交头像，但小尺寸要简化">
              <GeminiSealLockup />
            </BrandLockupCard>
            <BrandLockupCard label="G5 · 学术品牌版" note="降低游戏感，像大学课程项目或 research tool">
              <rect x="34" y="34" width="292" height="152" rx="24" fill="#fff8eb" stroke={NAVY} strokeWidth="4" />
              <path d="M54 72 H306" stroke={GOLD} strokeWidth="2" opacity="0.62" />
              <text x="180" y="68" textAnchor="middle" fontFamily="Georgia, 'Times New Roman', serif" fontSize="17" fontWeight="800" fill={NAVY}>PERSONALITIES MAHJONG</text>
              <AbstractFivefoldGlyph />
              <g transform="translate(105 132)">
                {DIM_COLORS.map((color, i) => <circle key={color} cx={i * 38} cy="0" r="6" fill={color} />)}
              </g>
              <text x="180" y="164" textAnchor="middle" fontFamily="Arial, sans-serif" fontSize="13" fontWeight="700" fill={GOLD_STRONG}>BIG FIVE · CARD GAME · SOCIAL READING</text>
            </BrandLockupCard>
            <BrandLockupCard label="G6 · 现代品牌版" note="减少复古感，用 PM 字母标 + 强字标，更适合网站品牌栏">
              <g transform="translate(38 47)">
                <rect x="0" y="0" width="86" height="86" rx="20" fill={NAVY} />
                <path d="M24 62 V24 H38 C52 24 58 32 58 43 C58 54 51 61 38 61 H36" fill="none" stroke={CREAM} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M54 63 V24 L66 44 L78 24 V63" fill="none" stroke={GOLD} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
                <g transform="translate(17 73)">
                  {DIM_COLORS.map((color, i) => <circle key={color} cx={i * 12} cy="0" r="3" fill={color} />)}
                </g>
              </g>
              <text x="145" y="86" fontFamily="Georgia, 'Times New Roman', serif" fontSize="30" fontWeight="850" fill={NAVY}>PERSONALITIES</text>
              <text x="145" y="129" fontFamily="Trebuchet MS, Arial, sans-serif" fontSize="47" fontWeight="900" fill={BRAND_RED}>MAHJONG</text>
              <path d="M146 143 H312" stroke={GOLD} strokeWidth="3" strokeLinecap="round" opacity="0.68" />
            </BrandLockupCard>
          </div>
          <div className="rounded-[1.2rem] border border-[rgba(22,50,74,0.22)] bg-[rgba(22,50,74,0.06)] p-4">
            <div className="psy-serif text-base font-semibold text-[var(--psy-ink)]">这条路线的取舍</div>
            <p className="mt-2 text-[13px] leading-6 text-[var(--psy-ink-soft)]">
              如果目标是“看起来像一个已经能对外发布的品牌”，G1/G2/G6 比前面的 icon 草案更接近。G4 最像徽章，但细节多；G3 比较有 app icon 潜力；G5 更适合课程和研究语境。建议后续从 G2 或 G6 里继续精修字标比例。
            </p>
          </div>
        </CollapsibleSection>

        {/* Wordmark */}
        <Section eyebrow="Lockup · 组合" title="图标 + 字标">
          <div className="psy-panel psy-etched flex flex-col items-center gap-4 rounded-[1.4rem] p-6 sm:flex-row sm:justify-center sm:gap-6">
            <svg viewBox="0 0 120 120" className="h-20 w-20 shrink-0">
              <TileBase x={34} rot={-8} />
              <TileBase x={28} rot={4}>
                <HeartMindGlyph cx={58} cy={61} />
              </TileBase>
            </svg>
            <div className="text-center sm:text-left">
              <div className="psy-serif text-2xl font-bold tracking-wide text-[var(--psy-ink)]">PERSONALITIES</div>
              <div className="psy-serif text-2xl font-bold tracking-[0.12em]" style={{ color: GOLD_STRONG }}>MAHJONG · 人格麻將</div>
            </div>
          </div>
          <p className="text-[13px] leading-6 text-[var(--psy-muted)]">
            落地建议：网页顶栏 / favicon 用<strong>纯图标</strong>（避免与页面标题文字重复）；完整「图标+字标」留给启动页、宣传图、打印物。字标用站内干净字体，别用毛笔体；配色以奶油 / 金 / 墨为底，五维色只做测评点或细节，不做大面积主色。
          </p>
        </Section>

        {/* Do / Don't */}
        <Section eyebrow="Guidelines · 规范" title="Do / Don't">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.2rem] border border-[rgba(111,143,85,0.35)] bg-[rgba(111,143,85,0.08)] p-4">
              <div className="psy-serif text-sm font-semibold text-[var(--psy-success)]">✓ Do</div>
              <ul className="mt-2 space-y-1.5 text-[13px] leading-6 text-[var(--psy-ink-soft)]">
                <li>· 以奶油 / 金 / 墨为底，允许五维色小面积点缀</li>
                <li>· 图标以麻将牌或塔罗卡框为主体</li>
                <li>· 嵌入心理符号：心 / 五维雷达 / 罗盘</li>
                <li>· wordmark 用干净无衬线字体</li>
                <li>· 顶栏 / favicon 用纯图标版</li>
                <li>· 主 logo 优先测试「两张牌 + 心 + 五维点」或彩色 D1</li>
              </ul>
            </div>
            <div className="rounded-[1.2rem] border border-[rgba(201,96,63,0.35)] bg-[rgba(201,96,63,0.08)] p-4">
              <div className="psy-serif text-sm font-semibold text-[var(--psy-danger)]">✕ Don&apos;t</div>
              <ul className="mt-2 space-y-1.5 text-[13px] leading-6 text-[var(--psy-ink-soft)]">
                <li>· 用毛笔 / 书法手写体做 MAHJONG</li>
                <li>· 用藏青 + 砖红等高饱和主色</li>
                <li>· 图标里再放一遍品牌全称文字</li>
                <li>· 过密的圆形徽章（缩到 favicon 会糊）</li>
                <li>· 五维专属色大面积铺满整张牌</li>
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
