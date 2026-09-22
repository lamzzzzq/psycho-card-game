'use client';

import { QRCodeSVG } from 'qrcode.react';

// 實體版規則卡（Big Five・明牌版）。A4 一張，正面繁中、背面英文，印在硬卡紙上雙面。
//
// 內容改寫自電子版 /rules（src/lib/i18n/rules.ts），措辭能照搬就照搬；只改「電子版靠系統、
// 實體版要有人動手」的地方：開局備牌／發牌、截胡時限（改成「下家摸牌前」，同真麻將，不用沙漏）、
// 多人搶同一張的先後、罰停標記（失敗的牌攤在面前本身就是標記）、10 輪計數。
// 聯機專屬的條目（斷線、防作弊、逾時提醒、看牌難度）拿掉——實體版只有明牌。
// 規格推導見 /card-lab?deck=print（§5–§9）。

const GAME_URL = 'https://www.personalitiesmahjong.com/';
const DISPLAY_URL = 'www.personalitiesmahjong.com';

const DIMS = [
  { k: 'O', zh: '開放性', en: 'Openness', c: '#2A9D8F' },
  { k: 'C', zh: '盡責性', en: 'Conscientiousness', c: '#2A4365' },
  { k: 'E', zh: '外向性', en: 'Extraversion', c: '#D97706' },
  { k: 'A', zh: '宜人性', en: 'Agreeableness', c: '#E07A5F' },
  { k: 'N', zh: '神經質', en: 'Neuroticism', c: '#7E6C8F' },
];

type Block = { t: 'p' | 'li' | 'ol' | 'warn' | 'tip' | 'sub'; text: string };
type Sec = { title: string; blocks: Block[]; fig?: 'goal' | 'cards' | 'rounds' };

const T = {
  zh: {
    title: '人格麻將',
    sub: 'Big Five 實體版規則',
    meta: '2–4 人 · 每副 120 張（人格牌 100 + 知識牌 20）',
    scan: '掃碼做測評',
    round: '輪次',
    secs: [
      {
        title: '🎯 一、目標',
        fig: 'goal',
        blocks: [
          { t: 'p', text: '湊齊五大人格 5 個維度（OCEAN）並公開「歸檔」，最先完成的人獲勝。每個維度的目標張數＝你的測評分數四捨五入（例：O 3.4 分 → 3 張、A 4.6 分 → 5 張）。' },
        ],
      },
      {
        title: '🧰 二、開局',
        blocks: [
          { t: 'ol', text: '每人掃右上角 QR code 做測評，記下 5 個目標張數。' },
          { t: 'ol', text: '備牌：人格牌每題 2 張。先把題號 31–50 各拿 1 張放一旁當「備用池」。4 人局用其餘 80 張 + 知識牌 12 張；2–3 人局再拿走題號 11–30 各 1 張，知識牌 8 張。洗勻，背面朝上當抽牌堆。' },
          { t: 'ol', text: '發牌：每人張數＝5 個目標張數之和 − 1。若全桌合計超過 84 張（4 人）或 63 張（3 人），先把備用池／題號 11–30 洗回牌堆再發。' },
          { t: 'ol', text: '手上知識牌超過 1 張的，把多的洗回牌堆再補摸。任選一人先手，逆時針輪流。' },
        ],
      },
      {
        title: '🃏 三、卡牌',
        fig: 'cards',
        blocks: [
          { t: 'li', text: '人格牌：左上角圓標＝維度，用來歸檔。知識牌（K）：沒有維度、不能歸檔，摸到可以直接打掉。' },
        ],
      },
      {
        title: '🔄 四、每回合',
        blocks: [
          { t: 'p', text: '摸 1 張 →（可選）自摸碰 → 出 1 張到棄牌堆。抽牌堆摸完時，把棄牌堆（留下最上面一張）洗勻再用。' },
        ],
      },
      {
        title: '⚡ 五、碰與食胡',
        blocks: [
          { t: 'li', text: '碰：把某個維度剛好「目標張數」的牌正面擺在面前（歸檔），張數必須一致。自摸碰＝自己回合用手牌＋剛摸的牌（每回合 1 次）；截胡碰＝差 1 張時，在下家摸牌前喊「碰」拿走棄牌，之後不摸牌、直接出 1 張。' },
          { t: 'li', text: '食胡：歸檔完 5 個維度的最後一張（自己摸到或別人打出），攤牌給全桌核對。' },
          { t: 'li', text: '多人搶同一張：食胡優先於碰；同樣動作時，逆時針離出牌者最近的人優先。' },
        ],
      },
      {
        title: '🚫 六、罰停',
        blocks: [
          { t: 'p', text: '碰或食胡失敗（張數或維度不對）：失敗的牌（食胡失敗則整副手牌）攤在面前，下一回合跳過、也不能碰或食胡，之後收回手上。在自己回合失敗仍要出 1 張。' },
        ],
      },
      {
        title: '🏁 七、勝負',
        fig: 'rounds',
        blocks: [
          { t: 'p', text: '有人食胡立即獲勝。一局 10 輪（每人各打一回合＝1 輪，先手每輪把硬幣推一格）；打滿仍無人食胡時，歸檔維度多者勝，同數則手牌少者勝。' },
        ],
      },
    ] as Sec[],
  },
  en: {
    title: 'Personalities Mahjong',
    sub: 'Big Five · Tabletop Rules',
    meta: '2–4 players · 120 cards per deck (100 Personality + 20 Knowledge)',
    scan: 'Scan for the assessment',
    round: 'Round',
    secs: [
      {
        title: '🎯 1. Goal',
        fig: 'goal',
        blocks: [
          { t: 'p', text: 'Collect and publicly "file" all 5 Big Five dimensions (OCEAN). The first to finish wins. Each dimension\'s target count = your assessment score, rounded (e.g. O 3.4 → 3 cards, A 4.6 → 5 cards).' },
        ],
      },
      {
        title: '🧰 2. Setup',
        blocks: [
          { t: 'ol', text: 'Everyone scans the QR code (top right), takes the assessment, and notes their 5 target counts.' },
          { t: 'ol', text: 'Build the deck: there are 2 of each Personality card. Set aside one copy of Nos. 31–50 as the "reserve". 4 players use the other 80 + 12 Knowledge cards; 2–3 players also set aside one copy of Nos. 11–30 and use 8 Knowledge cards. Shuffle into a face-down draw pile.' },
          { t: 'ol', text: 'Deal: each hand = the sum of your 5 targets − 1. If the table\'s total is over 84 (4 players) or 63 (3 players), shuffle the reserve / Nos. 11–30 back in before dealing.' },
          { t: 'ol', text: 'Anyone holding more than 1 Knowledge card shuffles the extras back and draws again. Pick a first player; play passes counter-clockwise.' },
        ],
      },
      {
        title: '🃏 3. Cards',
        fig: 'cards',
        blocks: [
          { t: 'li', text: 'Personality cards: the corner badge shows the dimension — use them to file. Knowledge cards (K): no dimension, cannot be filed; discard them freely.' },
        ],
      },
      {
        title: '🔄 4. Each Turn',
        blocks: [
          { t: 'p', text: 'Draw 1 → (optional) Self-draw Pong → discard 1 face up. When the draw pile runs out, shuffle the discards (keep the top one out) into a new draw pile.' },
        ],
      },
      {
        title: '⚡ 5. Pong & Win',
        blocks: [
          { t: 'li', text: 'Pong: lay exactly a dimension\'s target count face up in front of you (file it). Self-draw Pong = on your turn, from your hand + the card just drawn (once per turn). Intercept Pong = when 1 card short, call "Pong" before the next player draws and take the discard; then skip drawing and discard 1.' },
          { t: 'li', text: 'Win: the final card that completes all 5 dimensions (drawn or discarded). Reveal your cards for the table to check.' },
          { t: 'li', text: 'Same discard wanted by several players: Win beats Pong; for equal calls, the player nearest the discarder counter-clockwise goes first.' },
        ],
      },
      {
        title: '🚫 6. Frozen',
        blocks: [
          { t: 'p', text: 'A failed Pong or Win (wrong count or dimension): lay the failed cards (your whole hand for a failed Win) face up in front of you; skip your next turn and no Pong/Win until then, then take them back. If you fail on your own turn, still discard 1.' },
        ],
      },
      {
        title: '🏁 7. Results',
        fig: 'rounds',
        blocks: [
          { t: 'p', text: 'A Win ends the game at once. A game lasts 10 rounds (everyone plays once = 1 round; the first player moves a coin each round). If no one wins: most dimensions filed wins, then fewest cards in hand.' },
        ],
      },
    ] as Sec[],
  },
};

function Side({ lang }: { lang: 'zh' | 'en' }) {
  const s = T[lang];
  const renderBlock = (b: Block, i: number, all: Block[]) => {
    switch (b.t) {
      case 'ol': {
        // 編號 = 往前連續幾個 ol（中間插了別的區塊就重新從 1 起算）
        let n = 0;
        for (let j = i; j >= 0 && all[j].t === 'ol'; j--) n += 1;
        return <p key={i} className="rli"><span className="num">{n}</span><span>{b.text}</span></p>;
      }
      case 'li':
        return <p key={i} className="rli"><span className="dot">・</span><span>{b.text}</span></p>;
      case 'sub':
        return <p key={i} className="rsub">{b.text}</p>;
      case 'warn':
        return <p key={i} className="warn">{b.text}</p>;
      case 'tip':
        return <p key={i} className="tip">💡 {b.text}</p>;
      default:
        return <p key={i}>{b.text}</p>;
    }
  };
  const fig = (f?: Sec['fig']) => {
    if (f === 'goal') {
      return (
        <div className="fig">
          {DIMS.map((d, i) => (
            <span key={d.k} className="pill">
              <span className="dot-c" style={{ background: d.c }}>{d.k}</span>
              {lang === 'zh' ? d.zh : d.en} <b>{[3, 4, 2, 5, 4][i]}</b>
            </span>
          ))}
          <span className="op">→ 🏆</span>
        </div>
      );
    }
    if (f === 'cards') {
      return (
        <div className="fig">
          {DIMS.map((d) => (
            <span key={d.k} className="mini" style={{ borderColor: d.c }}>
              <span className="dot-c" style={{ background: d.c }}>{d.k}</span>
            </span>
          ))}
          <span className="op">vs</span>
          <span className="mini" style={{ borderColor: '#9a8c74' }}>
            <span className="dot-c" style={{ background: '#9a8c74' }}>K</span>
          </span>
        </div>
      );
    }
    if (f === 'rounds') {
      return (
        <div className="rounds">
          <span className="rl">{s.round}</span>
          {Array.from({ length: 10 }, (_, i) => <span key={i} className="rbox">{i + 1}</span>)}
        </div>
      );
    }
    return null;
  };
  return (
    <div className={`a4 ${lang}`}>
      <div className="head">
        <div>
          <h1><span className="t1">{s.title}</span><span className="t2">{s.sub}</span></h1>
          <p className="meta">{s.meta}</p>
        </div>
        <div className="qr">
          <QRCodeSVG value={GAME_URL} size={54} level="M" fgColor="#2a241b" bgColor="#fbf8f1" />
          <div className="cap">{s.scan}<br />{DISPLAY_URL}</div>
        </div>
      </div>
      <div className="cols">
        {s.secs.map((sec, i) => (
          <section key={i} className="rsec">
            {/* 輪次格塞進第七節標題右側，省下一整行（獨立一行時英文面會壓到頁框線） */}
            {sec.fig === 'rounds' ? (
              <h2 className="h2-row"><span>{sec.title}</span>{fig('rounds')}</h2>
            ) : (
              <h2>{sec.title}</h2>
            )}
            {sec.fig === 'goal' || sec.fig === 'cards' ? fig(sec.fig) : null}
            {sec.blocks.map(renderBlock)}
          </section>
        ))}
      </div>
    </div>
  );
}

export function RulesCard({ cols = 1 }: { cols?: 1 | 2 }) {
  return (
    <div className={`screen c${cols}`}>
      <style>{`
        @page { size: A4; margin: 0; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
        html, body { margin: 0; }
        .screen { background: #4a4a52; padding: 20px 0; display: flex; flex-direction: column; align-items: center; gap: 20px; }
        .a4 {
          width: 210mm; height: 297mm; overflow: hidden; background: #fbf8f1; color: #2a241b;
          padding: 11mm 12mm 10mm; position: relative;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, "PingFang TC", "Microsoft JhengHei", sans-serif;
          line-height: 1.5; box-shadow: 0 12px 40px rgba(0,0,0,0.35);
        }
        .a4::before { content: ''; position: absolute; inset: 5mm; border: 0.5mm solid rgba(200,155,93,0.55); border-radius: 4mm; pointer-events: none; }
        .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px;
          border-bottom: 2px solid #c89b5d; padding-bottom: 2mm; margin-bottom: 2.5mm; align-items: center; }
        h1 { margin: 0; display: flex; align-items: baseline; flex-wrap: wrap; gap: 2px 12px;
          font-family: ui-serif, Georgia, "Songti TC", serif; }
        .t1 { font-size: 27px; letter-spacing: 1.5px; color: #1c1812; }
        .t2 { font-size: 17px; color: #6b5d44; }
        .meta { margin: 4px 0 0; font-size: 11.5px; color: #6b5d44; }
        /* QR 說明放在 QR 左邊並排（原本疊在下面，把頁頭撐得太高） */
        .qr { display: flex; flex-direction: row-reverse; align-items: center; gap: 2mm; flex: none; }
        .qr .cap { font-size: 9px; color: #6b5d44; text-align: right; line-height: 1.35; }

        .c2 .cols { column-count: 2; column-gap: 7mm; }
        .rsec { break-inside: avoid; margin: 0 0 4mm; }
        h2 { font-family: ui-serif, Georgia, "Songti TC", serif; font-size: 15.5px; color: #7a4d12; margin: 0 0 1.5mm;
          border-bottom: 1px solid #d8c39a; padding-bottom: 1mm; }
        .a4 p { margin: 1.5mm 0; font-size: 12.6px; }
        .en.a4 p { font-size: 10.8px; line-height: 1.42; }
        .rli { display: flex; gap: 4px; }
        .dot { color: #c89b5d; flex: none; }
        .num { flex: none; width: 15px; height: 15px; border-radius: 99px; background: #c89b5d; color: #fff;
          font-size: 9.5px; font-weight: 700; display: inline-flex; align-items: center; justify-content: center; margin-top: 2px; }
        .rsub { font-weight: 700; color: #3a2f1c; }
        .warn { color: #a23b1e; font-weight: 600; }
        .tip { background: rgba(200,155,93,0.13); border: 1px solid rgba(200,155,93,0.35); border-radius: 8px; padding: 1.6mm 2.6mm; color: #7a4d12; }

        .fig { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 5px;
          border: 1px solid #d9c8a4; border-radius: 10px; background: #fff; padding: 2mm; margin: 1.5mm 0; }
        .pill { display: inline-flex; align-items: center; gap: 4px; border: 1px solid #d9c8a4; border-radius: 99px;
          padding: 2px 8px 2px 3px; font-size: 10.5px; background: #faf4e8; }
        .pill b { color: #7a4d12; }
        .dot-c { width: 15px; height: 15px; border-radius: 99px; color: #fff; font-size: 9px; font-weight: 800;
          display: inline-flex; align-items: center; justify-content: center; font-family: -apple-system, Arial, sans-serif; }
        .mini { width: 22px; height: 31px; border-radius: 4px; border: 1.5px solid; background: #efe3cb;
          display: inline-flex; align-items: flex-start; justify-content: flex-start; padding: 2px; }
        .mini .dot-c { width: 11px; height: 11px; font-size: 7px; }
        .op { font-weight: 700; color: #7a4d12; font-size: 13px; }
        .rounds { display: flex; align-items: center; gap: 3px; margin-top: 2mm; }
        .rl { white-space: nowrap; font-size: 10.5px; color: #7a4d12; font-weight: 700; margin-right: 3px; }
        .rbox { width: 8.2mm; height: 8.2mm; border: 1px solid #c9a258; border-radius: 5px; background: #fff;
          display: inline-flex; align-items: flex-start; justify-content: flex-start; padding: 1px 3px;
          font-size: 8px; color: #9a7448; font-weight: 700; }

        .h2-row { display: flex; align-items: center; justify-content: space-between; gap: 3mm; }
        .h2-row .rounds { margin-top: 0; gap: 2px; }
        .h2-row > span { white-space: nowrap; }
        /* 兩欄版欄寬不夠並排：格子掉到標題下一行，標題本身不折 */
        .c2 .h2-row { flex-wrap: wrap; row-gap: 1.2mm; }
        .h2-row .rl { font-family: -apple-system, Arial, sans-serif; font-size: 9.5px; }
        .h2-row .rbox { width: 6.2mm; height: 6.2mm; font-size: 7px; border-radius: 4px; }

        /* 一欄版：整行寬，但每個標題／圖示框都獨佔一行，同字級會超出 A4 → 縮一號、收緊段距 */
        .c1 .rsec { margin: 0 0 4.2mm; }
        .c1 h2 { font-size: 17px; margin-bottom: 1.4mm; }
        .c1 .a4 p { margin: 1.4mm 0; font-size: 14.6px; line-height: 1.6; }
        /* 英文字數比中文多約一成，一欄版要再縮一點才進得了一頁 */
        .c1 .en.a4 p { font-size: 12.9px; line-height: 1.46; margin: 1.2mm 0; }
        .c1 .en .rsec { margin-bottom: 3.4mm; }
        .c1 .en h2 { font-size: 16.5px; }
        .c1 .en .fig { padding: 0.8mm; margin: 0.6mm 0; }
        .c1 .fig { padding: 1.2mm; margin: 1mm 0; }
        .c1 .tip { padding: 1.2mm 2.4mm; }

        @media print {
          .screen { background: none; padding: 0; gap: 0; display: block; }
          .a4 { box-shadow: none; break-after: page; }
          .a4:last-child { break-after: auto; }
        }
      `}</style>
      <Side lang="zh" />
      <Side lang="en" />
    </div>
  );
}
