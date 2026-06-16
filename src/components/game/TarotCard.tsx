'use client';

import { useState } from 'react';
import { Dimension } from '@/types';
import { DIMENSION_META } from '@/data/dimensions';

interface TarotCardProps {
  /** 繁中主句（玩法信息，代码渲染） */
  text: string;
  /** 英文副句（双语；不传则只显示中文） */
  textEn?: string;
  dimension?: Dimension;
  /** 单卡插图地址（方案C：每卡一图）。缺失时显示渐变占位，放进图即替换。 */
  imageSrc?: string;
  selected?: boolean;
  /** 揭示维度角标（作弊/查看模式） */
  revealedDimension?: Dimension | null;
  isDummy?: boolean;
  /** 显示英文副句 */
  bilingual?: boolean;
  /** 卡牌宽度(px)，高度按 2:3。默认 200。 */
  width?: number;
}

const GOLD = '#c89b5d';
const GOLD_LINE = 'rgba(207,167,112,0.62)';
const GOLD_FAINT = 'rgba(200,155,93,0.40)';

// 塔罗风卡面：CSS 金色双线框 + 拱形图窗（上） + 文字面板（下）+ 状态叠加。
// 图片只占上半窗、无边框；繁中/英文由代码渲染。小卡(compact/tiny)不显示图，另走简版。
export function TarotCard({
  text,
  textEn,
  dimension,
  imageSrc,
  selected = false,
  revealedDimension = null,
  isDummy = false,
  bilingual = true,
  width = 200,
}: TarotCardProps) {
  const [imgError, setImgError] = useState(false);
  const showImg = !!imageSrc && !imgError;
  const height = width * 1.5;

  return (
    <div
      className="relative select-none"
      style={{
        width,
        height,
        borderRadius: width * 0.085,
        padding: Math.round(width * 0.035),
        background: 'linear-gradient(180deg, #16243a 0%, #0e1a28 60%, #0a131e 100%)',
        border: `1.5px solid ${GOLD_LINE}`,
        boxShadow: selected
          ? `0 0 0 2px rgba(143,199,135,0.6), 0 18px 40px rgba(0,0,0,0.4)`
          : `inset 0 0 0 1px rgba(255,255,255,0.03), 0 16px 34px rgba(0,0,0,0.34)`,
        opacity: isDummy ? 0.92 : 1,
      }}
    >
      {/* 内圈金色细线（双线框第二条） */}
      <div
        className="pointer-events-none absolute"
        style={{
          inset: Math.round(width * 0.02),
          borderRadius: width * 0.07,
          border: `1px solid ${GOLD_FAINT}`,
        }}
      />

      {/* 顶部两角星点 */}
      <span className="pointer-events-none absolute text-[10px]" style={{ left: width * 0.07, top: width * 0.05, color: GOLD, opacity: 0.7 }}>✦</span>
      <span className="pointer-events-none absolute text-[10px]" style={{ right: width * 0.07, top: width * 0.05, color: GOLD, opacity: 0.7 }}>✦</span>

      <div className="relative flex h-full w-full flex-col" style={{ gap: Math.round(width * 0.03) }}>
        {/* ── 图窗（拱形顶）：占 ~56% ── */}
        <div
          className="relative w-full overflow-hidden"
          style={{
            flex: '0 0 56%',
            borderRadius: `${width * 0.22}px ${width * 0.22}px ${width * 0.05}px ${width * 0.05}px`,
            boxShadow: `inset 0 0 0 1px ${GOLD_FAINT}`,
            background: showImg ? undefined : 'linear-gradient(160deg, #1c2c44 0%, #0f1c2b 100%)',
          }}
        >
          {showImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              alt=""
              onError={() => setImgError(true)}
              className="h-full w-full object-cover"
            />
          ) : (
            // 渐变占位：放进图即替换
            <div className="flex h-full w-full items-center justify-center">
              <span style={{ color: GOLD_FAINT, fontSize: width * 0.16, opacity: 0.5 }}>◈</span>
            </div>
          )}
        </div>

        {/* ── 分隔线 + 中央菱形 ── */}
        <div className="flex items-center justify-center" style={{ gap: 4 }}>
          <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD_FAINT})` }} />
          <span style={{ color: GOLD, fontSize: width * 0.045, opacity: 0.85 }}>◆</span>
          <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${GOLD_FAINT}, transparent)` }} />
        </div>

        {/* ── 文字面板：占剩余 ~40% ── */}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center" style={{ padding: `0 ${width * 0.04}px` }}>
          <p
            className="psy-serif font-semibold leading-snug"
            style={{ color: isDummy ? 'var(--psy-muted)' : 'var(--psy-ink)', fontSize: width * 0.075 }}
          >
            {text}
          </p>
          {bilingual && textEn && (
            <p
              className="leading-tight"
              style={{ color: 'var(--psy-muted)', fontSize: width * 0.052, marginTop: width * 0.02 }}
            >
              {textEn}
            </p>
          )}
        </div>
      </div>

      {/* 揭示维度角标（右上） */}
      {revealedDimension && (
        <div className="absolute" style={{ right: width * 0.06, top: width * 0.06 }}>
          <span
            className="psy-serif inline-flex items-center gap-1 rounded-full font-semibold leading-none"
            style={{
              padding: `${width * 0.012}px ${width * 0.03}px`,
              fontSize: width * 0.05,
              backgroundColor: DIMENSION_META[revealedDimension].colorHex + '33',
              color: DIMENSION_META[revealedDimension].colorHex,
              border: `1px solid ${DIMENSION_META[revealedDimension].colorHex}55`,
            }}
          >
            {DIMENSION_META[revealedDimension].name}
          </span>
        </div>
      )}
    </div>
  );
}
