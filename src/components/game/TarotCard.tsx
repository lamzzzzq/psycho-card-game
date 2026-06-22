'use client';

import { useState } from 'react';
import { Dimension } from '@/types';
import { DIMENSION_META } from '@/data/dimensions';
import { OrnateCard } from './OrnateCard';
import { ORNATE_FRAME } from './cardStyle';

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
  /** 知识牌(dummy)的一句话定义；提供时走「术语标题 + 定义正文」纯文字版式，无图窗。 */
  description?: string;
}

const GOLD = '#c89b5d';
const GOLD_LINE = 'rgba(207,167,112,0.62)';
const GOLD_FAINT = 'rgba(200,155,93,0.40)';

// 中文默认按「字符」换行，会把「概念」拆成上下两行。用 Intl.Segmenter 分词后，
// 把每个词包进 white-space:nowrap → 换行只发生在词与词之间，词内不再断开。
// 英文本就按空格断词，无需处理；无 Segmenter 的环境回退为原字符串。
function renderLabel(text: string, locale: 'zh' | 'en'): React.ReactNode {
  if (locale === 'en' || typeof Intl === 'undefined' || !('Segmenter' in Intl)) return text;
  const seg = new Intl.Segmenter('zh', { granularity: 'word' });
  return Array.from(seg.segment(text)).map((p, i) =>
    p.isWordLike ? (
      <span key={i} style={{ whiteSpace: 'nowrap' }}>{p.segment}</span>
    ) : (
      <span key={i}>{p.segment}</span>
    ),
  );
}

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
  description,
}: TarotCardProps) {
  const [imgError, setImgError] = useState(false);

  // 装饰版总开关：开 → 委托给 OrnateCard（拱形+纹章+底框）；关 → 走下方无装饰现版。
  // （hook 已在上面声明，故此处条件 return 不违反 hook 规则。）
  if (ORNATE_FRAME) {
    return (
      <OrnateCard
        text={text} textEn={textEn} dimension={dimension} imageSrc={imageSrc}
        selected={selected} revealedDimension={revealedDimension} isDummy={isDummy}
        locale={locale} faceDown={faceDown} onClick={onClick} width={width} fluid={fluid} description={description}
      />
    );
  }

  const showImg = !!imageSrc && !imgError;
  // 知识牌(dummy)：有定义则走纯文字版式（术语标题 + 定义正文，无图窗）。
  const isKnowledge = isDummy && !!description;
  // 术语按「最长单词」缩放（保证整词放得下、绝不从词中间断）；定义按总长缩放，最长也不裁切。
  const longestWord = Math.max(1, ...text.split(/[\s-]+/).filter(Boolean).map((w) => w.length));
  const termFont = Math.max(7.5, Math.min(13, 118 / longestWord));
  const defLen = (description ?? '').length;
  const defFont = defLen > 72 ? 7 : defLen > 56 ? 7.8 : 8.5;
  const defClamp = defLen > 72 ? 7 : 6;
  // 全卡统一 4:7（高/宽≈1.75）：图窗占 60% + 文字占剩余。手牌和看大图场景同一比例，
  // 不再用细长 1:2（太瘦不好看）。
  const cardAspect = '4 / 7';
  // 卡面去掉句尾标点（。/.）——句号会影响排版换行。
  const label = (locale === 'en' ? (textEn ?? text) : text).replace(/[。．.\s]+$/, '');

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
            aspectRatio: cardAspect,
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
          aspectRatio: cardAspect,
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

        {isKnowledge ? (
          /* 知识牌：纯文字版式 —— 术语标题(大) + 分隔 + 定义正文(放大)，上下铺开，无眉标/无图窗 */
          <div className="relative flex h-full w-full flex-col items-center justify-evenly text-center" style={{ padding: '5cqw 2cqw' }}>
            <p
              className="psy-serif font-semibold"
              style={{
                color: 'var(--psy-ink)', fontSize: `${termFont}cqw`, lineHeight: 1.3, paddingBottom: '1.5cqw',
                display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}
            >
              {text}
            </p>
            <div className="flex items-center justify-center" style={{ gap: '2cqw', width: '70%' }}>
              <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, transparent, ${GOLD_FAINT})` }} />
              <span style={{ color: GOLD, fontSize: '4.5cqw', opacity: 0.85 }}>◆</span>
              <span style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${GOLD_FAINT}, transparent)` }} />
            </div>
            <p
              style={{
                color: 'var(--psy-muted)', fontSize: `${defFont}cqw`, lineHeight: 1.34,
                display: '-webkit-box', WebkitLineClamp: defClamp, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}
            >
              {description}
            </p>
          </div>
        ) : (
        <div className="relative flex h-full w-full flex-col" style={{ gap: '2.5cqw' }}>
          {/* 图片窗：占卡片高度 60%，圆角矩形 */}
          <div
            className="relative w-full overflow-hidden"
            style={{
              flex: '0 0 60%',
              minHeight: 0,
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

          {/* 文字面板：占图窗以外的剩余高度 */}
          <div
            className="flex min-h-0 flex-1 items-center justify-center text-center"
            style={{ padding: '0 3cqw' }}
          >
            <p
              className="psy-serif font-semibold leading-snug"
              style={{
                color: isDummy ? 'var(--psy-muted)' : 'var(--psy-ink)',
                fontSize: locale === 'en' ? '9.5cqw' : '10.5cqw',
                display: '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {renderLabel(label, locale)}
            </p>
          </div>
        </div>
        )}

        {/* 揭示维度角标：实心金底 + 深色字，放大，居中压在图窗底部。字号按名字长度自适应。 */}
        {revealedDimension && (() => {
          const meta = DIMENSION_META[revealedDimension];
          const dimLabel = locale === 'en' ? meta.nameEn : meta.name;
          const dimFont = dimLabel.length > 14 ? 5.8 : dimLabel.length > 9 ? 7 : 8.2;
          return (
            <div className="absolute z-20" style={{ left: '50%', top: '60%', transform: 'translate(-50%,-50%)', maxWidth: '95%' }}>
              <span
                className="psy-serif inline-flex items-center rounded-full font-bold uppercase leading-none whitespace-nowrap"
                style={{
                  padding: '2.6cqw 6cqw', fontSize: `${dimFont}cqw`, letterSpacing: '0.06em',
                  background: meta.colorHex, color: '#0a0a0a',
                  border: '1.5px solid rgba(0,0,0,0.4)', boxShadow: '0 0.5cqw 1.6cqw rgba(0,0,0,0.55)',
                }}
              >
                {dimLabel}
              </span>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
