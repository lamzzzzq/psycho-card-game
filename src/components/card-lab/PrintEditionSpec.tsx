'use client';

// 印刷版（實體卡牌）方案 —— card-lab 的第三個 tab（?deck=print）。
//
// 定位：這頁是「要拿去印廠 + 塞進盒子當說明書」的規格書，不是遊戲頁。
// 規則一律**改寫自現行電子版**（真相源：src/lib/i18n/rules.ts、docs/DECK_BALANCE.md、
// docs/HEXACO_DECK_BALANCE.md、docs/ACTION_BUTTON_RULES.md、src/lib/game-logic.ts），
// 只在「電子版靠程式自動做、實體版必須有人動手」的地方加規則，其餘逐條對齊，不另創玩法。
//
// ⚠️ 題號表一律由 QUESTIONS / HEXACO_QUESTIONS 現場算出，不手抄——牌庫一改這頁跟著改。

import { useState } from 'react';
import { QUESTIONS } from '@/data/questions';
import { HEXACO_QUESTIONS } from '@/data/hexaco-questions';
import { KNOWLEDGE_CARDS } from '@/data/dummy-cards';

type DeckKind = 'big-five' | 'hexaco';

// 兩套牌的維度顯示順序與中文名（與遊戲側配色/命名一致）
const BIG_FIVE_DIMS = [
  { key: 'O', zh: '開放性', en: 'Openness', color: '#2A9D8F' },
  { key: 'C', zh: '盡責性', en: 'Conscientiousness', color: '#2A4365' },
  { key: 'E', zh: '外向性', en: 'Extraversion', color: '#D97706' },
  { key: 'A', zh: '宜人性', en: 'Agreeableness', color: '#E07A5F' },
  { key: 'N', zh: '神經質', en: 'Neuroticism', color: '#7E6C8F' },
] as const;

const HEXACO_DIMS = [
  { key: 'H', zh: '誠實－謙遜', en: 'Honesty–Humility', color: '#5F7A46' },
  { key: 'E', zh: '情緒性', en: 'Emotionality', color: '#7E6C8F' },
  { key: 'X', zh: '外向性', en: 'eXtraversion', color: '#D97706' },
  { key: 'A', zh: '宜人性', en: 'Agreeableness', color: '#E07A5F' },
  { key: 'C', zh: '盡責性', en: 'Conscientiousness', color: '#2A4365' },
  { key: 'O', zh: '開放性', en: 'Openness', color: '#2A9D8F' },
] as const;

// 電子版每維 16 張 = 10 道真題 + 隨機複製 6（每局重抽）。實體不能「每局隨機」，
// 故固定成：該維題號升序的前 6 道各多印 1 張。純屬約定，對平衡無影響
// （複製牌只有 dimension 參與玩法，題面重複不影響任何判定）。
const DUP_PER_DIM_4P = 6;
const DUP_PER_DIM_23P = 2;

function dimGroups(kind: DeckKind) {
  const dims = kind === 'hexaco' ? HEXACO_DIMS : BIG_FIVE_DIMS;
  const qs = kind === 'hexaco' ? HEXACO_QUESTIONS : QUESTIONS;
  return dims.map((d) => {
    const ids = qs.filter((q) => q.dimension === d.key).map((q) => q.id).sort((a, b) => a - b);
    return { ...d, ids, dup4p: ids.slice(0, DUP_PER_DIM_4P), dup23p: ids.slice(0, DUP_PER_DIM_23P) };
  });
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="psy-serif flex items-baseline gap-2 text-lg text-[var(--psy-ink)]">
        <span className="rounded-full bg-[var(--psy-accent-soft)] px-2.5 py-0.5 text-sm text-[var(--psy-accent-strong)]">{n}</span>
        {title}
      </h2>
      <div className="space-y-3 text-[13.5px] leading-7 text-[var(--psy-ink-soft)]">{children}</div>
    </section>
  );
}

function Table({ head, rows, foot }: { head: string[]; rows: (string | number)[][]; foot?: (string | number)[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-[13px]">
        <thead>
          <tr className="bg-[var(--psy-accent-soft)] text-left text-[var(--psy-accent-strong)]">
            {head.map((h, i) => (
              <th key={i} className="border border-[var(--psy-border)] px-3 py-2 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="odd:bg-white/40">
              {r.map((c, j) => (
                <td key={j} className={`border border-[var(--psy-border)] px-3 py-2 ${j === 0 ? 'font-medium text-[var(--psy-ink)]' : ''}`}>{c}</td>
              ))}
            </tr>
          ))}
          {foot && (
            <tr className="bg-[var(--psy-accent-soft)] font-semibold text-[var(--psy-ink)]">
              {foot.map((c, j) => (
                <td key={j} className="border border-[var(--psy-border)] px-3 py-2">{c}</td>
              ))}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Note({ tone = 'tip', children }: { tone?: 'tip' | 'warn' | 'diff'; children: React.ReactNode }) {
  const styles = {
    tip: 'border-[rgba(200,155,93,0.35)] bg-[rgba(200,155,93,0.12)] text-[var(--psy-accent-strong)]',
    warn: 'border-[rgba(201,96,63,0.35)] bg-[rgba(201,96,63,0.1)] text-[var(--psy-danger)]',
    diff: 'border-[rgba(90,120,160,0.3)] bg-[rgba(90,120,160,0.08)] text-[var(--psy-ink-soft)]',
  }[tone];
  return <p className={`rounded-xl border px-3.5 py-2.5 text-[13px] leading-6 ${styles}`}>{children}</p>;
}

export function PrintEditionSpec() {
  const [kind, setKind] = useState<DeckKind>('big-five');
  const groups = dimGroups(kind);
  const dimCount = groups.length;
  const persona4p = dimCount * 16;
  const persona23p = dimCount * 12;
  const know4p = 12;
  const know23p = 8;
  // 知識牌全部印齊，一局只從中選 12／8 張進牌庫（見 §1、§3）
  const knowPrint = KNOWLEDGE_CARDS.length;
  const bigFiveTotal = BIG_FIVE_DIMS.length * 16 + knowPrint;
  const hexacoTotal = HEXACO_DIMS.length * 16 + knowPrint;
  // 一副 = 一種語言 × 一種版本。中英分版 × 標準／明牌兩版 = 四副
  const deckOne = persona4p + knowPrint;
  const deckAll = deckOne * 4;
  const label = kind === 'hexaco' ? 'HEXACO（六維）' : 'Big Five（五維）';
  const maxHand = dimCount * 5 - 1;
  const minHand = dimCount * 1 - 1;

  return (
    <div className="space-y-10">
      <header className="space-y-3">
        <h2 className="psy-serif text-2xl text-[var(--psy-ink)]">印刷版（實體卡牌）方案</h2>
        <p className="text-[13.5px] leading-7 text-[var(--psy-ink-soft)]">
          規則全部改寫自現行電子版，逐條對齊；只有「電子版由程式自動完成、實體版必須有人動手」的環節
          （洗牌、發牌、判定碰／食胡對錯、看牌難度、搶牌先後）才補上實體做法。每一處這樣的改動都在
          <strong> §9 差異對照 </strong>裏列明原因。
        </p>
        <div className="flex w-fit items-center gap-1 rounded-full border border-[var(--psy-border)] bg-white/60 p-1">
          {([['big-five', 'Big Five 版'], ['hexaco', 'HEXACO 版']] as const).map(([id, t]) => (
            <button
              key={id}
              type="button"
              onClick={() => setKind(id)}
              className={`rounded-full px-4 py-1.5 text-sm transition ${kind === id ? 'bg-[var(--psy-accent)] font-semibold text-white shadow-sm' : 'text-[var(--psy-ink-soft)] hover:bg-[var(--psy-accent-soft)]'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      <Section n="§0" title="一頁下單清單（拿這張去下單）">
        <p>
          以下是<strong>{label} 一盒</strong>的完整用量，含標準版與明牌入門版兩副牌。
          A 表交印廠、B 表可同一家印廠做、C 表買現成的不必定制。每項為什麼是這個數，
          往下各節都有推導。
        </p>

        <p className="pt-1 font-medium text-[var(--psy-ink)]">A · 卡牌（找印廠定制）</p>
        <p>
          卡面<strong>中英分版</strong>、版本分<strong>標準／明牌入門</strong>兩種，
          交叉出<strong>四副</strong>。每副自成一盒牌、各 {deckOne} 張：
        </p>
        <Table
          head={['副', '人格牌', '知識牌', '一副張數', '新增正面版面']}
          rows={[
            ['標準版 · 中文', persona4p, knowPrint, deckOne, `${dimCount * 10} 人格 + ${knowPrint} 知識`],
            ['標準版 · 英文', persona4p, knowPrint, deckOne, `${dimCount * 10} 人格 + ${knowPrint} 知識`],
            ['明牌版 · 中文', persona4p, knowPrint, deckOne, `${dimCount * 10} 人格（知識牌沿用中文版）`],
            ['明牌版 · 英文', persona4p, knowPrint, deckOne, `${dimCount * 10} 人格（知識牌沿用英文版）`],
          ]}
          foot={['合計', persona4p * 4, knowPrint * 4, deckAll, `${dimCount * 10 * 4 + knowPrint * 2} 種正面 + 4 種卡背`]}
        />
        <Note tone="warn">
          <strong>四副的卡背必須四種都不同</strong>（哪怕只差角上一個「EN」「明」小標）——
          背面朝下時分不出是哪一副，混一次就得整盒重數。
        </Note>
        <Note tone="tip">
          <strong>但這次先打 1 副樣：標準版 · 中文 {deckOne} 張 + 全套配件。</strong>
          理由：① 它本身就能完整開打（標準版配維度卡連明牌檔都能打，明牌版反過來打不了半公開／隱藏）；
          ② 尺寸、藍芯、顏色、牌架這些要驗的東西，一副就驗完了；
          ③ 萬一尺寸或工藝要改，只廢一副的版，不是四副。<strong>樣品通過再開另外三副的版。</strong>
        </Note>

        <p className="pt-1 font-medium text-[var(--psy-ink)]">B · 紙板與印刷配件（可同一家做）</p>
        <Table
          head={['品項', '數量', '規格']}
          rows={[
            ['個人目標板', '4 張', `${dimCount} 行維度 × 1–5 刻度，卡紙即可；維度名印中英雙語，兩種語言共用`],
            ['歸檔區墊板', '4 張', '放得下 5 張橫排卡牌的長條墊板，無文字'],
            ['維度卡', `${dimCount} 張／語言`, '雙面：正＝該維 10 個題號（升序），背＝該維定義與高／低分；卡緣印維度色。文字量大，中英各印一套'],
            ['輪次計數卡', '1 張', '印 10 格，一局固定打 10 輪'],
            ['測評 QR 卡', '1 張', `開局第一步每人要掃碼做 ${kind === 'hexaco' ? 'HEXACO-60' : 'IPIP-50'}（見 §5），盒裏得有張碼`],
            ['規則書', '1 本／語言', '本頁 §5–§9 的內容 + 明牌版說明'],
            ['盒子', '1 個', `裝得下 ${persona4p * 2 + knowPrint * 2} 張牌 + 全部配件 + ${4} 個牌架`],
          ]}
        />

        <Note tone="tip">
          <strong>只有維度卡和規則書分中英</strong>（文字量大、擠不進一張）。目標板、墊板、
          輪次卡這些字少或沒字，一律做雙語共用，不必跟著分版。
        </Note>

        <p className="pt-1 font-medium text-[var(--psy-ink)]">C · 買現成的（不必定制）</p>
        <Table
          head={['品項', '數量', '買什麼']}
          rows={[
            ['維度色標', `${dimCount * 5 * 4} 枚`, `${dimCount} 色小色標片／夾子，每人每色 5 枚——半公開難度整局累積不回收`],
            ['目標數字標記', `${dimCount * 4} 枚`, `素色圓片，每人 ${dimCount} 枚（每維 1 枚，壓在目標板的 1–5 刻度上）`],
            ['查閱代幣', '16 枚', '素色籌碼，每人 4 枚，每回合發、用完不留'],
            ['牌架', '4 個', `至少放得下 ${maxHand} 張牌——這是必需品不是配件`],
            ['罰停標記', '4 枚', '醒目紅色，一眼看得出誰被罰停'],
            ['莊家標記', '1 枚', '任何一枚顯眼的標記物'],
            ['沙漏', '1 個', '約 10 秒，搶牌計時用'],
          ]}
        />

        <p className="pt-1 font-medium text-[var(--psy-ink)]">D · 要交給印廠的檔案</p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li className="text-[var(--psy-ink)]"><strong>打樣這一副只要交前三項：</strong></li>
          <li>標準版中文人格牌正面 <strong>{dimCount * 10} 版</strong>（題面文字 + 插畫 + 題號，<strong>不含</strong>維度標籤）</li>
          <li>
            中文知識牌正面 <strong>{knowPrint} 版</strong> ——
            <strong className="text-[var(--psy-accent-strong)]">已完成</strong>，
            <code>print-assets/knowledge-cards_zh_63x88_bleed3.pdf</code>（20 頁，文字為向量）
          </li>
          <li>
            卡背 <strong>1 版</strong> ——
            <strong className="text-[var(--psy-accent-strong)]">已完成</strong>，
            <code>print-assets/card-back_*</code>；另加 B 表配件版面
          </li>
          <li className="pt-1 text-[var(--psy-ink)]"><strong>量產四副時再加：</strong></li>
          <li>英文人格牌 {dimCount * 10} 版、英文知識牌 {knowPrint} 版</li>
          <li>明牌版人格牌中英各 {dimCount * 10} 版（＝標準版加維度色帶與維度名）</li>
          <li>卡背另 <strong>3 版</strong>，四副各一</li>
        </ul>
        <Note tone="warn">
          <strong>打樣回來先確認三件事：</strong>① 拿一張人格牌對著燈看，
          背面透不透得出插畫顏色（透了就等於明牌，整個標準版作廢）；
          ② 明牌版的維度色帶與 §11 的色號一致；
          ③ 牌架真的放得下 {maxHand} 張牌。
        </Note>
      </Section>

      <Section n="§1" title="一副要印多少張">
        <p>
          印<strong>一副滿配（4 人用）</strong>即可，2 人／3 人局是它的子集——開盒時按人數取出多餘的牌，
          不必印三種盒子。{label} 滿配總張數：
        </p>
        <Table
          head={['牌種', '印量', '說明']}
          rows={[
            ['人格牌', persona4p, `${dimCount} 維 × 16 張`],
            ['知識牌', knowPrint, `${knowPrint} 個心理學術語各 1 張，全部印齊`],
          ]}
          foot={['合計', persona4p + knowPrint, '一副牌的印刷總量']}
        />
        <Note tone="tip">
          <strong>印量不等於一局的牌庫。</strong>知識牌 {knowPrint} 個術語全部印出來，但一局只放
          <strong> {know4p} 張</strong>（4 人）／<strong>{know23p} 張</strong>（2–3 人）進牌庫，
          由這桌人自己挑——想扣課程進度就挑剛教過的術語，沒想法就隨機抽。所以 4 人局實際牌庫是
          {persona4p + know4p} 張、2／3 人局 {persona23p + know23p} 張，見 §3。
        </Note>
        <Note tone="diff">
          為什麼不挑定 12 個直接印：知識牌<strong>沒有維度、不參與歸檔</strong>，彼此完全等價，
          放哪幾張對平衡零影響。全印只多 {knowPrint - know4p} 張成本，換來每堂課能配不同的術語，
          也省掉「該選哪 12 個」這個一定會有人不同意的決定。
        </Note>
        <Note tone="tip">
          兩套都做的話：Big Five {bigFiveTotal} 張 + HEXACO {hexacoTotal} 張 =
          <strong> {bigFiveTotal + hexacoTotal} 張</strong>。兩套卡背必須不同
          （或分盒），混在一起會直接破壞牌庫張數。
        </Note>
      </Section>

      <Section n="§2" title="人格牌怎麼構成（為什麼是 16 張／維）">
        <p>
          每維 10 道真題，但一維只有 10 張牌不夠打——電子版是「10 道真題 + 隨機複製 6 道」湊成 16 張，
          且<strong>每局重新隨機</strong>。實體牌沒法每局重抽，所以固定成：
          <strong>該維題號升序的前 6 道各多印 1 張</strong>。
        </p>
        <Note tone="diff">
          這個改動對平衡沒有影響：複製牌只有「維度」參與玩法，題面重複不影響任何判定
          （電子版的複製牌 id 從 5000 起、imageId 指回原題，本來就是同一張臉）。固定選前 6 道
          純粹是為了可印刷、可清點、可複核。
        </Note>
        <Table
          head={['維度', '真題題號（10 道）', '印 2 張的題號（前 6 道）', '該維張數']}
          rows={groups.map((g) => [
            `${g.zh} ${g.key}`,
            g.ids.join(', '),
            g.dup4p.join(', '),
            '10 + 6 = 16',
          ])}
          foot={['合計', `${dimCount} × 10 = ${dimCount * 10} 種題面`, `${dimCount} × 6 = ${dimCount * 6} 張複製`, `${persona4p} 張`]}
        />
        <Note tone="warn">
          複製牌與原牌<strong>正面完全相同</strong>（同題面、同插畫、同編號），只在編號後加一個
          小小的「·2」便於清點；它不是新內容，印廠按同一版重印即可。
        </Note>
      </Section>

      <Section n="§3" title="2 人／3 人／4 人：各用多少張">
        <p>
          人數少牌就要少，否則一局打不完（電子版同理，見 <code>deckConfigFor()</code>）。
          做法：知識牌<strong>每局都要先挑</strong>（{knowPrint} 張裏選 {know4p}／{know23p} 張），
          2／3 人局再<strong>額外取出每維 4 張複製牌</strong>，其餘收回盒子。
        </p>
        <Table
          head={['人數', '每維人格牌', '人格牌小計', '知識牌', '總牌庫', '開盒時怎麼取']}
          rows={[
            ['2 人', '12 張（10 真題 + 2 複製）', persona23p, `${know23p} 張（${knowPrint} 選 ${know23p}）`, persona23p + know23p, `每維收回 4 張複製 + 收回 ${knowPrint - know23p} 張知識牌`],
            ['3 人', '12 張（10 真題 + 2 複製）', persona23p, `${know23p} 張（${knowPrint} 選 ${know23p}）`, persona23p + know23p, '同上'],
            ['4 人', '16 張（10 真題 + 6 複製）', persona4p, `${know4p} 張（${knowPrint} 選 ${know4p}）`, persona4p + know4p, `複製牌全用，收回 ${knowPrint - know4p} 張知識牌`],
          ]}
        />
        <p className="pt-1">2／3 人局<strong>保留</strong>的複製牌題號（每維前 2 道），其餘複製牌收回盒子：</p>
        <Table
          head={['維度', '2／3 人局保留的複製牌', '收回盒子的複製牌']}
          rows={groups.map((g) => [
            `${g.zh} ${g.key}`,
            g.dup23p.map((i) => `${i}·2`).join(', '),
            g.dup4p.slice(DUP_PER_DIM_23P).map((i) => `${i}·2`).join(', '),
          ])}
        />
        <Note tone="tip">
          <strong>知識牌挑哪幾張都可以</strong>——它沒有維度、不參與歸檔，彼此完全等價，
          怎麼選都不影響平衡。課堂上建議挑剛教過的章節術語，讓遊戲順帶複習；
          沒特別想法就把 {knowPrint} 張洗勻，隨機抽 {know4p}／{know23p} 張。
        </Note>
      </Section>

      <Section n="§4" title="卡牌以外還要印什麼">
        <p>電子版由介面承擔的東西，實體版要有實物替代：</p>
        <Table
          head={['配件', '數量', '作用', '對應電子版的什麼']}
          rows={[
            ['個人目標板', '4 張', `寫下自己 ${dimCount} 個維度的目標張數（1–5），整局擺在面前`, '歸檔進度卡上的維度格'],
            ['目標數字標記', `每人 ${dimCount} 枚（1–5 可調）`, '壓在目標板各維度格上表示目標張數', '同上'],
            ['歸檔區墊板', '4 張', '碰成功的牌正面朝上壓在這裏，代表「公開歸檔」', '玩家面前的已歸檔區'],
            ['查閱代幣', `每人 4 枚（共 ${4 * 4} 枚）`, '半公開／隱藏難度下，每回合可查維度的次數', '「查看 N 張」按鈕'],
            ['維度卡', `${dimCount} 張（每維 1 張）`, `正面＝該維 10 個題號（判定碰／食胡對錯用）；背面＝該維定義與高／低分說明`, '系統自動判定 ＋「維度速查」按鈕'],
            ['維度色標', `每人 ${dimCount} 色 × 5 枚（共 ${dimCount * 5 * 4} 枚）`, '半公開難度下，查到維度就插在牌架該牌位，之後一直看得到', '半公開的「保留標籤」'],
            ['罰停標記', '4 枚', '被罰停的人放在自己面前，一目了然', '頭像上的「⛔ 罰停中」'],
            ['輪次計數卡', '1 張（印 10 格）', '每完成一輪推進一格，走完第 10 格結算', '回合行的「第 n 輪」'],
            ['測評 QR 卡', '1 張', `掃碼做${kind === 'hexaco' ? ' HEXACO-60' : ' IPIP-50'} 拿維度分，開局第一步`, '網頁版的測評入口'],
            ['莊家標記', '1 枚', '標示本局起手玩家，逆時針輪轉', '系統決定的行動順序'],
            ['沙漏（約 10 秒）', '1 個', '別人棄牌後的搶牌時間', '判讀窗口倒數'],
            ['牌架', '4 個', `手牌最多可達 ${maxHand} 張，拿不住`, '手牌區可橫向滑動'],
          ]}
        />
        <Note tone="tip">
          <strong>維度卡做成每維一張、不做一張大表</strong>：{dimCount} 張攤開排在桌沿，
          {dimCount} 個人可以同時查不同維度，不用互相等；卡緣印該維顏色（見 §11），
          與牌架上的維度色標同一套配色。查一張牌時掃一排卡片的題號即可，
          每張卡的題號都<strong>升序排列</strong>，方便掃。
        </Note>
        <Note tone="warn">
          <strong>維度色標的數量別省</strong>：半公開難度下色標整局累積、不回收，
          每維目標上限 5 張，所以每人每色備 5 枚。隱藏難度不發色標（全靠腦記，見 §6）。
        </Note>
        <Note tone="warn">
          牌架是<strong>必需品不是配件</strong>：手牌張數 = 各維目標之和 − 1，
          {label}的理論上限是 {dimCount} × 5 − 1 = <strong>{maxHand} 張</strong>（下限 {minHand} 張）。
          高分玩家真的會拿到 20 張以上。
        </Note>
      </Section>

      <Section n="§5" title="開局準備">
        <ol className="ml-4 list-decimal space-y-2">
          <li>
            <strong>先做測評拿分數。</strong>每人用手機掃碼完成{kind === 'hexaco' ? ' HEXACO-60' : ' IPIP-50'}（
            {kind === 'hexaco' ? '60' : '50'} 題，{dimCount} 維各 10 題），拿到{dimCount}個維度分。
            沒有網路時可用紙本作答，按對照表算：正向題得分 = 作答值，反向題得分 = 6 − 作答值，
            該維 10 題取平均。
          </li>
          <li>
            <strong>把維度分換成目標張數。</strong>目標張數 = 該維平均分<strong>四捨五入</strong>，
            最少 1 張（例：3.4 → 3 張、4.6 → 5 張、0.8 → 1 張）。把數字標記壓在個人目標板上。
          </li>
          <li>
            <strong>算自己的手牌數。</strong>手牌張數 = {dimCount} 個目標張數<strong>相加後減 1</strong>。
            少的那 1 張要靠「碰」或「食胡」補齊——這是全局的核心張力。
          </li>
          <li>
            <strong>按人數取牌、洗牌。</strong>照 §3 取出多餘的牌，其餘全部洗勻，正面朝下堆成抽牌堆。
          </li>
          <li>
            <strong>發牌。</strong>從莊家起逆時針，按各人算出的手牌數發牌（每人張數不同，這是正常的）。
          </li>
          <li>
            <strong>檢查知識牌。</strong>發完後，手上<strong>超過 1 張知識牌</strong>的人，把多餘的知識牌
            正面朝上交回，洗進抽牌堆，再補等量的牌。重複到每人手上最多 1 張知識牌。
            <span className="text-[var(--psy-muted)]">（知識牌沒有維度，公開交回不洩露任何資訊。）</span>
          </li>
        </ol>
        <Note tone="warn">
          <strong>發牌護欄：</strong>若全桌目標分都很高，發完牌後抽牌堆可能少於「玩家人數」張，
          這局會在第一輪就摸空。此時從<strong>手牌最多的人</strong>開始，每人退 1 張回抽牌堆
          （退回後洗勻），直到抽牌堆 ≥ 玩家人數。被退牌的人，該維目標張數同時減 1。
          電子版由 <code>dealCardsVariable()</code> 自動做這件事，實體版必須有人執行。
        </Note>
      </Section>

      <Section n="§6" title="每回合怎麼打">
        <p className="font-medium text-[var(--psy-ink)]">摸 1 張 → 出 1 張，逆時針輪轉。</p>
        <ol className="ml-4 list-decimal space-y-2">
          <li><strong>摸牌：</strong>從抽牌堆頂摸 1 張進手牌。</li>
          <li>
            <strong>（可選）自摸碰：</strong>若「手牌 + 剛摸的牌」裏，某個維度已湊滿目標張數，
            可以宣告自摸碰把該維度公開歸檔。<strong>每回合限 1 次。</strong>
          </li>
          <li>
            <strong>出牌：</strong>從手牌選 1 張，正面朝上放進中央的棄牌堆。
            出牌後翻沙漏，其他人在沙漏漏完前可以搶這張牌。
          </li>
        </ol>
        <p className="pt-1 font-medium text-[var(--psy-ink)]">看牌難度（開局全桌約定一種）</p>
        <p>
          實體牌拿在自己手裏，卡面<strong>不印維度</strong>——維度要查「維度對照表」才知道。
          三檔難度就是在限制你每回合能查幾次：
        </p>
        <Table
          head={['難度', '每回合可查', '查到的資訊', '實體做法']}
          rows={[
            ['明牌（入門）', '不限', '全場公開', '維度卡攤在桌上隨時查；若用明牌入門版牌（§11），維度直接印在卡面，連查都不用'],
            [
              '半公開（進階）',
              '4 次',
              '查過的一直留著',
              '回合開始拿 4 枚查閱代幣，查一張交 1 枚；查到的維度可在牌架上該牌位插一枚維度色標，之後一直看得到',
            ],
            [
              '隱藏（高手）',
              '2 次',
              '下一輪就忘掉',
              '同上改發 2 枚，但不准做任何標記——只能靠腦記，記錯就是記錯',
            ],
          ]}
        />
        <Note tone="warn">
          「查過的留不留」是半公開與隱藏<strong>真正的分界</strong>，不是查幾張：電子版半公開是
          「每回合查看 4 張<strong>並保留</strong>」（標籤一直掛著、資訊逐輪累積），隱藏是
          「每回合查看 2 張<strong>但不保留</strong>」（標籤下一輪消失）。實體版就用
          <strong>能不能插色標</strong>對應——半公開插了就留著，隱藏全靠記憶。
          只發代幣不管標記，隱藏難度會被玩家用筆記本破解。
        </Note>
        <Note tone="diff">
          <strong>這是實體版改動最大的一處。</strong>電子版靠介面遮住維度標籤，實體牌做不到
          （牌在自己手上，印在正面就等於永遠明牌，印在背面則是給對手看）。改成「維度不印在牌上 +
          限次查閱」後，三檔難度的手感與電子版一致，而且逼玩家真的去讀題面、用維度定義推斷——
          正是這個遊戲要教的東西。查閱代幣沒用完不能留到下回合。
        </Note>
      </Section>

      <Section n="§7" title="碰 與 食胡">
        <p className="font-medium text-[var(--psy-ink)]">🀄 碰（公開歸檔）</p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li><strong>自摸碰：</strong>自己回合，從「手牌 + 剛摸的牌」湊滿某維目標張數，宣告後把那幾張正面朝上放到歸檔區。每回合限 1 次。</li>
          <li><strong>截胡碰：</strong>別人棄牌、沙漏未漏完前，若你手牌<strong>只差 1 張</strong>就湊滿某維目標張數，喊「碰」搶走那張棄牌，湊齊歸檔。</li>
          <li>截胡碰搶到的那個回合<strong>不摸牌</strong>，歸檔後直接出 1 張牌，然後輪到你的下家。</li>
        </ul>
        <p className="pt-2 font-medium text-[var(--psy-ink)]">🏆 食胡（宣告勝利）</p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>{dimCount} 個維度全部歸檔完成即獲勝。最後一張可以是自己摸到的（自摸食胡），也可以搶別人的棄牌（截胡食胡）。</li>
          <li>宣告食胡時把手牌全部攤開，全桌用對照表核對。</li>
        </ul>
        <p className="pt-2 font-medium text-[var(--psy-ink)]">搶牌先後（實體版補充）</p>
        <p>同一張棄牌多人要搶時，按此順序，不看誰喊得快：</p>
        <ol className="ml-4 list-decimal space-y-1">
          <li><strong>食胡優先於碰。</strong></li>
          <li>都是食胡（或都是碰）時，<strong>逆時針方向離棄牌者最近的人</strong>優先。</li>
          <li>沙漏漏完仍無人喊，這張牌留在棄牌堆，輪到下家摸牌。</li>
        </ol>
        <Note tone="diff">
          電子版是「先搶先得」（誰先點到算誰的）。實體版改成固定順位，因為圍著桌子喊話沒法判斷毫秒差，
          會吵架。取捨相同：都只有一個人拿得到那張牌。
        </Note>
      </Section>

      <Section n="§8" title="罰停：算錯的代價">
        <p>宣告<strong>碰／自摸碰／食胡</strong>後，全桌用對照表核對。核對不通過就是罰停一回合：</p>
        <ul className="ml-4 list-disc space-y-1.5">
          <li>把罰停標記放到自己面前，<strong>下一個輪到你的回合直接跳過</strong>（不摸牌、不出牌）。</li>
          <li>罰停期間<strong>不能搶別人的棄牌</strong>（不能碰、不能食胡）。</li>
          <li>碰失敗：那幾張牌<strong>正面朝上攤在桌面</strong>直到你解凍。食胡失敗：<strong>整副手牌</strong>攤開給全場看。</li>
          <li>宣告失敗的那個回合，你<strong>仍要棄 1 張牌</strong>才結束回合。</li>
        </ul>
        <Note tone="warn">
          最後這條容易漏：電子版原本讓失敗者不用棄牌，等於白賺一張，老板 0801 明確要求改掉
          （<code>owesPenaltyDiscard</code>）。實體版照此執行——<strong>喊錯了也要出牌</strong>。
        </Note>
      </Section>

      <Section n="§9" title="牌堆用完 · 輪次 · 結算">
        <ul className="ml-4 list-disc space-y-1.5">
          <li>
            <strong>抽牌堆用完：</strong>把棄牌堆（保留最上面那張留在桌上）拿起來洗勻，翻面當新的抽牌堆。
            所以正常情況下<strong>永遠不會缺牌</strong>。若抽牌堆和棄牌堆同時見底，本局立即結算。
          </li>
          <li><strong>一輪 = 每人各打一個回合。</strong>莊家再次行動時，輪次計數推進一格。</li>
          <li>
            <strong>輪數：10 輪。</strong>電子版跑出來的完成率是 3 人局 92%、4 人局 96%
            ——十輪之內幾乎都會有人食胡，再往上加只是把那幾局拖長，沒有意義。
            {kind === 'hexaco' ? '（HEXACO 六維要湊的多，完成率低於大五，那一版的輪數另議。）' : ''}
            課間時間短可以改打 5 輪，但會有一半左右打不完，按下面的規則比分。
          </li>
          <li>
            <strong>打滿約定輪數仍無人食胡：</strong>依序比較——
            ① <strong>已歸檔維度數，多者勝</strong>；② 相同則<strong>剩餘手牌張數，少者勝</strong>。
          </li>
        </ul>
      </Section>

      <Section n="§10" title="與電子版的差異對照">
        <p>下表把「實體版必須有人動手」的環節列全，其餘規則與電子版逐字一致：</p>
        <Table
          head={['環節', '電子版', '實體版', '為什麼要改']}
          rows={[
            ['複製牌', '每局隨機抽 N 道題複製', '固定：每維前 6 道各印 2 張', '印刷品無法每局重排'],
            ['維度標籤', '印在卡面，按難度遮蔽', '不印在卡面，查對照表', '牌在自己手上，印正面＝永遠明牌'],
            ['看牌次數', '「查看 N 張」按鈕計次', '查閱代幣 4／2 枚', '需要實物限次'],
            ['搶牌先後', '先點先得', '食胡優先 → 逆時針最近者', '喊話分不出毫秒'],
            ['判定對錯', '系統自動判定', '全桌用對照表核對', '沒有系統'],
            ['洗牌／發牌', '自動', '人工，並執行發牌護欄', '沒有系統'],
            ['抽牌堆用完', '自動洗回棄牌堆', '人工洗回（留最上一張）', '同上'],
            ['超時提醒', '60 秒彈窗', '沙漏（約 10 秒搶牌時間）', '同上'],
            ['斷線／退出', '座位永久跳過', '不適用', '面對面沒有斷線'],
            ['防作弊', '同學號不可同時進兩房', '不適用', '同上'],
          ]}
        />
      </Section>

      <Section n="§11" title="明牌入門版（課堂第一次玩）">
        <p>
          標準版之外，另出一套<strong>維度直接印在卡面</strong>的入門版：卡面加一條維度色帶 + 維度名，
          不必查維度卡、不必發查閱代幣、不必發色標。課堂第一次玩用它，規則只剩「湊目標張數」，
          十分鐘就能開打；熟了再換標準版，難度一路從明牌走到隱藏。
        </p>
        <Table
          head={['項目', '明牌入門版', '與標準版的關係']}
          rows={[
            ['人格牌', `${persona4p} 張（${dimCount * 10} 種版面）`, '題面、插畫、編號完全相同，只多印維度色帶與維度名'],
            ['知識牌', `${knowPrint} 張`, '正面同版重印，只換卡背'],
            ['卡背', '必須與標準版不同', '正面看得出來、背面看不出來，混一盒就分不開'],
            ['配件', '不需查閱代幣、不需維度色標', '維度卡仍建議附上（背面的維度定義還是要查）'],
            ['難度', '只有「明牌」一檔', '半公開／隱藏兩檔必須用標準版'],
          ]}
        />
        <p className="pt-1">維度色帶直接用電子版的維度配色，玩家從電子版轉實體不用重新記顏色：</p>
        <div className="flex flex-wrap gap-2 pt-1">
          {groups.map((g) => (
            <span key={g.key} className="inline-flex items-center gap-2 rounded-full border border-[var(--psy-border)] bg-white/60 px-3 py-1 text-[12.5px] text-[var(--psy-ink)]">
              <span className="h-3.5 w-3.5 rounded-full" style={{ background: g.color }} />
              {g.zh} {g.key}
              <code className="text-[11px] text-[var(--psy-muted)]">{g.color}</code>
            </span>
          ))}
        </div>
        <Note tone="diff">
          明牌版<strong>不是另一個遊戲</strong>：牌庫張數、目標張數、碰／食胡、罰停、輪數全部與標準版一致，
          唯一差別是「維度要不要自己推斷」。所以規則書一本共用，只在看牌難度那節註明
          「用明牌版時跳過本節」。
        </Note>
      </Section>

      <Section n="§12" title="給印廠的規格">
        <Table
          head={['項目', '規格', '備註']}
          rows={[
            ['總印量', `${deckOne} 張／副，四副共 ${deckAll} 張（${label}）`, '四副＝中／英 × 標準／明牌；本次先打標準版中文 1 副'],
            ['不同版面數', `${dimCount * 10 * 4 + knowPrint * 2} 種正面 + 4 種卡背`, `每副 ${dimCount * 6} 張為重印，不算新版面`],
            ['卡面內容', '標準版：題面文字 + 插畫 + 題號，不含維度標籤；明牌版：另加維度色帶與維度名', '插畫已有全套（大五 50 張 / HEXACO 60 張）'],
            ['題號', `印在卡面一角，1–${dimCount * 10}；複製牌加「·2」`, '電子版卡面沒有題號，實體版靠它查維度卡（§4），必須新增'],
            ['卡背', '每一副都要不同圖案', '標準版／明牌版／兩種模型，各一種卡背；混副會破壞牌庫張數'],
            ['語言', '中英分版，各印一副', '電子版兩種語言都已定稿，卡面不混排'],
            ['尺寸', '63 × 88 mm（標準撲克）', `已定。手牌可達 ${maxHand} 張，牌架與刀模都走現成規格`],
            ['圖窗', '58 × 58 mm 正方，置中', `插畫 1024 × 1024 正好填滿，${Math.round(1024 / (58 / 25.4))} dpi，零裁切`],
            ['建議工藝', '亞光覆膜 + 藍芯', '要頻繁洗牌，且不能透光看出維度'],
          ]}
        />
        <Note tone="warn">
          <strong>藍芯／不透光是硬要求。</strong>維度既然不印在卡面，靠的就是題面本身；
          但插畫有維度配色傾向，透光或薄卡會讓對手從背面看出端倪。
          （明牌入門版沒有這個顧慮，但建議同工藝，兩副手感一致。）
        </Note>
      </Section>

      <Section n="§13" title="出圖規格與印前檢查">
        <p>
          下面的數字不是估的，是拿題庫和插畫實測出來的
          （量測腳本見 <code>print-assets/</code>，牌庫或題面一改要重跑）。
        </p>

        <p className="pt-1 font-medium text-[var(--psy-ink)]">版面參數</p>
        <Table
          head={['項目', '數值', '說明']}
          rows={[
            ['成品尺寸', '63 × 88 mm', '標準撲克，刀模與牌架都走現成規格'],
            ['出血', '每邊 3 mm → 69 × 94 mm', '底色要鋪滿到出血線'],
            ['安全邊', '距成品邊 4 mm', '文字、題號、色帶一律不得越線'],
            ['圖窗', '55 × 55 mm 正方，置中，上距成品邊 5 mm', '插畫 1024 × 1024 正好填滿，473 dpi，零裁切'],
            ['文字區', '55 × 22 mm', '圖窗下方，題面 + 題號'],
            ['解析度 / 色彩', '350 dpi，CMYK', '格式 TIFF（LZW）或 PDF/X-1a'],
          ]}
        />

        <p className="pt-1 font-medium text-[var(--psy-ink)]">文字會不會溢出（50 題 + 20 張知識牌全量實測）</p>
        <Table
          head={['內容', '建議字級', '最長的一條佔幾行', '版面容量', '結論']}
          rows={[
            ['人格牌 · 繁中題面', '12–14 pt', '2 行（#31 在聚會中我會跟許多不同的人說話）', '4 行', '✓ 餘量一倍'],
            ['人格牌 · 英文題面', '11–12 pt', '3 行（#28 I often forget to put things back…）', '4 行', '✓ 通過'],
            ['知識牌 · 術語標題', '13 pt', "2 行（Erikson's Psychosocial Stages of Development）", '2 行', '△ 剛好，別再放大'],
            ['知識牌 · 定義', '10 pt', '4 行（#20 投射測驗 英文版）', '7 行', '✓ 通過'],
            ['明牌版 · 色帶維度名', '8 pt', 'Conscientiousness 佔 24 mm', '色帶可用 45 mm', '✓ 通過'],
          ]}
        />
        <Note tone="tip">
          <strong>50 題與 20 張知識牌全部通過，一條都沒溢出</strong>，而且中文題面餘量有一倍
          ——字級可以比原設想再放大一號，課堂圍桌看得更清楚。
          唯一貼邊的是英文術語 <strong>Erikson&apos;s Psychosocial Stages of Development</strong>（44 字元，
          標題區兩行剛好塞滿），這一張排版時要單獨看一眼。
        </Note>
        <Note tone="diff">
          量測用全形／半形 em 寬估算，實際字體的字重與字距會有些微差異；但通過的項目餘量都在 40% 以上，
          結論不會被這點誤差翻盤。真正要盯的只有上面標△的那一條。
        </Note>

        <p className="pt-1 font-medium text-[var(--psy-ink)]">插畫轉 CMYK 會不會掉色</p>
        <p>
          50 張插畫走 sRGB → CMYK → sRGB 往返實測：整體平均偏差 <strong>3.3</strong>（0–255 尺度），
          沒有一張平均偏差超過 12。掉最兇的是暗部褐色（<code>25.webp</code> 最大偏差 31，
          rgb(114,40,1) → rgb(111,53,32)），發生在陰影裏，肉眼幾乎看不出。
          <strong>插畫這關安全，不必重畫、不必調色。</strong>
        </p>
        <Note tone="warn">
          <strong>但維度色要指定 CMYK 數值，不能讓印廠自動轉。</strong>
          五個維度色裏，<strong>外向性 E 的橘色 #D97706 轉 CMYK 後偏差達 41</strong>
          （rgb(217,119,6) → rgb(217,126,47)，橘色泛黃變淺），明牌版的色帶和維度卡卡緣都會用到它。
          照下表把 CMYK 值直接給印廠：
        </Note>
        <Table
          head={['維度', 'HEX', 'CMYK 指定值']}
          rows={[
            ['O 開放性', '#2A9D8F', 'C76 M9 Y43 K4'],
            ['C 盡責性', '#2A4365', 'C89 M67 Y22 K24'],
            ['E 外向性', '#D97706', 'C2 M55 Y98 K5'],
            ['A 宜人性', '#E07A5F', 'C4 M59 Y61 K1'],
            ['N 神經質', '#7E6C8F', 'C52 M57 Y16 K2'],
            ['卡背底色', '#F6F0E1', 'C3 M4 Y9 K0'],
          ]}
        />
        <Note tone="diff">
          這組值是用通用 CMYK profile 算的<strong>基準線</strong>，不是最終值。
          正式送印要拿印廠指定的 ICC（多半是 Coated FOGRA39 或 Japan Color）重轉一次，
          打樣回來對著實物再微調 E 的橘色。
        </Note>

        <p className="pt-1 font-medium text-[var(--psy-ink)]">知識牌卡面（{knowPrint} 張，已完成）</p>
        <p>
          知識牌沒有插畫，是純文字卡：術語標題 + 金線 ◆ + 定義，右下角編號 K01–K
          {String(knowPrint).padStart(2, '0')}，
          版式沿用電子版的知識牌（同一套金框、星點、底色漸變），與人格牌成套。
          檔案：<code>print-assets/knowledge-cards_zh_63x88_bleed3.pdf</code>（繁中）與
          <code>…_en_…</code>（英文），各 20 頁。
        </p>
        <Note tone="diff">
          <strong>卡面是用瀏覽器列印出來的，不是生圖腳本畫的</strong>
          （版式在 <code>src/app/print/knowledge/page.tsx</code>）。
          理由：文字必須是<strong>向量</strong>——350 dpi 點陣圖在 10pt 這種字級下邊緣會糊；
          走瀏覽器列印，文字自動保持向量，字體也和電子版同一套（Noto Sans HK），不必另外嵌字。
          題庫改了這頁會自己跟著改，重印一次即可。
        </Note>
        <Note tone="warn">
          <strong>知識牌的卡背必須跟人格牌一模一樣。</strong>知識牌若有自己的卡背，
          對手看你牌架上的背面就能數出你手上有幾張廢牌——那是白送的情報。
        </Note>

        <p className="pt-1 font-medium text-[var(--psy-ink)]">卡背</p>
        <p>
          用品牌 logo（蜂巢 Ψ）鋪在 <code>#F6F0E1</code> 底色上。底色直接取自 logo 原圖背景，
          貼上去零接縫；純色底 + 置中圖案對裁切公差最寬容，偏個 1 mm 也看不出來。
          檔案已生成在 <code>print-assets/</code>，RGB 與 CMYK 各一份，
          951 × 1295 px（含 3 mm 出血）＠350 dpi。
        </p>
        <Note tone="warn">
          <strong>卡背必須「點對稱」——旋轉 180° 要和原來完全一樣，這是規則問題不是美術問題。</strong>
          卡背若有方向性，隱藏難度下玩家只要把查過的牌<strong>倒插進牌架</strong>，
          就等於做了個永久標記——而隱藏檔的整個設計（§6）就是「不准做任何標記，全靠腦記」。
          所以 logo 做成一正一倒兩枚上下對置，已逐像素驗證旋轉 180° 後完全相同。
        </Note>
      </Section>

    </div>
  );
}
