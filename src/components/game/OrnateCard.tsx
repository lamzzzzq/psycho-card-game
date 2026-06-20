'use client';

// 装饰版塔罗卡（SVG 边框）—— 拱形图窗 + 双线金框 + 四角星 + 顶纹章 + 底部文字框。
// ⚠️ 目前只在 card-lab 沙盒试用，不接入正式 TarotCard / 游戏。满意后再决定是否合并。
// 全部用一个 viewBox=400×700(=4:7) 的内联 SVG 绘制：矢量、任意尺寸清晰、可换色、零素材。
// padding 对齐现版 TarotCard：内容(图窗/文字框)内缩 ~18/400≈4.5%，尽量贴近边框、留白小。
import { useState } from 'react';

const GOLD = '#c9a45c';        // 主线
const GOLD_SOFT = '#9c7c44';   // 次线/内线
const GOLD_DIM = 'rgba(201,164,92,0.45)';

const M = 18;                  // 内容内缩（≈4.5%，对齐现版 4cqw padding）
const R = 400 - M;            // 右/对称用 = 382

// 4 角星(sparkle)路径，中心 (cx,cy)、尺寸 s。
function spark(cx: number, cy: number, s: number) {
  const k = s * 0.28;
  return `M${cx},${cy - s} C${cx},${cy - k} ${cx + k},${cy} ${cx + s},${cy} C${cx + k},${cy} ${cx},${cy + k} ${cx},${cy + s} C${cx},${cy + k} ${cx - k},${cy} ${cx - s},${cy} C${cx - k},${cy} ${cx},${cy - k} ${cx},${cy - s} Z`;
}

// 拱形图窗：x 18..382, 顶峰 y20, 肩 ~110, 底 418。占卡高约 60%，与现版图窗一致。
const ARCH = `M${M},418 L${M},110 C${M},52 105,30 200,22 C295,30 ${R},52 ${R},110 L${R},418 Z`;

interface OrnateCardProps {
  text: string;
  textEn?: string;
  imageSrc?: string;
  locale?: 'zh' | 'en';
  width?: number;
}

export function OrnateCard({ text, textEn, imageSrc, locale = 'zh', width = 200 }: OrnateCardProps) {
  const [imgError, setImgError] = useState(false);
  const showImg = !!imageSrc && !imgError;
  const label = (locale === 'en' ? (textEn ?? text) : text).replace(/[。．.\s]+$/, '');

  return (
    <div className="shrink-0" style={{ containerType: 'inline-size', width }}>
      <div className="relative" style={{ aspectRatio: '4 / 7' }}>
        <svg viewBox="0 0 400 700" width="100%" height="100%" style={{ display: 'block' }}>
          <defs>
            <clipPath id="archClip"><path d={ARCH} /></clipPath>
            <linearGradient id="cardBg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#16243a" />
              <stop offset="0.6" stopColor="#0e1a28" />
              <stop offset="1" stopColor="#0a131e" />
            </linearGradient>
            <linearGradient id="imgPlaceholder" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#1c2c44" />
              <stop offset="1" stopColor="#0f1c2b" />
            </linearGradient>
          </defs>

          {/* 卡底 */}
          <rect x="3" y="3" width="394" height="694" rx="42" fill="url(#cardBg)" />

          {/* 图窗（拱形裁切）：图片或占位。覆盖整个拱形 bbox。 */}
          <g clipPath="url(#archClip)">
            <rect x={M} y="20" width={R - M} height="400" fill="url(#imgPlaceholder)" />
            {showImg && (
              // eslint-disable-next-line @next/next/no-img-element
              <image href={imageSrc} x={M} y="20" width={R - M} height="400" preserveAspectRatio="xMidYMid slice" onError={() => setImgError(true)} />
            )}
          </g>
          {!showImg && <text x="200" y="235" textAnchor="middle" fontSize="56" fill={GOLD_DIM} opacity="0.5">◈</text>}

          {/* 拱形描边（双线） */}
          <path d={ARCH} fill="none" stroke={GOLD} strokeWidth="2" />
          <path d={`M${M + 7},414 L${M + 7},112 C${M + 7},58 108,36 200,28 C292,36 ${R - 7},58 ${R - 7},112 L${R - 7},414`} fill="none" stroke={GOLD_SOFT} strokeWidth="1" opacity="0.85" />

          {/* 外双线框 */}
          <rect x="7" y="7" width="386" height="686" rx="38" fill="none" stroke={GOLD} strokeWidth="2" />
          <rect x="13" y="13" width="374" height="674" rx="32" fill="none" stroke={GOLD_SOFT} strokeWidth="1" opacity="0.8" />

          {/* 顶部中央纹章（菱形 + 两侧短线 + 上方小星） */}
          <path d={spark(200, 11, 6)} fill={GOLD} />
          <path d="M200,16 l8,8 l-8,8 l-8,-8 Z" fill="none" stroke={GOLD} strokeWidth="1.5" />
          <line x1="158" y1="24" x2="184" y2="24" stroke={GOLD_SOFT} strokeWidth="1" />
          <line x1="216" y1="24" x2="242" y2="24" stroke={GOLD_SOFT} strokeWidth="1" />

          {/* 四角星（顶角在拱肩两侧的空隙；底角在文字框外角） */}
          <path d={spark(40, 52, 6)} fill={GOLD} />
          <path d={spark(360, 52, 6)} fill={GOLD} />
          <path d={spark(40, 648, 5)} fill={GOLD} />
          <path d={spark(360, 648, 5)} fill={GOLD} />

          {/* 拱底分隔 ◆ */}
          <line x1="60" y1="432" x2="186" y2="432" stroke={GOLD_DIM} strokeWidth="1" />
          <path d="M200,425 l7,7 l-7,7 l-7,-7 Z" fill={GOLD} />
          <line x1="214" y1="432" x2="340" y2="432" stroke={GOLD_DIM} strokeWidth="1" />

          {/* 底部文字框 + 角部括号 + 顶部小菱（贴近边框、放大） */}
          <rect x={M} y="448" width={R - M} height="226" rx="12" fill="none" stroke={GOLD_SOFT} strokeWidth="1.5" />
          <path d={`M${M + 14},462 v-8 a4,4 0 0 1 4,-4 h8`} fill="none" stroke={GOLD} strokeWidth="1.5" />
          <path d={`M${R - 14},462 v-8 a4,4 0 0 0 -4,-4 h-8`} fill="none" stroke={GOLD} strokeWidth="1.5" />
          <path d={`M${M + 14},660 v8 a4,4 0 0 0 4,4 h8`} fill="none" stroke={GOLD} strokeWidth="1.5" />
          <path d={`M${R - 14},660 v8 a4,4 0 0 1 -4,4 h-8`} fill="none" stroke={GOLD} strokeWidth="1.5" />
          <path d="M194,448 l6,-6 l6,6 l-6,6 Z" fill={GOLD} />
        </svg>

        {/* 文字层（HTML 叠加，便于字体/换行/省略）：盖在底部文字框上，字号对齐现版 */}
        <div
          className="psy-serif absolute flex items-center justify-center text-center"
          style={{ left: `${M / 4}%`, right: `${M / 4}%`, top: '65%', height: '30%' }}
        >
          <p
            className="font-semibold leading-snug"
            style={{
              color: 'var(--psy-ink)',
              fontSize: locale === 'en' ? '9.5cqw' : '10.5cqw',
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}
