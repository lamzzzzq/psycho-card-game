import type { Metadata } from 'next';
import { QUESTIONS } from '@/data/questions';
import { KNOWLEDGE_CARDS } from '@/data/dummy-cards';
import { DIMENSION_META } from '@/data/dimensions';
import type { Dimension } from '@/types';

// 實體版整副牌（Big Five・明牌版・中英雙語）—— 一副 100 張 = 人格牌 80 + 知識牌 20。
//
// 為什麼是明牌版：維度直接印在卡面（左上角圓標 + 中間色帶），和電子版預設的「明牌」完全一樣
// ——自己看得到、對手看不到（牌在自己手上）。這樣就不需要維度卡、查閱代幣、色標、牌架，
// 規則卡一張搞定。半公開／隱藏難度仍然只在電子版玩。
//
// 人格牌 80 = 50 道真題 + 每維題號升序前 6 道各多印 1 張（「·2」）。
// 其中每維後 4 張複製牌角落印「4P」＝只在 4 人局用；2–3 人局開盒抽走這 20 張（§3 of 規格頁）。
//
// 用法（匯出見 print-assets/README.md）：
//   /print/cards                    每張一頁 69×94mm（含 3mm 出血）→ 給印廠
//   /print/cards?side=back          卡背一頁
//   /print/cards?layout=a4          A4 3×3 拼版，正反面交替（雙面列印、長邊翻）→ 自己印
//
// 文字全是 HTML（列印成 PDF 仍是向量），插畫與框線是 SVG。

export const metadata: Metadata = { robots: { index: false, follow: false } };

const B = 3; // 出血 mm
const TW = 63; // 成品寬
const TH = 88; // 成品高

const GOLD = '#9a7448';
const GOLD_SOFT = '#b9904f';
const GOLD_BRIGHT = '#c39a52';
// 印刷檔一律實色：半透明在 PDF 會被拆成透明群組，印廠 RIP 扁平化時可能出灰塊。
// 下列色值＝原半透明色疊在牌面底色上的結果。
const GOLD_DIM = '#c4ac88';
const INK = '#2a241b';
const INK_SOFT = '#5c5142';
const KNOW_GREY = '#9a8c74';

const DUP_4P = 6; // 4 人局每維複製牌
const DUP_23P = 2; // 2–3 人局保留的複製牌

type PersonaCard = { kind: 'persona'; id: number; dim: Dimension; zh: string; en: string; dup: boolean; only4p: boolean; reserve?: boolean };
type KnowCard = { kind: 'know'; no: number; termZh: string; termEn: string; defZh: string; defEn: string };
type Card = PersonaCard | KnowCard;

function buildDeck(): Card[] {
  const persona: PersonaCard[] = QUESTIONS.map((q) => ({
    kind: 'persona', id: q.id, dim: q.dimension as Dimension, zh: q.text, en: q.textEn ?? '', dup: false, only4p: false,
  }));
  const dups: PersonaCard[] = [];
  // 備用池：每維沒被複製的後 4 題各再印一張 → 50 題每題剛好 2 張。
  // 平時收在盒裏，起手合計超過上限（4 人 84 張）才洗進牌堆，全員滿分也發得下。
  const reserve: PersonaCard[] = [];
  for (const d of ['O', 'C', 'E', 'A', 'N'] as Dimension[]) {
    const ids = persona.filter((c) => c.dim === d).map((c) => c.id).sort((a, b) => a - b);
    ids.slice(0, DUP_4P).forEach((id, i) => {
      const src = persona.find((c) => c.id === id)!;
      dups.push({ ...src, dup: true, only4p: i >= DUP_23P });
    });
    ids.slice(DUP_4P).forEach((id) => {
      reserve.push({ ...persona.find((c) => c.id === id)!, dup: true, only4p: false, reserve: true });
    });
  }
  dups.sort((a, b) => a.id - b.id);
  reserve.sort((a, b) => a.id - b.id);
  const know: KnowCard[] = KNOWLEDGE_CARDS.map((k, i) => ({
    kind: 'know', no: i + 1, termZh: k.termZh, termEn: k.term, defZh: k.definitionZh, defEn: k.definition,
  }));
  return [...persona, ...dups, ...reserve, ...know];
}

/** 送印檔名（印廠要求張數寫在檔名裏）。角標已拿掉，同題兩張完全相同 → 只給原題一個檔、寫 2 張；複製牌不出檔。 */
function fileName(c: Card, i: number): string | undefined {
  if (c.kind === 'know') return `${String(50 + c.no).padStart(2, '0')}_知識牌_K${String(c.no).padStart(2, '0')}_1張`;
  if (c.dup) return undefined;
  return `${String(i + 1).padStart(2, '0')}_人格牌_${c.dim}_題${c.id}_2張`;
}

const strip = (s: string) => s.replace(/[。．.\s]+$/, '');

/** 中文按詞換行：每個詞包 nowrap，避免「概念」被拆成上下兩行（同電子版 TarotCard）。 */
function zhWords(text: string) {
  const seg = new Intl.Segmenter('zh', { granularity: 'word' });
  return Array.from(seg.segment(text)).map((p, i) =>
    p.isWordLike ? <span key={i} style={{ whiteSpace: 'nowrap' }}>{p.segment}</span> : <span key={i}>{p.segment}</span>,
  );
}

function spark(cx: number, cy: number, s: number) {
  const k = s * 0.28;
  return `M${cx},${cy - s} C${cx},${cy - k} ${cx + k},${cy} ${cx + s},${cy} C${cx + k},${cy} ${cx},${cy + k} ${cx},${cy + s} C${cx},${cy + k} ${cx - k},${cy} ${cx - s},${cy} C${cx - k},${cy} ${cx},${cy - k} ${cx},${cy - s} Z`;
}

// 版面座標一律是「成品座標」(mm)，畫的時候整體平移 B。
const AL = 6, AR = 57, ATOP = 6.6, ASIDE = 19, ABOT = 50; // 拱形圖窗
const ARCH = `M${AL},${ABOT} L${AL},${ASIDE} C${AL},${ASIDE - 7} ${AL + 11.5},${ATOP + 1.2} ${TW / 2},${ATOP} C${AR - 11.5},${ATOP + 1.2} ${AR},${ASIDE - 7} ${AR},${ASIDE} L${AR},${ABOT} Z`;
const ARCH_IN = `M${AL + 0.9},${ABOT - 0.5} L${AL + 0.9},${ASIDE} C${AL + 0.9},${ASIDE - 6.4} ${AL + 12},${ATOP + 2} ${TW / 2},${ATOP + 0.9} C${AR - 12},${ATOP + 2} ${AR - 0.9},${ASIDE - 6.4} ${AR - 0.9},${ASIDE} L${AR - 0.9},${ABOT - 0.5}`;
const BOX_T = 55, BOX_B = 79.2; // 底部文字框
const IDX = { cx: 8.5, cy: 8.5, r: 2.75 }; // 左上角維度圓標（扇形拿牌時唯一露出來的角）

function Frame({ uid, card }: { uid: string; card: Card }) {
  const isKnow = card.kind === 'know';
  const color = isKnow ? KNOW_GREY : DIMENSION_META[card.dim].colorHex;
  const letter = isKnow ? 'K' : card.dim;
  return (
    <svg className="art" viewBox={`${-B} ${-B} ${TW + 2 * B} ${TH + 2 * B}`} width={`${TW + 2 * B}mm`} height={`${TH + 2 * B}mm`}>
      <defs>
        <clipPath id={`a${uid}`}><path d={ARCH} /></clipPath>
        <linearGradient id={`bg${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#eadfc8" /><stop offset="0.58" stopColor="#e1d1b2" /><stop offset="1" stopColor="#d5be95" />
        </linearGradient>
        <radialGradient id={`g${uid}`} cx="50%" cy="18%" r="60%">
          <stop offset="0" stopColor="#fffaf0" />
          <stop offset="1" stopColor="#f9f1e0" />
        </radialGradient>
      </defs>

      {/* 底色鋪滿出血 */}
      <rect x={-B} y={-B} width={TW + 2 * B} height={TH + 2 * B} fill={`url(#bg${uid})`} />

      {/* 圖窗 */}
      <g clipPath={`url(#a${uid})`}>
        {card.kind === 'persona' ? (
          <image href={`/cards/${card.id}.webp`} x={AL} y={ATOP} width={AR - AL} height={ABOT - ATOP} preserveAspectRatio="xMidYMid slice" />
        ) : (
          <>
            <rect x={AL} y={ATOP} width={AR - AL} height={ABOT - ATOP} fill="#fdf8f1" />
            <rect x={AL} y={ATOP} width={AR - AL} height={ABOT - ATOP} fill={`url(#g${uid})`} />
            {[14, 22, 30, 38].map((r) => (
              <circle key={r} cx={TW / 2} cy={ATOP - 2} r={r} fill="none" stroke="#dacab6" strokeWidth="0.12" />
            ))}
          </>
        )}
      </g>
      <path d={ARCH} fill="none" stroke={GOLD} strokeWidth="0.42" />
      <path d={ARCH_IN} fill="none" stroke={GOLD_SOFT} strokeWidth="0.16" />

      {/* 外框（離裁切線 3mm，裁偏 1mm 也不會切到線） */}
      <rect x="3" y="3" width={TW - 6} height={TH - 6} rx="3" fill="none" stroke={GOLD} strokeWidth="0.4" />
      <rect x="3.9" y="3.9" width={TW - 7.8} height={TH - 7.8} rx="2.3" fill="none" stroke={GOLD_SOFT} strokeWidth="0.15" />

      {/* 頂部紋章 + 右上星 */}
      <path d={spark(TW / 2, 3, 1.3)} fill={GOLD_BRIGHT} />
      <path d={spark(TW - 8.5, 8.5, 1.2)} fill={GOLD_BRIGHT} />
      <path d={spark(8.5, TH - 6.8, 1.0)} fill={GOLD_BRIGHT} />
      <path d={spark(TW - 8.5, TH - 6.8, 1.0)} fill={GOLD_BRIGHT} />

      {/* 左上角維度圓標 */}
      <circle cx={IDX.cx} cy={IDX.cy} r={IDX.r + 0.45} fill="#fdf8f1" stroke={GOLD_SOFT} strokeWidth="0.15" />
      <circle cx={IDX.cx} cy={IDX.cy} r={IDX.r} fill={color} />
      <text x={IDX.cx} y={IDX.cy + 1.35} textAnchor="middle" fontSize="3.9" fontWeight="800" fill="#fff"
        fontFamily="-apple-system, 'Helvetica Neue', Arial, sans-serif">{letter}</text>

      {/* 底部文字框 */}
      <rect x={AL} y={BOX_T} width={AR - AL} height={BOX_B - BOX_T} rx="1.4" fill="#fcf7ee" stroke={GOLD_SOFT} strokeWidth="0.26" />
      <path d={`M${AL + 1.7},${BOX_T + 2.8} v-1.4 a0.7,0.7 0 0 1 0.7,-0.7 h1.4`} fill="none" stroke={GOLD} strokeWidth="0.25" />
      <path d={`M${AR - 1.7},${BOX_T + 2.8} v-1.4 a0.7,0.7 0 0 0 -0.7,-0.7 h-1.4`} fill="none" stroke={GOLD} strokeWidth="0.25" />
      <path d={`M${AL + 1.7},${BOX_B - 2.8} v1.4 a0.7,0.7 0 0 0 0.7,0.7 h1.4`} fill="none" stroke={GOLD} strokeWidth="0.25" />
      <path d={`M${AR - 1.7},${BOX_B - 2.8} v1.4 a0.7,0.7 0 0 1 -0.7,0.7 h-1.4`} fill="none" stroke={GOLD} strokeWidth="0.25" />

      {/* 拱底分隔線（色帶壓在中間） */}
      <line x1={AL + 2} y1={ABOT + 2.5} x2={AR - 2} y2={ABOT + 2.5} stroke={GOLD_DIM} strokeWidth="0.18" />
    </svg>
  );
}

function CardFace({ card, uid }: { card: Card; uid: string }) {
  if (card.kind === 'persona') {
    const meta = DIMENSION_META[card.dim];
    return (
      <div className="sheet">
        <Frame uid={uid} card={card} />
        <div className="band" style={{ background: meta.colorHex }}>
          <b>{card.dim}</b><span>{meta.name}</span><i>{meta.nameEn}</i>
        </div>
        <div className="txt">
          <p className="zh">{zhWords(strip(card.zh))}</p>
          <p className="en">{strip(card.en)}</p>
        </div>
        <div className="no">
          {card.id}
        </div>
      </div>
    );
  }
  const longTermEn = card.termEn.length > 30;
  return (
    <div className="sheet">
      <Frame uid={uid} card={card} />
      <div className="kterm">
        <p className="kzh">{zhWords(card.termZh)}</p>
        <p className="ken" style={{ fontSize: longTermEn ? '8pt' : '9pt' }}>{card.termEn}</p>
      </div>
      <div className="band" style={{ background: KNOW_GREY }}>
        <span>知識牌</span><i>Knowledge</i>
      </div>
      <div className="txt">
        <p className="kdzh">{zhWords(strip(card.defZh))}</p>
        <p className="kden">{strip(card.defEn)}</p>
      </div>
      <div className="no">K{String(card.no).padStart(2, '0')}</div>
    </div>
  );
}

function CardBack() {
  return (
    <div className="sheet">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="back" src="/print/card-back.png" alt="" />
    </div>
  );
}

/** A4 拼版的一格：只露出成品 63×88，出血藏在格子外。 */
function Cell({ children }: { children: React.ReactNode }) {
  return <div className="cell"><div className="cell-in">{children}</div></div>;
}

const CROP = (() => {
  // 3×3 格線座標（A4 置中），用來畫頁邊裁切標記
  const gx = (210 - 3 * TW) / 2, gy = (297 - 3 * TH) / 2;
  const xs = [0, 1, 2, 3].map((i) => gx + i * TW);
  const ys = [0, 1, 2, 3].map((i) => gy + i * TH);
  return { gx, gy, xs, ys };
})();

function CropMarks() {
  const { xs, ys, gx, gy } = CROP;
  const L = 6, G = 1.5;
  return (
    <svg className="crop" viewBox="0 0 210 297" width="210mm" height="297mm">
      {xs.map((x) => (
        <g key={`x${x}`} stroke="#000" strokeWidth="0.15">
          <line x1={x} y1={gy - G - L} x2={x} y2={gy - G} />
          <line x1={x} y1={297 - gy + G} x2={x} y2={297 - gy + G + L} />
        </g>
      ))}
      {ys.map((y) => (
        <g key={`y${y}`} stroke="#000" strokeWidth="0.15">
          <line x1={gx - G - L} y1={y} x2={gx - G} y2={y} />
          <line x1={210 - gx + G} y1={y} x2={210 - gx + G + L} y2={y} />
        </g>
      ))}
    </svg>
  );
}

export default async function Page({ searchParams }: { searchParams: Promise<{ layout?: string; side?: string }> }) {
  const { layout, side } = await searchParams;
  const deck = buildDeck();
  const a4 = layout === 'a4';

  const css = `
    @page { size: ${a4 ? '210mm 297mm' : `${TW + 2 * B}mm ${TH + 2 * B}mm`}; margin: 0; }
    html, body { margin: 0; padding: 0; background: #6b6b6b; }
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; box-sizing: border-box; }
    .cjk { font-family: var(--font-sans-cn), "PingFang HK", "Noto Sans TC", system-ui, sans-serif; }

    .sheet { width: ${TW + 2 * B}mm; height: ${TH + 2 * B}mm; position: relative; overflow: hidden; background: #e1d1b2; }
    .sheet .art { position: absolute; inset: 0; display: block; }
    .sheet .back { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }

    .band {
      position: absolute; left: 50%; top: ${B + ABOT + 2.5}mm; transform: translate(-50%, -50%);
      display: flex; align-items: baseline; gap: 1.3mm; white-space: nowrap;
      padding: 0.9mm 2.8mm 1mm; border-radius: 99px; color: #fff;
      /* 印刷品不用投影／半透明：Chrome 會把 box-shadow 轉成半透明點陣，閱讀器或印廠 RIP 會顯示成灰色方塊 */
      border: 0.25mm solid #b59a70;
      font-family: var(--font-sans-cn), "PingFang HK", system-ui, sans-serif; line-height: 1;
    }
    .band b { font-size: 8pt; font-weight: 800; }
    .band span { font-size: 7.5pt; font-weight: 700; letter-spacing: 0.04em; }
    .band i { font-style: normal; font-size: 6.5pt; font-weight: 600; letter-spacing: 0.02em; }

    .txt {
      position: absolute; left: ${B + AL + 2}mm; right: ${B + (TW - AR) + 2}mm;
      top: ${B + BOX_T + 1.4}mm; bottom: ${B + (TH - BOX_B) + 1.2}mm;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.1mm;
      text-align: center; font-family: var(--font-sans-cn), "PingFang HK", "Noto Sans TC", system-ui, sans-serif;
    }
    .txt p { margin: 0; text-wrap: balance; }
    .zh { font-size: 10.5pt; font-weight: 600; color: ${INK}; line-height: 1.3; }
    .en { font-size: 7.4pt; color: ${INK_SOFT}; line-height: 1.28; }
    .kdzh { font-size: 8.6pt; color: ${INK}; line-height: 1.38; }
    .kden { font-size: 6.9pt; color: ${INK_SOFT}; line-height: 1.3; }

    .kterm {
      position: absolute; left: ${B + AL + 3}mm; right: ${B + (TW - AR) + 3}mm; top: ${B + ASIDE - 5}mm; bottom: ${B + (TH - ABOT) + 5}mm;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1.6mm; text-align: center;
      font-family: var(--font-sans-cn), "PingFang HK", "Noto Sans TC", system-ui, sans-serif;
    }
    .kterm p { margin: 0; text-wrap: balance; }
    .kzh { font-size: 13pt; font-weight: 700; color: ${INK}; line-height: 1.28; }
    .ken { font-weight: 600; color: ${INK_SOFT}; line-height: 1.25; }

    .no {
      position: absolute; left: 0; right: 0; bottom: ${B + 5.6}mm; text-align: center;
      font-family: -apple-system, "Helvetica Neue", Arial, sans-serif; font-size: 5.6pt; color: #886a42;
      letter-spacing: 0.03em; line-height: 1;
    }
    .p4 { margin-left: 1.2mm; padding: 0.2mm 0.8mm; border: 0.18mm solid #8f7048; border-radius: 0.6mm; font-weight: 700; font-size: 5pt; }

    /* A4 拼版 */
    .page { width: 210mm; height: 297mm; position: relative; background: #fff; break-after: page; overflow: hidden; }
    .page:last-child { break-after: auto; }
    .grid { position: absolute; left: ${CROP.gx}mm; top: ${CROP.gy}mm; display: grid; grid-template-columns: repeat(3, ${TW}mm); grid-auto-rows: ${TH}mm; }
    .cell { width: ${TW}mm; height: ${TH}mm; overflow: hidden; position: relative; }
    .cell-in { position: absolute; left: -${B}mm; top: -${B}mm; }
    .crop { position: absolute; inset: 0; }
    .tag { position: absolute; left: 0; right: 0; bottom: 5mm; text-align: center; font: 7pt system-ui, sans-serif; color: #999; }

    /* 單張模式：一張一頁 */
    .solo .sheet { break-after: page; }
    .solo .sheet:last-child { break-after: auto; }

    @media screen {
      body { padding: 20px; }
      .solo { display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; }
      .solo .sheet { box-shadow: 0 6px 16px rgba(0,0,0,0.35); }
      .pages { display: flex; flex-direction: column; gap: 16px; align-items: center; }
      .trim { position: absolute; inset: ${B}mm; outline: 0.2mm dashed rgba(220,60,60,0.6); pointer-events: none; }
      .hint { color: #eee; font: 13px/1.7 system-ui, sans-serif; max-width: 760px; margin: 0 auto 16px; }
      .hint a { color: #ffd79a; }
    }
    @media print { .trim, .hint { display: none !important; } .solo { display: block; } }
  `;

  const hint = (
    <p className="hint">
      人格麻將實體版 · Big Five 明牌版 · 一副 {deck.length} 張（人格牌 {deck.filter((c) => c.kind === 'persona').length} + 知識牌 {KNOWLEDGE_CARDS.length}）。
      {' '}<a href="/print/cards">單張正面</a> · <a href="/print/cards?side=back">卡背</a> · <a href="/print/cards?layout=a4">A4 雙面拼版</a>。
      紅虛線＝裁切線（只在螢幕顯示）。匯出：⌘P → 儲存為 PDF → 邊界「無」→ 勾「背景圖形」。
    </p>
  );

  if (a4) {
    // 正反面交替：第 1 頁正面 9 張、第 2 頁卡背 9 張⋯ 雙面列印（長邊翻）即對齊。
    // 卡背全部相同且置中，左右鏡像與否不影響。
    const sheets: Card[][] = [];
    for (let i = 0; i < deck.length; i += 9) sheets.push(deck.slice(i, i + 9));
    const fronts = side !== 'back';
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: css }} />
        {hint}
        <div className="pages">
          {sheets.map((cards, si) => (
            <FragmentPair key={si}>
              {fronts && (
                <div className="page">
                  <div className="grid">
                    {cards.map((c, i) => <Cell key={i}><CardFace card={c} uid={`p${si}c${i}`} /></Cell>)}
                  </div>
                  <CropMarks />
                  <div className="tag">正面 {si + 1}/{sheets.length}</div>
                </div>
              )}
              <div className="page">
                <div className="grid">
                  {cards.map((_, i) => <Cell key={i}><CardBack /></Cell>)}
                </div>
                <CropMarks />
              </div>
            </FragmentPair>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {hint}
      <div className="solo">
        {side === 'back' ? (
          <div style={{ position: 'relative' }}><CardBack /></div>
        ) : (
          deck.map((c, i) => (
            <div key={i} style={{ position: 'relative' }} data-file={fileName(c, i)}>
              <CardFace card={c} uid={`s${i}`} />
              <div className="trim" />
            </div>
          ))
        )}
      </div>
    </>
  );
}

function FragmentPair({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
