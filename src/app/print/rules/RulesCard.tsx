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
    meta: '2–4 人 · 每副 100 張（人格牌 80 + 知識牌 20）',
    scan: '掃碼做測評',
    round: '輪次',
    secs: [
      {
        title: '🎯 一、終極目標：5 維度「公開歸檔」！',
        fig: 'goal',
        blocks: [
          { t: 'p', text: '你的目標是將五大人格的 5 個維度（OCEAN）湊齊並「公開歸檔」，最快完成的人獲勝！' },
          { t: 'p', text: '每個維度的目標張數取決於你的測評分數：分數四捨五入就是目標張數（最少 1 張）。例：O 3.4 分 → 3 張、A 4.6 分 → 5 張。' },
        ],
      },
      {
        title: '🧰 二、開局準備',
        blocks: [
          { t: 'ol', text: '每人掃右上角 QR code 完成測評，記下自己 5 個維度的目標張數。' },
          { t: 'ol', text: '備牌：4 人局用全部人格牌 + 隨機 12 張知識牌；2–3 人局先抽走角落印有「4P」的 20 張人格牌，知識牌只放 8 張。洗勻，正面朝下疊成抽牌堆。' },
          { t: 'ol', text: '發牌：每人手牌張數 = 5 個目標張數之和 − 1（每人不同是正常的）。少的那 1 張，要靠「碰」或「食胡」來補齊。' },
          { t: 'ol', text: '手上超過 1 張知識牌的人，把多的亮出來洗回抽牌堆，再補摸等量的牌。' },
          { t: 'ol', text: '任選一人先手，之後逆時針輪流。' },
        ],
      },
      {
        title: '🃏 三、認識卡牌',
        fig: 'cards',
        blocks: [
          { t: 'li', text: '人格描述牌（有顏色）：左上角圓標與中間色帶就是它的人格維度，是你用來歸檔（湊張數）的核心牌。' },
          { t: 'li', text: '知識牌（灰色，角標 K）：印有心理學術語與定義。它們沒有維度屬性，不能用來歸檔。' },
          { t: 'tip', text: '策略提示：抽到就打掉，安全不穿幫；還能順便觀察對手打出知識牌的時機，試探他們的出牌風格！' },
        ],
      },
      {
        title: '🔄 四、每回合運作：摸牌 ➔ 出牌',
        blocks: [
          { t: 'ol', text: '摸牌：從抽牌堆頂摸 1 張。' },
          { t: 'ol', text: '（可選）自摸碰：見下一節。' },
          { t: 'ol', text: '出牌：從手裏選 1 張，正面朝上丟到中間的「棄牌堆」。其他玩家可以搶這張牌來「碰」或「食胡」。' },
          { t: 'p', text: '抽牌堆摸完時，把棄牌堆（最上面一張留著）洗勻，翻面當新的抽牌堆。' },
        ],
      },
      {
        title: '⚡ 五、兩大核心動作：碰 與 食胡',
        blocks: [
          { t: 'sub', text: '🀄 碰（公開歸檔）：湊齊某一維度的目標張數，把這幾張正面朝上擺在自己面前。張數要與目標一致。' },
          { t: 'li', text: '自摸碰：在自己的回合，從「手牌 + 剛摸的牌」中，挑出符合維度目標張數的牌。（每回合限 1 次）' },
          { t: 'li', text: '截胡碰：別人出牌後、下家摸牌前，如果你手牌只差 1 張就達維度目標張數，喊「碰」拿走那張棄牌，湊齊歸檔。之後你不摸牌，直接出 1 張，由你的下家繼續。' },
          { t: 'sub', text: '🏆 食胡（宣告勝利）：歸檔完 5 個維度的最後一張——自己摸到（自摸食胡）或別人打出（截胡食胡）。把牌全部攤開給全桌核對。' },
          { t: 'li', text: '同一張棄牌多人要搶：食胡優先於碰；同樣是碰（或食胡）時，逆時針方向離出牌者最近的人優先。' },
          { t: 'warn', text: '⚠️ 沒有人會提示你！你必須自己計算哪個維度可達到目標張數。一旦選錯、放錯牌，就會被「罰停」一回合！' },
        ],
      },
      {
        title: '🚫 六、懲罰機制：罰停',
        blocks: [
          { t: 'p', text: '如果「碰失敗 / 自摸碰失敗 / 食胡失敗」，你會被罰停一回合：' },
          { t: 'li', text: '在自己回合失敗（自摸碰 / 自摸食胡），仍要出 1 張牌才結束回合。' },
          { t: 'li', text: '下一次輪到你時直接跳過（不得摸牌或出牌），也不能碰或食胡別人的棄牌。' },
          { t: 'li', text: '碰失敗的牌、或食胡失敗時的「整副手牌」，正面朝上攤在面前給全場看——這就是你的罰停標記，解凍後收回手上。' },
        ],
      },
      {
        title: '🏁 七、勝負',
        fig: 'rounds',
        blocks: [
          { t: 'li', text: '有人食胡，立即獲勝。' },
          { t: 'li', text: '一局打 10 輪（每人各打一回合 = 1 輪）。先手玩家每次輪到自己時，把硬幣等小物往下一格推。' },
          { t: 'li', text: '打滿 10 輪仍無人食胡：已歸檔維度數（多者勝）→ 剩餘手牌張數（少者勝）。' },
        ],
      },
    ] as Sec[],
  },
  en: {
    title: 'Personalities Mahjong',
    sub: 'Big Five · Tabletop Rules',
    meta: '2–4 players · 100 cards per deck (80 Personality + 20 Knowledge)',
    scan: 'Scan for the assessment',
    round: 'Round',
    secs: [
      {
        title: '🎯 1. Ultimate Goal: Publicly File All 5 Dimensions!',
        fig: 'goal',
        blocks: [
          { t: 'p', text: 'Your goal is to collect and "publicly file" all 5 Big Five dimensions (OCEAN). The first to finish wins!' },
          { t: 'p', text: 'The target count for each dimension depends on your assessment score: round the score to get the target count (minimum 1). Example: O 3.4 → 3 cards, A 4.6 → 5 cards.' },
        ],
      },
      {
        title: '🧰 2. Setup',
        blocks: [
          { t: 'ol', text: 'Everyone scans the QR code (top right), completes the assessment, and notes their 5 target counts.' },
          { t: 'ol', text: 'Build the deck: 4 players use all Personality cards + 12 random Knowledge cards. For 2–3 players, first remove the 20 Personality cards marked "4P" in the corner, and use only 8 Knowledge cards. Shuffle and stack face down as the draw pile.' },
          { t: 'ol', text: 'Deal: each player\'s hand size = the sum of their 5 targets − 1 (hand sizes differ — that\'s normal). That 1 missing card must be completed through a "Pong" or your final "Win".' },
          { t: 'ol', text: 'Anyone holding more than 1 Knowledge card shows the extras, shuffles them back into the draw pile, and draws the same number again.' },
          { t: 'ol', text: 'Pick a first player; play then passes counter-clockwise.' },
        ],
      },
      {
        title: '🃏 3. Know the Cards',
        fig: 'cards',
        blocks: [
          { t: 'li', text: 'Personality cards (colored): the corner badge and the color band show the card\'s dimension — these are your core cards for filing and reaching your target counts.' },
          { t: 'li', text: 'Knowledge cards (grey, marked K): printed with psychology terms and definitions. They have no dimension and cannot be filed.' },
          { t: 'tip', text: 'Strategy tip: discard Knowledge cards as soon as you draw them to stay safe without giving away your strategy. You can also watch when opponents discard theirs to read their playing style!' },
        ],
      },
      {
        title: '🔄 4. Each Turn: Draw ➔ Discard',
        blocks: [
          { t: 'ol', text: 'Draw 1 card from the top of the draw pile.' },
          { t: 'ol', text: '(Optional) Self-draw Pong — see next section.' },
          { t: 'ol', text: 'Discard 1 card face up into the central "discard". Other players can seize it for a "Pong" or a "Win".' },
          { t: 'p', text: 'When the draw pile runs out, shuffle the discard (keep its top card out) and turn it over as the new draw pile.' },
        ],
      },
      {
        title: '⚡ 5. Two Core Actions: Pong & Win',
        blocks: [
          { t: 'sub', text: '🀄 Pong (public file): when you reach a dimension\'s target count, lay those cards face up in front of you. The count must match the target exactly.' },
          { t: 'li', text: 'Self-draw Pong: on your own turn, pick cards from your "hand + the just-drawn card" that meet the dimension\'s target count. (Once per turn)' },
          { t: 'li', text: 'Intercept Pong: after someone discards and before the next player draws, if your hand is just 1 card short of a dimension\'s target count, call "Pong" and take that discard to complete your file. You then skip drawing, discard 1 card, and play continues with the player after you.' },
          { t: 'sub', text: '🏆 Win (declare victory): the final card that completes all 5 dimensions — drawn yourself (Self-draw Win) or discarded by an opponent (Intercept Win). Reveal all your cards so the table can check.' },
          { t: 'li', text: 'If several players want the same discard: a Win beats a Pong; between equal calls, the player nearest the discarder counter-clockwise goes first.' },
          { t: 'warn', text: '⚠️ No one will prompt you! You must work out yourself which dimension can reach its target count. Choose wrong or misplace a card, and you\'ll be "Frozen" for one turn!' },
        ],
      },
      {
        title: '🚫 6. Penalty: Frozen',
        blocks: [
          { t: 'p', text: 'If you fail a "Pong / Self-draw Pong / Win", you\'re Frozen for one turn:' },
          { t: 'li', text: 'If you failed on your own turn (Self-draw Pong / Self-draw Win), you must still discard 1 card to end the turn.' },
          { t: 'li', text: 'Your next turn is skipped (no drawing or discarding), and you can\'t Pong or Win others\' discards.' },
          { t: 'li', text: 'The failed Pong cards, or your "entire hand" if you failed a Win, stay face up in front of you for everyone to see — that\'s your Frozen marker. Take them back when you unfreeze.' },
        ],
      },
      {
        title: '🏁 7. Results',
        fig: 'rounds',
        blocks: [
          { t: 'li', text: 'The first player to Win wins immediately.' },
          { t: 'li', text: 'A game is 10 rounds (every player takes one turn = 1 round). Each time the first player\'s turn comes around, move a coin (or any small object) one space along.' },
          { t: 'li', text: 'If 10 rounds pass with no Win: most filed dimensions wins ➔ if tied, fewer remaining hand cards wins.' },
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
          <QRCodeSVG value={GAME_URL} size={70} level="M" fgColor="#2a241b" bgColor="#fbf8f1" />
          <div className="cap">{s.scan}<br />{DISPLAY_URL}</div>
        </div>
      </div>
      <div className="cols">
        {s.secs.map((sec, i) => (
          <section key={i} className="rsec">
            <h2>{sec.title}</h2>
            {sec.fig === 'goal' || sec.fig === 'cards' ? fig(sec.fig) : null}
            {sec.blocks.map(renderBlock)}
            {sec.fig === 'rounds' ? fig('rounds') : null}
          </section>
        ))}
      </div>
    </div>
  );
}

export function RulesCard() {
  return (
    <div className="screen">
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
          border-bottom: 2px solid #c89b5d; padding-bottom: 3mm; margin-bottom: 3mm; }
        h1 { margin: 0; display: flex; align-items: baseline; flex-wrap: wrap; gap: 2px 12px;
          font-family: ui-serif, Georgia, "Songti TC", serif; }
        .t1 { font-size: 27px; letter-spacing: 1.5px; color: #1c1812; }
        .t2 { font-size: 17px; color: #6b5d44; }
        .meta { margin: 4px 0 0; font-size: 11.5px; color: #6b5d44; }
        .qr { display: flex; flex-direction: column; align-items: flex-end; flex: none; }
        .qr .cap { font-size: 9px; color: #6b5d44; text-align: right; margin-top: 2px; line-height: 1.3; }

        .cols { column-count: 2; column-gap: 7mm; }
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
