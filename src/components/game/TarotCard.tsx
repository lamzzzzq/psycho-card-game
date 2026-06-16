'use client';

import { useState } from 'react';
import { Dimension } from '@/types';
import { DIMENSION_META } from '@/data/dimensions';

interface TarotCardProps {
  text: string;
  textEn?: string;
  dimension?: Dimension;
  imageSrc?: string;
  selected?: boolean;
  revealedDimension?: Dimension | null;
  isDummy?: boolean;
  locale?: 'zh' | 'en';
  faceDown?: boolean;
  onClick?: () => void;
  /** 固定宽度(px)。与 fluid 二选一。默认 200。 */
  width?: number;
  /** 流式：填满父容器宽度（4 列网格等）。 */
  fluid?: boolean;
}

const GOLD = '#c89b5d';
const GOLD_LINE = 'rgba(207,167,112,0.62)';
const GOLD_FAINT = 'rgba(200,155,93,0.40)';

// 塔罗风卡面：圆角矩形金框 + 图片窗(上) + 文字(下)。
// ⚠️ 外层 wrapper 设 container-type，卡片本体用 cqw → 全部按「卡片宽度」解析
//    （若把 container-type 设在卡片本体，其自身的 cqw 会按祖先容器算 → 椭圆 bug）。
export function TarotCard({
  text,
  textEn,
  dimension,
  imageSrc,
  selected = false,
  revealedDimension = null,
  isDummy = false,
  locale = 'zh',
  faceDown = false,
  onClick,
  width = 200,
  fluid = false,
}: TarotCardProps) {
  const [imgError, setImgError] = useState(false);
  const showImg = !!imageSrc && !imgError;
  const label = locale === 'en' ? (textEn ?? text) : text;

  // 外层容器：建立 cqw 基准 = 卡片宽度。
  const wrapperStyle: React.CSSProperties = {
    containerType: 'inline-size',
    width: fluid ? '100%' : width,
  };

  if (faceDown) {
    return (
      <div className="shrink-0" style={wrapperStyle}>
        <div
          className="relative flex w-full items-center justify-center"
          style={{
            aspectRatio: '2 / 3',
            borderRadius: '7cqw',
            background: 'linear-gradient(180deg, #19293c 0%, #0d1825 100%)',
            border: `1.5px solid ${GOLD_LINE}`,
            boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.03), 0 10px 22px rgba(0,0,0,0.34)',
          }}
        >
          <div className="pointer-events-none absolute" style={{ inset: '4cqw', borderRadius: '5cqw', border: `1px solid ${GOLD_FAINT}` }} />
          <span style={{ color: GOLD, fontSize: '22cqw', opacity: 0.6 }}>◈</span>
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0" style={wrapperStyle}>
      <div
        onClick={onClick}
        className={`relative w-full select-none ${onClick ? 'cursor-pointer transition-transform hover:-translate-y-1' : ''}`}
        style={{
          aspectRatio: '2 / 3',
          borderRadius: '7cqw',
          padding: '4cqw',
          background: 'linear-gradient(180deg, #16243a 0%, #0e1a28 60%, #0a131e 100%)',
          border: `1.5px solid ${GOLD_LINE}`,
          boxShadow: selected
            ? `0 0 0 2px rgba(143,199,135,0.7), 0 18px 40px rgba(0,0,0,0.4)`
            : `inset 0 0 0 1px rgba(255,255,255,0.03), 0 16px 34px rgba(0,0,0,0.34)`,
          opacity: isDummy ? 0.92 : 1,
        }}
      >
        {/* 内圈金色细线（圆角矩形） */}
        <div className="pointer-events-none absolute" style={{ inset: '2.2cqw', borderRadius: '5.5cqw', border: `1px solid ${GOLD_FAINT}` }} />

        {/* 顶角星点 */}
        <span className="pointer-events-none absolute" style={{ left: '7cqw', top: '5.5cqw', color: GOLD, opacity: 0.7, fontSize: '5cqw' }}>✦</span>
        <span className="pointer-events-none absolute" style={{ right: '7cqw', top: '5.5cqw', color: GOLD, opacity: 0.7, fontSize: '5cqw' }}>✦</span>

        <div className="relative flex h-full w-full flex-col" style={{ gap: '2.5cqw' }}>
          {/* 图片窗：占 60%，圆角矩形 */}
          <div
            className="relative w-full overflow-hidden"
            style={{
              flex: '0 0 60%',
              borderRadius: '5cqw',
              boxShadow: `inset 0 0 0 1px ${GOLD_FAINT}`,
              background: showImg ? undefined : 'linear-gradient(160deg, #1c2c44 0%, #0f1c2b 100%)',
            }}
          >
            {showImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageSrc} alt="" onError={() => setImgError(true)} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <span style={{ color: GOLD_FAINT, fontSize: '20cqw', opacity: 0.45 }}>◈</span>
              </div>
            )}
          </div>

          {/* 分隔线 + 菱形 */}
          <div className="flex items-center justify-center" style={{ gap: '2cqw' }}>
            <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD_FAINT})` }} />
            <span style={{ color: GOLD, fontSize: '4.5cqw', opacity: 0.85 }}>◆</span>
            <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${GOLD_FAINT}, transparent)` }} />
          </div>

          {/* 文字面板：单语，占剩余 */}
          <div className="flex min-h-0 flex-1 items-center justify-center text-center" style={{ padding: '0 3cqw' }}>
            <p
              className="psy-serif font-semibold leading-snug"
              style={{
                color: isDummy ? 'var(--psy-muted)' : 'var(--psy-ink)',
                fontSize: locale === 'en' ? '8.5cqw' : '10.5cqw',
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

        {/* 揭示维度角标 */}
        {revealedDimension && (
          <div className="absolute" style={{ right: '6cqw', top: '6cqw' }}>
            <span
              className="psy-serif inline-flex items-center rounded-full font-semibold leading-none"
              style={{
                padding: '1.5cqw 3cqw',
                fontSize: '5cqw',
                backgroundColor: DIMENSION_META[revealedDimension].colorHex + '33',
                color: DIMENSION_META[revealedDimension].colorHex,
                border: `1px solid ${DIMENSION_META[revealedDimension].colorHex}55`,
              }}
            >
              {locale === 'en' ? DIMENSION_META[revealedDimension].nameEn : DIMENSION_META[revealedDimension].name}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
