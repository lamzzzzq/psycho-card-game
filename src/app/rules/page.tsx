'use client';

import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';

const GAME_URL = 'https://psycho-card-game.vercel.app';

// A4 硬拷貝規則頁。淺色紙張主題（便於列印），@media print 隱藏螢幕用按鈕。
// ⚠️ 規則文案為佔位準確版，最終牌面/文案準備好後可替換。
export default function RulesPage() {
  const router = useRouter();

  return (
    <div className="rules-screen">
      <style>{`
        .rules-screen {
          min-height: 100vh;
          background: #4a4a52;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 24px 16px 64px;
          gap: 16px;
        }
        .rules-toolbar {
          width: 210mm;
          max-width: 100%;
          display: flex;
          justify-content: space-between;
          gap: 8px;
        }
        .rules-btn {
          font-family: ui-serif, Georgia, serif;
          font-size: 14px;
          padding: 8px 18px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.35);
          background: rgba(255,255,255,0.08);
          color: #f3ede1;
          cursor: pointer;
        }
        .rules-btn-primary {
          background: linear-gradient(180deg, #c89b5d, #a87f43);
          color: #20170c;
          border-color: #c89b5d;
          font-weight: 600;
        }
        .a4 {
          width: 210mm;
          min-height: 297mm;
          max-width: 100%;
          background: #fbf8f1;
          color: #2a241b;
          box-shadow: 0 12px 40px rgba(0,0,0,0.35);
          padding: 16mm 15mm;
          box-sizing: border-box;
          font-family: ui-sans-serif, "PingFang TC", "Microsoft JhengHei", system-ui, sans-serif;
          line-height: 1.6;
        }
        .a4 .serif { font-family: ui-serif, "Songti TC", Georgia, serif; }
        .a4 h1 { font-size: 30px; margin: 0; letter-spacing: 2px; color: #1c1812; }
        .a4 h2 {
          font-size: 17px; margin: 20px 0 8px; color: #7a4d12;
          border-bottom: 1px solid #d8c39a; padding-bottom: 4px; letter-spacing: 1px;
        }
        .a4 p, .a4 li { font-size: 12.5px; margin: 4px 0; }
        .a4 ul { margin: 4px 0; padding-left: 18px; }
        .a4 .sub { font-size: 12px; color: #6b5d44; }
        .a4 .warn { color: #a23b1e; }
        .a4 .accent { color: #7a4d12; font-weight: 600; }
        .head {
          display: flex; justify-content: space-between; align-items: flex-start;
          border-bottom: 2px solid #c89b5d; padding-bottom: 12px;
        }
        .qrbox { text-align: center; }
        .qrbox .cap { font-size: 10px; color: #6b5d44; margin-top: 4px; }
        .dims { display: flex; gap: 6px; flex-wrap: wrap; margin: 6px 0; }
        .dim {
          border: 1px solid #c9b48a; border-radius: 8px; padding: 6px 8px;
          font-size: 11px; background: #fff; min-width: 86px;
        }
        .dim b { color: #7a4d12; }
        .flow { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 12px; }
        .chip { border: 1px solid #c9b48a; border-radius: 999px; padding: 3px 12px; background:#fff; }
        .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 0 24px; }
        @media print {
          .no-print { display: none !important; }
          .rules-screen { background: #fff; padding: 0; }
          .a4 { box-shadow: none; width: auto; min-height: auto; }
          @page { size: A4; margin: 12mm; }
        }
      `}</style>

      <div className="rules-toolbar no-print">
        <button className="rules-btn" onClick={() => router.push('/tutorial')}>← 返回教學</button>
        <button className="rules-btn rules-btn-primary" onClick={() => window.print()}>🖨 列印 / 存 PDF</button>
      </div>

      <div className="a4">
        <div className="head">
          <div>
            <p className="serif" style={{ fontSize: 12, letterSpacing: 6, color: '#7a4d12', margin: 0 }}>PSYCHO CARD</p>
            <h1 className="serif">人格麻將 · 遊戲規則</h1>
            <p className="sub" style={{ marginTop: 6 }}>用卡牌拼出你的人格 — Big Five 五大人格 × 麻將玩法</p>
          </div>
          <div className="qrbox">
            <QRCodeSVG value={GAME_URL} size={96} level="M" fgColor="#2a241b" bgColor="#fbf8f1" />
            <div className="cap">掃碼進入遊戲<br />{GAME_URL.replace('https://', '')}</div>
          </div>
        </div>

        <h2>一、遊戲目標</h2>
        <p>
          每位玩家先完成 <span className="accent">Big Five 人格測評</span>，得到五個維度的分數：
          開放性 <b>O</b>、盡責性 <b>C</b>、外向性 <b>E</b>、宜人性 <b>A</b>、情緒穩定性 <b>N</b>。
        </p>
        <p>
          遊戲目標是<span className="accent">集齊全部五個維度</span>。每個維度需要的牌數 = 你在該維度的分數
          （例如外向性 4 分，就要湊 4 張外向牌）。最先湊齊全部五維者「<span className="accent">食胡</span>」獲勝。
        </p>
        <div className="dims">
          <div className="dim"><b>O</b> 開放性</div>
          <div className="dim"><b>C</b> 盡責性</div>
          <div className="dim"><b>E</b> 外向性</div>
          <div className="dim"><b>A</b> 宜人性</div>
          <div className="dim"><b>N</b> 情緒穩定性</div>
        </div>

        <h2>二、開局</h2>
        <ul>
          <li>每人依自己的人格分數發一手牌（分數越高，起手牌越多）。</li>
          <li>桌面中央為<b>抽牌堆</b>；打出的牌進入<b>棄牌堆</b>（抽牌堆摸完會把棄牌堆洗回，牌不會用盡）。</li>
          <li>牌庫含少量「<b>知識牌</b>」，見第六節。</li>
        </ul>

        <h2>三、每回合流程</h2>
        <div className="flow">
          <span className="chip">① 從抽牌堆摸 1 張</span>
          <span>→</span>
          <span className="chip">② 從手牌打出 1 張</span>
          <span>→</span>
          <span className="sub">輪到下一位（順時針）</span>
        </div>

        <div className="cols">
          <div>
            <h2>四、碰（搶牌）</h2>
            <p>當有人打出一張人格牌，若你手上有<b>同維度</b>的牌、加上這張剛好<b>湊滿該維度所需張數</b>，可宣告「碰」：</p>
            <ul>
              <li>把這組牌<b>歸檔</b>，並立刻搶到出牌權（不用摸牌，直接打一張）。</li>
              <li>自己回合也能用手牌湊齊宣告（<b>自摸碰</b>），每回合限一次。</li>
              <li className="warn">⚠ 張數必須剛好、且全為同維度。張數錯／維度錯／碰已歸檔的維度 → 失敗受罰。</li>
            </ul>
          </div>
          <div>
            <h2>五、食胡與失敗懲罰</h2>
            <p><b>食胡：</b>當手牌能<b>一次湊齊所有尚未歸檔的維度</b> → 宣告胡牌，立即獲勝。</p>
            <p><b>失敗懲罰（罰停）：</b>碰或胡宣告失敗時——</p>
            <ul>
              <li><b>罰停：</b>接下來兩個輪到你的回合被跳過，期間不能碰／胡／搶牌，直到你重新出一次牌才解禁。</li>
              <li><b>亮牌：</b>碰失敗只亮出你押錯的牌；胡失敗亮出整手牌。</li>
            </ul>
            <p className="warn">→ 想清楚再宣告，賭錯代價很大。</p>
          </div>
        </div>

        <div className="cols">
          <div>
            <h2>六、知識牌</h2>
            <p>牌庫中有少量知識牌（上面是心理學小知識）。它<b>不屬於任何維度</b>、不能用來湊牌。打出知識牌<b>不會觸發別人搶牌</b>（安全棄牌）。數量很少，偶爾摸到、打掉即可。</p>
          </div>
          <div>
            <h2>七、勝負與計分</h2>
            <ul>
              <li>有人食胡 → 該玩家直接獲勝。</li>
              <li>打滿約定輪數仍無人胡 → 按<b>已歸檔維度數</b>排名，多者勝；同數則比<b>剩餘手牌少</b>者勝。</li>
            </ul>
          </div>
        </div>

        <p className="sub" style={{ marginTop: 18, textAlign: 'center', borderTop: '1px solid #d8c39a', paddingTop: 8 }}>
          掃描頁首 QR code 即可開始 · {GAME_URL.replace('https://', '')}
        </p>
      </div>
    </div>
  );
}
