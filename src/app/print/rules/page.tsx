import type { Metadata } from 'next';
import { RulesCard } from './RulesCard';

// 實體版規則卡：A4 硬卡紙雙面，正面繁中、背面英文。印前工具頁，不進搜尋引擎。
export const metadata: Metadata = { robots: { index: false, follow: false } };

// ?cols=2 → 兩欄版（字大一號）；預設一欄版（用戶 0916 要不分左右）
export default async function Page({ searchParams }: { searchParams: Promise<{ cols?: string }> }) {
  const { cols } = await searchParams;
  return <RulesCard cols={cols === '2' ? 2 : 1} />;
}
