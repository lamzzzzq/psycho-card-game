import type { Metadata } from 'next';
import { RulesCard } from './RulesCard';

// 實體版規則卡：A4 硬卡紙雙面，正面繁中、背面英文。印前工具頁，不進搜尋引擎。
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function Page() {
  return <RulesCard />;
}
