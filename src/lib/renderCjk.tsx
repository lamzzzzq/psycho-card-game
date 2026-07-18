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

/**
 * 標點短語換行：把整句按中文標點（、，。！？；：）切成短語，每個短語包成
 * white-space:nowrap，因此換行只發生在標點之後、絕不會在詞中間斷開。
 * 用於精修過的固定文案（如首頁副標題），比逐詞分詞更可靠（不受分詞字典影響，
 * 例如「牌桌」不會被拆成「牌／桌上」）。短語本身較短，不會像整句 nowrap 那樣溢出裁切。
 */
export function renderCjkPhrases(text: string, locale: 'zh' | 'en' = 'zh'): ReactNode {
  if (locale === 'en') return text;
  const parts = text.match(/[^、，。！？；：]+[、，。！？；：]*/g) ?? [text];
  return parts.map((p, i) => (
    <span key={i} style={{ whiteSpace: 'nowrap' }}>{p}</span>
  ));
}

/**
 * 正文按正常中文換行（逐字，永不孤行），只把指定的關鍵詞包成 nowrap 防止拆開。
 * 用於較長的副標題：整句/整短語 nowrap 在窄屏會把短句擠成孤行（如「把人格測評、」
 * 獨佔一行），而純逐字換行又可能把「自己」「牌桌」拆到兩行。此法兩者兼顧：
 * 正文可在任意字換行填滿每一行，只有列表中的詞受保護。terms 需按出現順序無重疊。
 */
export function renderCjkKeep(
  text: string,
  terms: string[],
  locale: 'zh' | 'en' = 'zh',
): ReactNode {
  if (locale === 'en' || terms.length === 0) return text;
  const esc = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(${esc.join('|')})`, 'g');
  return text.split(re).map((seg, i) =>
    i % 2 === 1 ? (
      <span key={i} style={{ whiteSpace: 'nowrap' }}>{seg}</span>
    ) : (
      seg
    ),
  );
}
