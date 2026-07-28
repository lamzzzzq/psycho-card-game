/**
 * 人格题面必须完整呈现，不能用省略号截断。
 * 卡片以 container query width（cqw）缩放，所以字号也按卡宽度计算；英文通常需要
 * 更多行，中文的词组不拆字，分别按实际文本长度收紧。
 */
export function getStatementTextLayout(label: string, locale: 'zh' | 'en') {
  const length = Array.from(label).length;

  if (locale === 'en') {
    if (length >= 80) return { fontSize: '6.8cqw', lineHeight: 1.16 };
    if (length >= 70) return { fontSize: '7.2cqw', lineHeight: 1.17 };
    if (length >= 58) return { fontSize: '7.75cqw', lineHeight: 1.18 };
    if (length >= 46) return { fontSize: '8.35cqw', lineHeight: 1.19 };
    return { fontSize: '9cqw', lineHeight: 1.2 };
  }

  if (length >= 38) return { fontSize: '8.1cqw', lineHeight: 1.16 };
  if (length >= 33) return { fontSize: '8.5cqw', lineHeight: 1.17 };
  if (length >= 27) return { fontSize: '8.9cqw', lineHeight: 1.18 };
  return { fontSize: '9.5cqw', lineHeight: 1.2 };
}
