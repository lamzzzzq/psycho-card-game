'use client';

import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { useLocaleStore } from '@/lib/i18n';
import { useHydrated } from '@/stores/useHydration';
import { RULES_T, type RuleBlock } from '@/lib/i18n/rules';

const GAME_URL = 'https://psycho-card-game.vercel.app';

// A4 硬拷貝規則頁。淺色紙張主題（便於列印），@media print 隱藏螢幕用按鈕。
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
            <span style={{ fontSize: 18 }}>🏆</span>
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
            <span style={{ fontSize: 16 }}>👀</span>
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
          padding: 15mm 15mm;
          box-sizing: border-box;
          font-family: ui-sans-serif, "PingFang TC", "Microsoft JhengHei", system-ui, sans-serif;
          line-height: 1.55;
        }
        .a4 .serif { font-family: ui-serif, "Songti TC", Georgia, serif; }
        .a4 h1 { font-size: 29px; margin: 0; letter-spacing: 2px; color: #1c1812; }
        .a4 .sub { font-size: 12px; color: #6b5d44; }
        .head {
          display: flex; justify-content: space-between; align-items: flex-start;
          border-bottom: 2px solid #c89b5d; padding-bottom: 12px; margin-bottom: 6px;
        }
        .qrbox { text-align: center; }
        .qrbox .cap { font-size: 10px; color: #6b5d44; margin-top: 4px; }

        /* 章節：兩欄流式排版，單節不跨欄斷開 */
        .sections { column-count: 2; column-gap: 20px; margin-top: 6px; }
        .rsec { break-inside: avoid; margin: 0 0 12px; display: inline-block; width: 100%; }
        .rsec h2 {
          font-size: 15.5px; margin: 6px 0 6px; color: #7a4d12;
          border-bottom: 1px solid #d8c39a; padding-bottom: 4px; letter-spacing: 0.5px;
        }
        .a4 .rsec p { font-size: 11.8px; margin: 3px 0; line-height: 1.5; }
        .rsub { font-weight: 700; color: #3a2f1c; margin-top: 6px !important; }
        .rli { display: flex; gap: 2px; }
        .rli-dot { color: #c89b5d; flex: none; }
        .a4 .warn { color: #a23b1e; }
        .a4 .tip {
          background: rgba(200,155,93,0.10); border: 1px solid rgba(200,155,93,0.28);
          border-radius: 8px; padding: 6px 8px; color: #7a4d12; margin: 6px 0 !important;
        }

        .dims { display: flex; gap: 5px; flex-wrap: wrap; margin: 6px 0; }
        .dim {
          border: 1px solid #c9b48a; border-radius: 8px; padding: 4px 7px;
          font-size: 10.5px; background: #fff;
        }
        .dim b { color: #7a4d12; }
        .chip { border: 1px solid #c9b48a; border-radius: 999px; padding: 3px 10px; background:#fff; font-size: 11px; }
        /* 配圖（浅色纸张主题）*/
        .fig { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px;
          border: 1px solid #d9c8a4; border-radius: 12px; background: #fff; padding: 9px 10px; margin: 7px 0 2px; }
        .fig-pill { display: inline-flex; align-items: center; gap: 4px; border: 1px solid #c9b48a;
          border-radius: 999px; padding: 2px 8px; font-size: 11px; font-weight: 700; background: #faf4e8; color: #5c451f; }
        .fig-card { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 33px;
          border: 1px solid #c9a258; border-radius: 6px; background: #faf1dd; color: #7a4d12; font-weight: 700; font-size: 12px; }
        .fig-set { display: inline-flex; align-items: center; gap: 6px; border: 1px solid #c9a258;
          border-radius: 8px; padding: 3px 7px; background: #f3e6c8; color: #7a4d12; font-weight: 700; letter-spacing: 2px; }
        .fig-num { background: #c89b5d; color: #20170c; border-radius: 999px; padding: 0 6px; font-size: 11px; }
        .fig-op { color: #7a4d12; font-weight: 700; }
        .fig-cap { text-align: center; font-size: 10px; color: #6b5a3e; margin: 2px 0 0; }
        .fig-grp { display: inline-flex; flex-direction: column; align-items: center; gap: 3px; }
        .fig-grp small { font-size: 9.5px; color: #6b5a3e; }
        @media print {
          .no-print { display: none !important; }
          .rules-screen { background: #fff; padding: 0; }
          .a4 { box-shadow: none; width: auto; min-height: auto; }
          @page { size: A4; margin: 11mm; }
        }
      `}</style>

      <div className="rules-toolbar no-print">
        <button className="rules-btn" onClick={() => router.push('/tutorial')}>{s.backToTutorial}</button>
        <button className="rules-btn rules-btn-primary" onClick={() => window.print()}>{s.printOrPdf}</button>
      </div>

      <div className="a4">
        <div className="head">
          <div>
            {locale === 'en' && (
              <p className="serif" style={{ fontSize: 12, letterSpacing: 6, color: '#7a4d12', margin: 0 }}>PSYCHO CARD</p>
            )}
            <h1 className="serif">{s.title}</h1>
            <p className="sub" style={{ marginTop: 6 }}>{s.subtitle}</p>
          </div>
          <div className="qrbox">
            <QRCodeSVG value={GAME_URL} size={92} level="M" fgColor="#2a241b" bgColor="#fbf8f1" />
            <div className="cap">{s.scanToEnter}<br />{GAME_URL.replace('https://', '')}</div>
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

        <p className="sub" style={{ marginTop: 14, textAlign: 'center', borderTop: '1px solid #d8c39a', paddingTop: 8 }}>
          {s.footer}{GAME_URL.replace('https://', '')}
        </p>
      </div>
    </div>
  );
}
