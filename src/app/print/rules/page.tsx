import type { Metadata } from 'next';
import { RulesCard } from './RulesCard';

// 實體版規則卡：A4 硬卡紙雙面，正面繁中、背面英文。印前工具頁，不進搜尋引擎。
export const metadata: Metadata = { robots: { index: false, follow: false } };

// ?cols=2 → 兩欄版（字大一號）；預設一欄版（用戶 0916 要不分左右）
export default async function Page({ searchParams }: { searchParams: Promise<{ cols?: string; check?: string }> }) {
  const { cols, check } = await searchParams;
  return (
    <>
      <RulesCard cols={cols === '2' ? 2 : 1} />
      {/* ?check=1：量每一面內容底部離頁框線（距紙邊 5mm）還剩幾 mm，寫進 #chk。
          供 headless Chrome --dump-dom 讀，肉眼看低解析圖會把「壓線」看成「沒過線」。 */}
      {check === '1' && (
        <script
          dangerouslySetInnerHTML={{
            __html: `window.addEventListener('load',()=>document.fonts.ready.then(()=>{const mm=96/25.4;const r=[...document.querySelectorAll('.a4')].map((a,i)=>{const ab=a.getBoundingClientRect().bottom;let mx=0;a.querySelectorAll('.cols *').forEach(e=>{mx=Math.max(mx,e.getBoundingClientRect().bottom)});return 'side'+(i+1)+'='+((ab-5*mm-mx)/mm).toFixed(1)+'mm'});const p=document.createElement('pre');p.id='chk';p.textContent=r.join(' ');document.body.appendChild(p);}));`,
          }}
        />
      )}
    </>
  );
}
