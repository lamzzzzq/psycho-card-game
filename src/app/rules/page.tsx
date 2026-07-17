'use client';

import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { useLocaleStore } from '@/lib/i18n';
import { useHydrated } from '@/stores/useHydration';
import { RULES_T, type RuleBlock } from '@/lib/i18n/rules';

const GAME_URL = 'https://www.personalitiesmahjong.com/';
const DISPLAY_URL = 'www.personalitiesmahjong.com';

// 規則頁：螢幕上是一張正常的長文檔（不縮放、不裁切、可滾動）；
// 只有列印 / 存 PDF 時 @media print 才把它排成真 A4（自然 2 頁）。
// 規則正文逐字照跟 big5_revised rules docx；emoji / 配圖自由發揮。
export default function RulesPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const localeRaw = useLocaleStore((s) => s.locale);
  const locale = hydrated ? localeRaw : 'zh';
  const s = RULES_T[locale];

  // 單個內容區塊 → JSX
  const renderBlock = (b: RuleBlock, i: number) => {
    switch (b.t) {
      case 'sub':
        return <p key={i} className="rsub">{b.text}</p>;
      case 'li':
        return (
          <p key={i} className="rli">
            <span className="rli-dot">・</span>
            <span>{b.text}</span>
          </p>
        );
      case 'warn':
        return <p key={i} className="warn">{b.text}</p>;
      case 'tip':
        return <p key={i} className="tip">💡 {b.text}</p>;
      default:
        return <p key={i}>{b.text}</p>;
    }
  };

  // 章節配圖
  const renderFig = (fig: string | undefined) => {
    if (fig === 'goal') {
      return (
        <>
          <div className="dims">
            <div className="dim"><b>O</b> {s.dimO}</div>
            <div className="dim"><b>C</b> {s.dimC}</div>
            <div className="dim"><b>E</b> {s.dimE}</div>
            <div className="dim"><b>A</b> {s.dimA}</div>
            <div className="dim"><b>N</b> {s.dimN}</div>
          </div>
          <div className="fig">
            {([['O', 3], ['C', 4], ['E', 2], ['A', 5], ['N', 4]] as const).map(([d, n]) => (
              <span key={d} className="fig-pill">{d} {n}</span>
            ))}
            <span className="fig-op">→</span>
            <span style={{ fontSize: 20 }}>🏆</span>
          </div>
          <div className="fig-cap">{s.figGoalCap}</div>
        </>
      );
    }
    if (fig === 'flow') {
      return (
        <div className="fig">
          <span className="chip">{s.figFlowDraw}</span>
          <span className="fig-op">→</span>
          <span className="chip">{s.figFlowDiscard}</span>
          <span className="fig-op">→</span>
          <span className="fig-grp">
            <span style={{ fontSize: 18 }}>👀</span>
            <small>{s.figFlowWindow}</small>
          </span>
        </div>
      );
    }
    if (fig === 'pong') {
      return (
        <>
          <div className="fig">
            <span className="fig-grp">
              <span style={{ display: 'inline-flex', gap: 3 }}>
                <span className="fig-card">E</span><span className="fig-card">E</span>
              </span>
              <small>{s.figHand}（2）</small>
            </span>
            <span className="fig-op">+</span>
            <span className="fig-grp">
              <span className="fig-card">E</span>
              <small>{s.figIncoming}（1）</small>
            </span>
            <span className="fig-op">=</span>
            <span className="fig-grp">
              <span className="fig-set">E E E <span className="fig-num">3</span></span>
              <small>✓ {s.figLocked}</small>
            </span>
          </div>
          <div className="fig-cap">{s.figPongCap}</div>
        </>
      );
    }
    return null;
  };

  return (
    <div className="rules-screen">
      <style>{`
        .rules-screen {
          min-height: 100vh;
          background: #4a4a52;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 18px 12px 56px;
          gap: 14px;
        }
        .rules-toolbar {
          width: 100%;
          max-width: 210mm;
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

        /* 螢幕：a4 是一張正常長文檔(桌面≈A4寬、手機滿寬自適應、可滾動、不縮放不裁切) */
        .a4-fit { width: 100%; max-width: 210mm; }
        .a4 {
          position: relative;
          width: 100%;
          background: #fbf8f1;
          color: #2a241b;
          box-shadow: 0 12px 40px rgba(0,0,0,0.35);
          padding: 9mm 9mm 11mm;
          box-sizing: border-box;
          /* 拉丁字體打頭、中文字體回退：英文標點(連字符/破折號/撇號)用正確的拉丁字形，
             中文字自動落到 PingFang，不再出現又高又寬的中文標點。 */
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, "PingFang TC", "PingFang SC", "Microsoft JhengHei", "Noto Sans SC", sans-serif;
          line-height: 1.55;
        }
        .a4 .serif { font-family: ui-serif, Georgia, "Songti TC", "Songti SC", serif; }

        /* 頁首：flex — 標題+副標左上角，QR+網址右上角(貼右邊)。align-items:flex-start
           讓頁首高度包住較高的 QR 塊，網址永遠在分割線「上方」，不會掉到線下。 */
        .head {
          display: flex; justify-content: space-between; align-items: flex-start; gap: 20px;
          border-bottom: 2px solid #c89b5d; padding-bottom: 12px; margin-bottom: 16px;
        }
        .title-wrap { min-width: 0; }
        /* flex column + align-items:flex-end 強制 QR 與網址都貼右邊(text-align 對 svg 不生效) */
        .qrbox { flex: none; display: flex; flex-direction: column; align-items: flex-end; }
        .qrbox .cap { font-size: 10px; color: #6b5d44; margin-top: 3px; line-height: 1.3; text-align: right; }
        .a4 h1.rtitle { margin: 2px 0 0; display: flex; flex-wrap: wrap; align-items: baseline; gap: 2px 12px; }
        .rtitle .rt-main { font-size: 30px; letter-spacing: 2px; color: #1c1812; line-height: 1.1; white-space: nowrap; }
        .rtitle .rt-sub { font-size: 19px; letter-spacing: 1px; color: #6b5d44; white-space: nowrap; line-height: 1.1; }
        /* 手機:標題固定兩行(主一行、副一行);主標字號調小、允許換行兜底,QR 縮小給標題騰空間,避免英文長標題蓋到 QR */
        @media (max-width: 640px) {
          .rtitle { flex-direction: column; align-items: flex-start; gap: 3px; }
          .rtitle .rt-main { font-size: 21px; white-space: normal; }
          .rtitle .rt-sub { font-size: 14px; white-space: normal; }
          .qrbox svg { width: 52px !important; height: 52px !important; }
          /* 配圖在手機也擠成一行(縮小卡片/字號/間距 + 不換行)。僅螢幕預覽,列印 A4 不受影響 */
          .fig { flex-wrap: nowrap; gap: 4px; padding: 8px 6px; }
          .fig-card { width: 20px; height: 28px; font-size: 10px; }
          .fig-set { padding: 3px 5px; gap: 4px; letter-spacing: 1px; }
          .fig-num { padding: 0 4px; font-size: 9.5px; }
          .fig-grp { gap: 2px; }
          .fig-grp small { font-size: 8px; }
          .fig-op { font-size: 11px; }
          .fig .chip, .chip { padding: 3px 7px; font-size: 10px; }
          .fig-pill { padding: 2px 5px; font-size: 10px; gap: 2px; }
          .fig-cap { font-size: 9px; }
        }

        /* 章節：單欄，節間拉開間距填滿版面 */
        .sections { margin-top: 2px; }
        .rsec { margin: 0 0 12px; }
        .rsec h2 {
          font-size: 17px; margin: 8px 0 6px; color: #7a4d12;
          border-bottom: 1px solid #d8c39a; padding-bottom: 5px; letter-spacing: 0.5px;
        }
        .a4 .rsec p { font-size: 13px; margin: 4px 0; line-height: 1.5; }
        .rsub { font-weight: 700; color: #3a2f1c; margin-top: 7px !important; font-size: 13.5px !important; }
        .rli { display: flex; gap: 3px; }
        .rli-dot { color: #c89b5d; flex: none; }
        .a4 .warn { color: #a23b1e; }
        .a4 .tip {
          background: rgba(200,155,93,0.12); border: 1px solid rgba(200,155,93,0.3);
          border-radius: 9px; padding: 8px 11px; color: #7a4d12; margin: 9px 0 !important;
        }

        .dims { display: flex; gap: 7px; flex-wrap: wrap; margin: 9px 0; }
        .dim {
          border: 1px solid #c9b48a; border-radius: 8px; padding: 5px 9px;
          font-size: 12px; background: #fff;
        }
        .dim b { color: #7a4d12; }
        .chip { border: 1px solid #c9b48a; border-radius: 999px; padding: 4px 13px; background:#fff; font-size: 12.5px; }
        /* 配圖 */
        .fig { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 10px;
          border: 1px solid #d9c8a4; border-radius: 12px; background: #fff; padding: 11px 12px; margin: 10px 0 3px; }
        .fig-pill { display: inline-flex; align-items: center; gap: 4px; border: 1px solid #c9b48a;
          border-radius: 999px; padding: 3px 10px; font-size: 12.5px; font-weight: 700; background: #faf4e8; color: #5c451f; }
        .fig-card { display: inline-flex; align-items: center; justify-content: center; width: 27px; height: 37px;
          border: 1px solid #c9a258; border-radius: 6px; background: #faf1dd; color: #7a4d12; font-weight: 700; font-size: 14px; }
        .fig-set { display: inline-flex; align-items: center; gap: 6px; border: 1px solid #c9a258;
          border-radius: 8px; padding: 4px 9px; background: #f3e6c8; color: #7a4d12; font-weight: 700; letter-spacing: 2px; }
        .fig-num { background: #c89b5d; color: #20170c; border-radius: 999px; padding: 0 6px; font-size: 12px; }
        .fig-op { color: #7a4d12; font-weight: 700; font-size: 15px; }
        .fig-cap { text-align: center; font-size: 11px; color: #6b5a3e; margin: 3px 0 0; }
        .fig-grp { display: inline-flex; flex-direction: column; align-items: center; gap: 3px; }
        .fig-grp small { font-size: 10.5px; color: #6b5a3e; }

        @media print {
          .no-print { display: none !important; }
          .rules-screen { background: #fff; padding: 0; }
          /* 打印時：不再固定 210mm（會超出可打印區被裁），改 width:auto 填滿 @page 內容區，
             所有邊距交給 @page，內容寬度 = A4 - 邊距，永不右側溢出被裁 */
          .a4-fit { max-width: none; width: 100%; }
          /* width:100% 填滿 @page 內容區(不 shrink-to-fit 導致右邊超出被切);padding:0,邊距交給 @page */
          .a4 { box-shadow: none; width: 100%; padding: 0; }
          /* 不硬編分頁(不同語言長度不同會產生空白頁)。改為自然連續排版 + 保護:
             圖例/提示框不被拆開、標題不落單在頁底。頁數隨內容自適應、無空白頁。 */
          .fig, .a4 .tip, .a4 .warn { break-inside: avoid; }
          .rsec h2, .rsub { break-after: avoid; }
          .dims { break-inside: avoid; }
          @page { size: A4; margin: 12mm; } /* 四邊 12mm，右邊留足不被切 */
        }
      `}</style>

      <div className="rules-toolbar no-print">
        <button className="rules-btn" onClick={() => router.push('/tutorial')}>{s.backToTutorial}</button>
        <button className="rules-btn rules-btn-primary" onClick={() => window.print()}>{s.printOrPdf}</button>
      </div>

      <div className="a4-fit">
        <div className="a4">
          <div className="head">
            <div className="title-wrap">
              {/* 分級標題:人格麻將(大)+Big Five 遊戲規則(稍小)。flex-wrap → 桌面一行,
                  裝不下自動主大副小換行;手機(≤640)固定兩行(主一行、副一行)。 */}
              <h1 className="serif rtitle">
                <span className="rt-main">{s.titleMain}</span>
                <span className="rt-sub">{s.titleSub}</span>
              </h1>
            </div>
            <div className="qrbox">
              <QRCodeSVG value={GAME_URL} size={64} level="M" fgColor="#2a241b" bgColor="#fbf8f1" />
              <div className="cap">{DISPLAY_URL}</div>
            </div>
          </div>

          <div className="sections">
            {s.sections.map((sec, si) => (
              <section key={si} className="rsec">
                <h2 className="serif">{sec.title}</h2>
                {sec.blocks.map(renderBlock)}
                {renderFig(sec.fig)}
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
