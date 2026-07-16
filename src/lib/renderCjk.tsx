import type { ReactNode } from 'react';

/**
 * 中文默认按「字符」换行，会把「預設」「保留」这类词拆成上下两行。
 * 用 Intl.Segmenter 分词后，把每个词包进 white-space:nowrap → 换行只发生在
 * 词与词之间，词内不再断开（词间仍可断，所以不会像 word-break:keep-all 那样
 * 整句冲出容器被裁切）。英文本就按空格断词，无需处理；无 Segmenter 的环境回退原串。
 */
export function renderCjk(text: string, locale: 'zh' | 'en' = 'zh'): ReactNode {
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
