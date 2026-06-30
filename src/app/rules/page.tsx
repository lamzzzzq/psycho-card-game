'use client';

import { useRouter } from 'next/navigation';
import { QRCodeSVG } from 'qrcode.react';
import { useLocaleStore } from '@/lib/i18n';
import { useHydrated } from '@/stores/useHydration';
import { RULES_T } from '@/lib/i18n/rules';

const GAME_URL = 'https://psycho-card-game.vercel.app';

// A4 硬拷貝規則頁。淺色紙張主題（便於列印），@media print 隱藏螢幕用按鈕。
// ⚠️ 規則文案為佔位準確版，最終牌面/文案準備好後可替換。
export default function RulesPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const localeRaw = useLocaleStore((s) => s.locale);
  const locale = hydrated ? localeRaw : 'zh';
  const s = RULES_T[locale];

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
        /* 圖例（浅色纸张主题）*/
        .fig { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 8px;
          border: 1px solid #d9c8a4; border-radius: 12px; background: #fff; padding: 10px 12px; margin: 6px 0; }
        .fig-pill { display: inline-flex; align-items: center; gap: 4px; border: 1px solid #c9b48a;
          border-radius: 999px; padding: 2px 9px; font-size: 11px; font-weight: 700; background: #faf4e8; color: #5c451f; }
        .fig-card { display: inline-flex; align-items: center; justify-content: center; width: 26px; height: 36px;
          border: 1px solid #c9a258; border-radius: 6px; background: #faf1dd; color: #7a4d12; font-weight: 700; font-size: 13px; }
        .fig-set { display: inline-flex; align-items: center; gap: 6px; border: 1px solid #c9a258;
          border-radius: 8px; padding: 4px 8px; background: #f3e6c8; color: #7a4d12; font-weight: 700; letter-spacing: 2px; }
        .fig-num { background: #c89b5d; color: #20170c; border-radius: 999px; padding: 0 6px; font-size: 11px; }
        .fig-op { color: #7a4d12; font-weight: 700; }
        .fig-cap { text-align: center; font-size: 10.5px; color: #6b5a3e; margin-top: 4px; }
        .fig-grp { display: inline-flex; flex-direction: column; align-items: center; gap: 3px; }
        .fig-grp small { font-size: 9.5px; color: #6b5a3e; }
        @media print {
          .no-print { display: none !important; }
          .rules-screen { background: #fff; padding: 0; }
          .a4 { box-shadow: none; width: auto; min-height: auto; }
          @page { size: A4; margin: 12mm; }
        }
      `}</style>

      <div className="rules-toolbar no-print">
        <button className="rules-btn" onClick={() => router.push('/tutorial')}>{s.backToTutorial}</button>
        <button className="rules-btn rules-btn-primary" onClick={() => window.print()}>{s.printOrPdf}</button>
      </div>

      <div className="a4">
        <div className="head">
          <div>
            <p className="serif" style={{ fontSize: 12, letterSpacing: 6, color: '#7a4d12', margin: 0 }}>PSYCHO CARD</p>
            <h1 className="serif">{s.title}</h1>
            <p className="sub" style={{ marginTop: 6 }}>{s.subtitle}</p>
          </div>
          <div className="qrbox">
            <QRCodeSVG value={GAME_URL} size={96} level="M" fgColor="#2a241b" bgColor="#fbf8f1" />
            <div className="cap">{s.scanToEnter}<br />{GAME_URL.replace('https://', '')}</div>
          </div>
        </div>

        <h2>{s.sec1Title}</h2>
        <p>
          {s.goalIntroBefore}<span className="accent">{s.goalAssessment}</span>{s.goalIntroAfter}
          {s.goalDims}
        </p>
        <p>
          {s.goalCollectBefore}<span className="accent">{s.goalCollectAll}</span>{s.goalCollectMid}
          {s.goalExample(s.dimE, 4)}{s.goalWinBefore}<span className="accent">{s.goalWinHu}</span>{s.goalWinAfter}
        </p>
        <div className="dims">
          <div className="dim"><b>O</b> {s.dimO}</div>
          <div className="dim"><b>C</b> {s.dimC}</div>
          <div className="dim"><b>E</b> {s.dimE}</div>
          <div className="dim"><b>A</b> {s.dimA}</div>
          <div className="dim"><b>N</b> {s.dimN}</div>
        </div>
        {/* 圖例：目標張數（數字＝要幾張）→ 食胡 */}
        <div className="fig">
          {([['O', 3], ['C', 4], ['E', 2], ['A', 5], ['N', 4]] as const).map(([d, n]) => (
            <span key={d} className="fig-pill">{d} {n}</span>
          ))}
          <span className="fig-op">→</span>
          <span style={{ fontSize: 18 }}>🏆</span>
        </div>
        <div className="fig-cap">{s.figGoalCap}</div>

        <h2>{s.sec2Title}</h2>
        <ul>
          {s.openItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>

        <h2>{s.sec3Title}</h2>
        <div className="flow">
          <span className="chip">{s.flowDraw}</span>
          <span>→</span>
          <span className="chip">{s.flowDiscard}</span>
          <span>→</span>
          <span className="sub">{s.flowNext}</span>
        </div>

        <div className="cols">
          <div>
            <h2>{s.sec4Title}</h2>
            <p>{s.pongIntro}</p>
            <ul>
              {s.pongItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
              <li className="warn">{s.pongWarn}</li>
            </ul>
            {/* 圖例：2 張手牌 + 1 張進來的牌 = 鎖定 3 張 */}
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
          </div>
          <div>
            <h2>{s.sec5Title}</h2>
            <p><b>{s.huLineBeforeHu}</b>{s.huLineRest}</p>
            <p><b>{s.penaltyIntroBold}</b>{s.penaltyIntroRest}</p>
            <ul>
              {s.penaltyItems.map((item, i) => (
                <li key={i}><b>{item.b}</b>{item.rest}</li>
              ))}
            </ul>
            <p className="warn">{s.penaltyWarn}</p>
          </div>
        </div>

        <div className="cols">
          <div>
            <h2>{s.sec6Title}</h2>
            <p>{s.knowledgeBody}</p>
          </div>
          <div>
            <h2>{s.sec7Title}</h2>
            <ul>
              {s.scoreItems.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <p className="sub" style={{ marginTop: 18, textAlign: 'center', borderTop: '1px solid #d8c39a', paddingTop: 8 }}>
          {s.footer}{GAME_URL.replace('https://', '')}
        </p>
      </div>
    </div>
  );
}
