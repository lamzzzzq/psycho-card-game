'use client';

// 装饰版塔罗卡（SVG 边框）—— 拱形图窗 + 双线金框 + 四角星 + 顶纹章 + 底部文字框。
// ⚠️ 目前只在 card-lab 沙盒试用，不接入正式 TarotCard / 游戏。满意后再决定是否合并。
// 全部用一个 viewBox=400×700(=4:7) 的内联 SVG 绘制：矢量、任意尺寸清晰、可换色、零素材。
import { useState } from 'react';

const GOLD = '#c9a45c';        // 主线
const GOLD_SOFT = '#9c7c44';   // 次线/内线
const GOLD_DIM = 'rgba(201,164,92,0.45)';

// 4 角星(sparkle)路径，中心 (cx,cy)、尺寸 s。
function spark(cx: number, cy: number, s: number) {
  const k = s * 0.28;
  return `M${cx},${cy - s} C${cx},${cy - k} ${cx + k},${cy} ${cx + s},${cy} C${cx + k},${cy} ${cx},${cy + k} ${cx},${cy + s} C${cx},${cy + k} ${cx - k},${cy} ${cx - s},${cy} C${cx - k},${cy} ${cx},${cy - k} ${cx},${cy - s} Z`;
}

// 拱形图窗路径（x 38..362, 顶峰 y40, 肩 ~150, 底 452）。
const ARCH = 'M38,452 L38,150 C38,78 122,52 200,40 C278,52 362,78 362,150 L362,452 Z';

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
          <rect x="4" y="4" width="392" height="692" rx="42" fill="url(#cardBg)" />

          {/* 图窗（拱形裁切）：图片或占位 */}
          <g clipPath="url(#archClip)">
            <rect x="38" y="40" width="324" height="412" fill="url(#imgPlaceholder)" />
            {showImg && (
              // eslint-disable-next-line @next/next/no-img-element
              <image href={imageSrc} x="38" y="40" width="324" height="412" preserveAspectRatio="xMidYMid slice" onError={() => setImgError(true)} />
            )}
          </g>
          {!showImg && <text x="200" y="252" textAnchor="middle" fontSize="56" fill={GOLD_DIM} opacity="0.5">◈</text>}

          {/* 拱形描边（双线） */}
          <path d={ARCH} fill="none" stroke={GOLD} strokeWidth="2" />
          <path d="M46,448 L46,152 C46,86 124,62 200,50 C276,62 354,86 354,152 L354,448" fill="none" stroke={GOLD_SOFT} strokeWidth="1" opacity="0.85" />

          {/* 外双线框 */}
          <rect x="10" y="10" width="380" height="680" rx="38" fill="none" stroke={GOLD} strokeWidth="2" />
          <rect x="17" y="17" width="366" height="666" rx="32" fill="none" stroke={GOLD_SOFT} strokeWidth="1" opacity="0.8" />

          {/* 顶部中央纹章（菱形 + 两侧短线 + 上方小星） */}
          <path d={spark(200, 26, 7)} fill={GOLD} />
          <path d="M200,33 l9,9 l-9,9 l-9,-9 Z" fill="none" stroke={GOLD} strokeWidth="1.5" />
          <line x1="150" y1="42" x2="182" y2="42" stroke={GOLD_SOFT} strokeWidth="1" />
          <line x1="218" y1="42" x2="250" y2="42" stroke={GOLD_SOFT} strokeWidth="1" />

          {/* 四角星 */}
          <path d={spark(48, 60, 6)} fill={GOLD} />
          <path d={spark(352, 60, 6)} fill={GOLD} />
          <path d={spark(48, 640, 6)} fill={GOLD} />
          <path d={spark(352, 640, 6)} fill={GOLD} />

          {/* 拱底分隔 ◆ */}
          <line x1="70" y1="468" x2="185" y2="468" stroke={GOLD_DIM} strokeWidth="1" />
          <path d="M200,461 l7,7 l-7,7 l-7,-7 Z" fill={GOLD} />
          <line x1="215" y1="468" x2="330" y2="468" stroke={GOLD_DIM} strokeWidth="1" />

          {/* 底部文字框 + 角部括号 + 顶部小菱 */}
          <rect x="40" y="486" width="320" height="184" rx="12" fill="none" stroke={GOLD_SOFT} strokeWidth="1.5" />
          {/* 四角括号 */}
          <path d="M52,500 v-8 a4,4 0 0 1 4,-4 h8" fill="none" stroke={GOLD} strokeWidth="1.5" />
          <path d="M348,500 v-8 a4,4 0 0 0 -4,-4 h-8" fill="none" stroke={GOLD} strokeWidth="1.5" />
          <path d="M52,656 v8 a4,4 0 0 0 4,4 h8" fill="none" stroke={GOLD} strokeWidth="1.5" />
          <path d="M348,656 v8 a4,4 0 0 1 -4,4 h-8" fill="none" stroke={GOLD} strokeWidth="1.5" />
          <path d="M194,486 l6,-6 l6,6 l-6,6 Z" fill={GOLD} />

          {/* 底部中央小星 */}
          <path d={spark(200, 680, 5)} fill={GOLD} />
        </svg>

        {/* 文字层（HTML 叠加，便于字体/换行/省略）：盖在底部文字框上 */}
        <div
          className="psy-serif absolute flex items-center justify-center text-center"
          style={{ left: '10%', right: '10%', top: '70.5%', height: '25%' }}
        >
          <p
            className="font-semibold leading-snug"
            style={{
              color: 'var(--psy-ink)',
              fontSize: locale === 'en' ? '8cqw' : '9cqw',
              display: '-webkit-box',
              WebkitLineClamp: 3,
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
