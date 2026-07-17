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

  // 把固定 210mm 的 A4 等比縮放到可用寬度（像 PDF 預覽）
  useEffect(() => {
    const a4 = a4Ref.current;
    const fit = fitRef.current;
    if (!a4 || !fit) return;
    const apply = () => {
      const avail = fit.clientWidth;
      const scale = Math.min(1, avail / A4_WIDTH_PX);
      a4.style.transform = `scale(${scale})`;
      fit.style.height = `${a4.offsetHeight * scale}px`;
    };
    apply();
    const t = window.setTimeout(apply, 200); // 等字體/佈局穩定再算一次
    window.addEventListener('resize', apply);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('resize', apply);
    };
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

        /* 縮放容器：寬度鋪滿，內部把固定 A4 scale 到剛好 */
        .a4-fit { width: 100%; max-width: 210mm; display: flex; justify-content: center; overflow: hidden; }
        .a4 {
          width: 210mm;
          min-height: 297mm;
          flex: none;
          transform-origin: top center;
          background: #fbf8f1;
          color: #2a241b;
          box-shadow: 0 12px 40px rgba(0,0,0,0.35);
          padding: 13mm 13mm 15mm;
          box-sizing: border-box;
          font-family: ui-sans-serif, "PingFang TC", "Microsoft JhengHei", system-ui, sans-serif;
          line-height: 1.6;
        }
        .a4 .serif { font-family: ui-serif, "Songti TC", Georgia, serif; }

        /* 頁首：置中，QR 在標題正上方 */
        .head {
          display: flex; flex-direction: column; align-items: center; text-align: center;
          gap: 6px; border-bottom: 2px solid #c89b5d; padding-bottom: 12px; margin-bottom: 10px;
        }
        .qrbox { text-align: center; }
        .qrbox .cap { font-size: 10.5px; color: #6b5d44; margin-top: 4px; line-height: 1.4; }
        .a4 h1 { font-size: 31px; margin: 2px 0 0; letter-spacing: 2px; color: #1c1812; }
        .a4 .eyebrow { font-size: 12px; letter-spacing: 6px; color: #7a4d12; margin: 0; }
        .a4 .sub { font-size: 13px; color: #6b5d44; margin: 4px 0 0; }

        /* 章節：單欄 */
        .sections { margin-top: 4px; }
        .rsec { margin: 0 0 14px; }
        .rsec h2 {
          font-size: 18px; margin: 8px 0 7px; color: #7a4d12;
          border-bottom: 1px solid #d8c39a; padding-bottom: 5px; letter-spacing: 0.5px;
        }
        .a4 .rsec p { font-size: 13.5px; margin: 4px 0; line-height: 1.65; }
        .rsub { font-weight: 700; color: #3a2f1c; margin-top: 8px !important; font-size: 14px !important; }
        .rli { display: flex; gap: 3px; }
        .rli-dot { color: #c89b5d; flex: none; }
        .a4 .warn { color: #a23b1e; }
        .a4 .tip {
          background: rgba(200,155,93,0.12); border: 1px solid rgba(200,155,93,0.3);
          border-radius: 9px; padding: 8px 11px; color: #7a4d12; margin: 8px 0 !important;
        }

        .dims { display: flex; gap: 6px; flex-wrap: wrap; margin: 8px 0; }
        .dim {
          border: 1px solid #c9b48a; border-radius: 8px; padding: 5px 9px;
          font-size: 12px; background: #fff;
        }
        .dim b { color: #7a4d12; }
        .chip { border: 1px solid #c9b48a; border-radius: 999px; padding: 4px 13px; background:#fff; font-size: 12.5px; }
        /* 配圖 */
        .fig { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 10px;
          border: 1px solid #d9c8a4; border-radius: 12px; background: #fff; padding: 11px 12px; margin: 9px 0 3px; }
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
          .a4-fit { height: auto !important; overflow: visible !important; max-width: none; }
          .a4 { box-shadow: none; transform: none !important; }
          @page { size: A4; margin: 11mm; }
        }
      `}</style>

      <div className="rules-toolbar no-print">
        <button className="rules-btn" onClick={() => router.push('/tutorial')}>{s.backToTutorial}</button>
        <button className="rules-btn rules-btn-primary" onClick={() => window.print()}>{s.printOrPdf}</button>
      </div>

      <div className="a4-fit" ref={fitRef}>
        <div className="a4" ref={a4Ref}>
          <div className="head">
            <div className="qrbox">
              <QRCodeSVG value={GAME_URL} size={86} level="M" fgColor="#2a241b" bgColor="#fbf8f1" />
              <div className="cap">{s.scanToEnter}<br />{DISPLAY_URL}</div>
            </div>
            {locale === 'en' && <p className="eyebrow serif">PSYCHO CARD</p>}
            <h1 className="serif">{s.title}</h1>
            <p className="sub">{s.subtitle}</p>
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
