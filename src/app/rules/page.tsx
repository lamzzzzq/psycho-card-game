'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { useLocaleStore } from '@/lib/i18n';
import { useHydrated } from '@/stores/useHydration';
import { RULES_T, type RuleBlock } from '@/lib/i18n/rules';

const GAME_URL = 'https://www.personalitiesmahjong.com/';
const DISPLAY_URL = 'www.personalitiesmahjong.com';
const A4_WIDTH_PX = 793.7; // 210mm @ 96dpi

// A4 硬拷貝規則頁 = 一張固定版面的「PDF」。螢幕上整頁等比縮放鋪滿寬度（手機=整張縮小、
// 桌面=放大），永不重排；列印 / 存 PDF 時還原真 A4。所見即所存。
// 規則正文逐字照跟 big5_revised rules docx；emoji / 配圖自由發揮。
export default function RulesPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const localeRaw = useLocaleStore((s) => s.locale);
  const locale = hydrated ? localeRaw : 'zh';
  const s = RULES_T[locale];

  const a4Ref = useRef<HTMLDivElement>(null);
  const fitRef = useRef<HTMLDivElement>(null);

  // 把固定 210mm 的 A4 等比縮放到可用寬度（像 PDF 預覽）。
  // 用 CSS zoom（不是 transform）：zoom 會連同「佈局高度」一起縮，內容多長都完整顯示、
  // 超過一頁就自動往下延（列印自動分頁），不會被裁；也不需手動算容器高度。
  // 只在「寬度」變化時重設 → Safari 上下滑動（只改高度）不會觸發，畫面不抽搐。
  useEffect(() => {
    const a4 = a4Ref.current;
    const fit = fitRef.current;
    if (!a4 || !fit) return;
    let lastW = -1;
    const apply = () => {
      const w = fit.clientWidth;
      if (w <= 0 || w === lastW) return;
      lastW = w;
      (a4.style as CSSStyleDeclaration & { zoom?: string }).zoom = String(Math.min(1, w / A4_WIDTH_PX));
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(fit);
    return () => ro.disconnect();
  }, [locale, hydrated]);

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

        /* 縮放容器：寬度鋪滿；用 zoom 縮放 A4（連佈局一起縮，內容完整、不裁） */
        .a4-fit { width: 100%; max-width: 210mm; }
        .a4 {
          position: relative;
          width: 210mm;
          min-height: 297mm;
          background: #fbf8f1;
          color: #2a241b;
          box-shadow: 0 12px 40px rgba(0,0,0,0.35);
          padding: 9mm 9mm 11mm;
          box-sizing: border-box;
          font-family: ui-sans-serif, "PingFang TC", "Microsoft JhengHei", system-ui, sans-serif;
          line-height: 1.55;
        }
        .a4 .serif { font-family: ui-serif, "Songti TC", Georgia, serif; }

        /* 頁首：flex — 標題+副標左上角，QR+網址右上角(貼右邊)。align-items:flex-start
           讓頁首高度包住較高的 QR 塊，網址永遠在分割線「上方」，不會掉到線下。 */
        .head {
          display: flex; justify-content: space-between; align-items: flex-start; gap: 20px;
          border-bottom: 2px solid #c89b5d; padding-bottom: 12px; margin-bottom: 16px;
        }
        .title-wrap { min-width: 0; }
        .qrbox { flex: none; text-align: right; }
        .qrbox .cap { font-size: 10px; color: #6b5d44; margin-top: 3px; line-height: 1.3; }
        .a4 h1 { font-size: 30px; margin: 2px 0 0; letter-spacing: 2px; color: #1c1812; line-height: 1.1; }
        .a4 .eyebrow { font-size: 12px; letter-spacing: 6px; color: #7a4d12; margin: 0; }
        .a4 .sub { font-size: 13px; color: #6b5d44; margin: 6px 0 0; }

        /* 章節：單欄，節間拉開間距填滿版面 */
        .sections { margin-top: 4px; }
        .rsec { margin: 0 0 20px; }
        .rsec h2 {
          font-size: 17px; margin: 10px 0 8px; color: #7a4d12;
          border-bottom: 1px solid #d8c39a; padding-bottom: 5px; letter-spacing: 0.5px;
        }
        .a4 .rsec p { font-size: 13px; margin: 5px 0; line-height: 1.55; }
        .rsub { font-weight: 700; color: #3a2f1c; margin-top: 9px !important; font-size: 13.5px !important; }
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
          .a4-fit { max-width: none; width: auto; }
          .a4 { box-shadow: none; zoom: 1 !important; width: auto; min-height: 0; padding: 0; }
          /* 第四節「碰與食胡」起始換頁：第1頁=頁首+一二三，第2頁=四五六 */
          .rsec.pg-break { break-before: page; }
          @page { size: A4; margin: 12mm 10mm; } /* 上下12 左右10，頁腳/頁邊空間 */
        }
      `}</style>

      <div className="rules-toolbar no-print">
        <button className="rules-btn" onClick={() => router.push('/tutorial')}>{s.backToTutorial}</button>
        <button className="rules-btn rules-btn-primary" onClick={() => window.print()}>{s.printOrPdf}</button>
      </div>

      <div className="a4-fit" ref={fitRef}>
        <div className="a4" ref={a4Ref}>
          <div className="head">
            <div className="title-wrap">
              {locale === 'en' && <p className="eyebrow serif">PSYCHO CARD</p>}
              <h1 className="serif">{s.title}</h1>
              <p className="sub">{s.subtitle}</p>
            </div>
            <div className="qrbox">
              <QRCodeSVG value={GAME_URL} size={64} level="M" fgColor="#2a241b" bgColor="#fbf8f1" />
              <div className="cap">{DISPLAY_URL}</div>
            </div>
          </div>

          <div className="sections">
            {s.sections.map((sec, si) => (
              <section key={si} className={si === 3 ? 'rsec pg-break' : 'rsec'}>
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
