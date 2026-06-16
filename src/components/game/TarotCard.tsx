'use client';

import { useState } from 'react';
import { Dimension } from '@/types';
import { DIMENSION_META } from '@/data/dimensions';

interface TarotCardProps {
  /** 繁中句（代码渲染） */
  text: string;
  /** 英文句 */
  textEn?: string;
  dimension?: Dimension;
  /** 单卡插图地址（方案C：每卡一图）。缺失时显示渐变占位，放进图即替换。 */
  imageSrc?: string;
  selected?: boolean;
  /** 揭示维度角标（作弊/查看模式） */
  revealedDimension?: Dimension | null;
  isDummy?: boolean;
  /** 语言：跟随用户选择（zh→中文卡，en→英文卡）。单语，不同时显示。 */
  locale?: 'zh' | 'en';
  /** 背面（对手手牌/牌堆）：只画框 + ◈，不露内容。 */
  faceDown?: boolean;
  /** 固定宽度(px)，高度按 2:3。与 fluid 二选一。默认 200。 */
  width?: number;
  /** 流式：填满父容器宽度（用于 4 列网格等响应式布局）。 */
  fluid?: boolean;
}

const GOLD = '#c89b5d';
const GOLD_LINE = 'rgba(207,167,112,0.62)';
const GOLD_FAINT = 'rgba(200,155,93,0.40)';

// 塔罗风卡面：CSS 金色双线框 + 拱形图窗(上) + 文字面板(下) + 状态叠加。
// 内部尺寸用容器查询单位 cqw（1cqw=卡宽的1%），所以固定宽或流式填充都能等比缩放、字号自适应。
// 图片只占上半窗、无边框；繁中/英文按 locale 单语渲染。小卡(compact/tiny)走 faceDown 或别处简版。
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
  width = 200,
  fluid = false,
}: TarotCardProps) {
  const [imgError, setImgError] = useState(false);
  const showImg = !!imageSrc && !imgError;
  const label = locale === 'en' ? (textEn ?? text) : text;

  // 外框尺寸：fluid → 填满父容器（aspect-ratio 锁 2:3）；否则固定 px。
  // container-type: inline-size 让内部 cqw 基于本卡宽度解析。
  const boxStyle: React.CSSProperties = fluid
    ? { width: '100%', aspectRatio: '2 / 3', containerType: 'inline-size' }
    : { width, height: width * 1.5, containerType: 'inline-size' };

  if (faceDown) {
    return (
      <div
        className="relative flex shrink-0 items-center justify-center"
        style={{
          ...boxStyle,
          borderRadius: '8.5cqw',
          background: 'linear-gradient(180deg, #19293c 0%, #0d1825 100%)',
          border: `1.5px solid ${GOLD_LINE}`,
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.03), 0 10px 22px rgba(0,0,0,0.34)',
        }}
      >
        <div className="pointer-events-none absolute" style={{ inset: '4cqw', borderRadius: '6cqw', border: `1px solid ${GOLD_FAINT}` }} />
        <span style={{ color: GOLD, fontSize: '22cqw', opacity: 0.6 }}>◈</span>
      </div>
    );
  }

  return (
    <div
      className="relative shrink-0 select-none"
      style={{
        ...boxStyle,
        borderRadius: '8.5cqw',
        padding: '3.5cqw',
        background: 'linear-gradient(180deg, #16243a 0%, #0e1a28 60%, #0a131e 100%)',
        border: `1.5px solid ${GOLD_LINE}`,
        boxShadow: selected
          ? `0 0 0 2px rgba(143,199,135,0.6), 0 18px 40px rgba(0,0,0,0.4)`
          : `inset 0 0 0 1px rgba(255,255,255,0.03), 0 16px 34px rgba(0,0,0,0.34)`,
        opacity: isDummy ? 0.92 : 1,
      }}
    >
      {/* 内圈金色细线 */}
      <div className="pointer-events-none absolute" style={{ inset: '2cqw', borderRadius: '7cqw', border: `1px solid ${GOLD_FAINT}` }} />

      {/* 顶部两角星点 */}
      <span className="pointer-events-none absolute" style={{ left: '7cqw', top: '5cqw', color: GOLD, opacity: 0.7, fontSize: '5cqw' }}>✦</span>
      <span className="pointer-events-none absolute" style={{ right: '7cqw', top: '5cqw', color: GOLD, opacity: 0.7, fontSize: '5cqw' }}>✦</span>

      <div className="relative flex h-full w-full flex-col" style={{ gap: '3cqw' }}>
        {/* 图窗（拱形顶）：占 ~56% */}
        <div
          className="relative w-full overflow-hidden"
          style={{
            flex: '0 0 56%',
            borderRadius: '22cqw 22cqw 5cqw 5cqw',
            boxShadow: `inset 0 0 0 1px ${GOLD_FAINT}`,
            background: showImg ? undefined : 'linear-gradient(160deg, #1c2c44 0%, #0f1c2b 100%)',
          }}
        >
          {showImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageSrc} alt="" onError={() => setImgError(true)} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span style={{ color: GOLD_FAINT, fontSize: '16cqw', opacity: 0.5 }}>◈</span>
            </div>
          )}
        </div>

        {/* 分隔线 + 中央菱形 */}
        <div className="flex items-center justify-center" style={{ gap: 4 }}>
          <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD_FAINT})` }} />
          <span style={{ color: GOLD, fontSize: '4.5cqw', opacity: 0.85 }}>◆</span>
          <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${GOLD_FAINT}, transparent)` }} />
        </div>

        {/* 文字面板：占剩余 ~40%，单语 */}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center text-center" style={{ padding: '0 4.5cqw' }}>
          <p
            className="psy-serif font-semibold leading-snug"
            style={{
              color: isDummy ? 'var(--psy-muted)' : 'var(--psy-ink)',
              fontSize: locale === 'en' ? '7.2cqw' : '8.8cqw',
              // 长英文(如 #28 共54字)兜底：超出面板就裁切省略，不溢出卡片
              display: '-webkit-box',
              WebkitLineClamp: 5,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {label}
          </p>
        </div>
      </div>

      {/* 揭示维度角标（右上） */}
      {revealedDimension && (
        <div className="absolute" style={{ right: '6cqw', top: '6cqw' }}>
          <span
            className="psy-serif inline-flex items-center gap-1 rounded-full font-semibold leading-none"
            style={{
              padding: '1.2cqw 3cqw',
              fontSize: '5cqw',
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
