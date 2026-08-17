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

      <Section n="§1" title="一副要印多少張">
        <p>
          印<strong>一副滿配（4 人用）</strong>即可，2 人／3 人局是它的子集——開盒時按人數取出多餘的牌，
          不必印三種盒子。{label} 滿配總張數：
        </p>
        <Table
          head={['牌種', '張數', '說明']}
          rows={[
            ['人格牌', persona4p, `${dimCount} 維 × 16 張`],
            ['知識牌', know4p, `從 ${KNOWLEDGE_CARDS.length} 個心理學術語中選 12 個，每個 1 張`],
          ]}
          foot={['合計', persona4p + know4p, '一副牌的印刷總量']}
        />
        <Note tone="tip">
          兩套都做的話：Big Five 92 張 + HEXACO 108 張 = <strong>200 張</strong>。兩套卡背必須不同
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
          做法：從滿配裏<strong>取出每維 4 張複製牌 + 4 張知識牌</strong>，收回盒子。
        </p>
        <Table
          head={['人數', '每維人格牌', '人格牌小計', '知識牌', '總牌庫', '開盒時取出']}
          rows={[
            ['2 人', '12 張（10 真題 + 2 複製）', persona23p, know23p, persona23p + know23p, `每維 4 張複製 + 4 張知識牌，共 ${dimCount * 4 + 4} 張`],
            ['3 人', '12 張（10 真題 + 2 複製）', persona23p, know23p, persona23p + know23p, `同上，共 ${dimCount * 4 + 4} 張`],
            ['4 人', '16 張（10 真題 + 6 複製）', persona4p, know4p, persona4p + know4p, '不取出，全副使用'],
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
          知識牌收回哪 4 張都可以（知識牌沒有維度、不參與歸檔，彼此完全等價），
          建議固定收編號最大的 4 張，方便下次清點。
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
            ['查閱代幣', '每人 4 枚', '半公開／隱藏難度下，每回合可查維度的次數', '「查看 N 張」按鈕'],
            ['維度對照表', '2 份', '按卡牌編號查該牌維度，判定碰／食胡對錯用', '系統自動判定'],
            ['維度速查卡', '2 份', `${dimCount} 個維度的定義與高／低分說明，判斷牌面歸屬用`, '對局內「維度速查」按鈕'],
            ['罰停標記', '4 枚', '被罰停的人放在自己面前，一目了然', '頭像上的「⛔ 罰停中」'],
            ['輪次計數卡', '1 張', '每完成一輪推進一格，打滿約定輪數結算', '回合行的「第 n 輪」'],
            ['莊家標記', '1 枚', '標示本局起手玩家，逆時針輪轉', '系統決定的行動順序'],
            ['沙漏（約 10 秒）', '1 個', '別人棄牌後的搶牌時間', '判讀窗口倒數'],
            ['牌架', '4 個', `手牌最多可達 ${maxHand} 張，拿不住`, '手牌區可橫向滑動'],
          ]}
        />
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
          head={['難度', '每回合可查', '實體做法', '對應電子版']}
          rows={[
            ['明牌（入門）', '不限', '對照表就攤在桌上，隨時查', '所有牌直接顯示維度標籤'],
            ['半公開（進階）', '4 次', '每人回合開始拿 4 枚查閱代幣，查一張交 1 枚，回合結束收回', '每回合可查看 4 張'],
            ['隱藏（高手）', '2 次', '同上，改發 2 枚', '每回合只能查看 2 張'],
          ]}
        />
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
          <li><strong>建議輪數：10 輪</strong>（電子版預設值；4 人局約 96% 會在 10 輪內出現食胡）。休息時間短可打 5 輪，會有一半左右打不完。</li>
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

      <Section n="§11" title="給印廠的規格">
        <Table
          head={['項目', '規格', '備註']}
          rows={[
            ['總印量', `${persona4p + know4p} 張／副（${label}）`, '兩套都做 = 200 張'],
            ['不同版面數', `${dimCount * 10} 種人格牌 + 12 種知識牌 = ${dimCount * 10 + 12} 版`, `其中 ${dimCount * 6} 張為重印，不算新版面`],
            ['卡面內容', '題面文字 + 插畫，不含維度標籤', '插畫已有全套（大五 50 張 / HEXACO 60 張）'],
            ['卡背', '兩套必須不同圖案', '混副會破壞牌庫張數'],
            ['語言', '中英雙語或分版', '電子版兩種語言都已定稿'],
            ['建議尺寸', '63 × 88 mm（標準撲克）', '手牌可達 20 張以上，別做大卡'],
            ['建議工藝', '亞光覆膜 + 藍芯', '要頻繁洗牌，且不能透光看出維度'],
          ]}
        />
        <Note tone="warn">
          <strong>藍芯／不透光是硬要求。</strong>維度既然不印在卡面，靠的就是題面本身；
          但插畫有維度配色傾向，透光或薄卡會讓對手從背面看出端倪。
        </Note>
      </Section>

      <Section n="§12" title="待拍板">
        <ul className="ml-4 list-disc space-y-1.5">
          <li><strong>輪數 10 還是 12：</strong>電子版正在討論同一件事（HEXACO 4 人局 10 輪完成率 82%，低於大五 94%）。印刷前要定，因為要印在規則書上。</li>
          <li><strong>知識牌選哪 12 個術語：</strong>現有 {KNOWLEDGE_CARDS.length} 個，需要挑 12 個。建議按課程覆蓋面挑，我可以出一版候選。</li>
          <li><strong>維度對照表的形式：</strong>做成一張大卡（{dimCount * 10} 行），還是每維一張小卡？前者好查，後者可以讓不同玩家同時查。</li>
          <li><strong>要不要出「明牌專用版」卡面：</strong>即維度標籤直接印在卡面的入門版。多一套版面成本，但課堂第一次玩會順很多。</li>
        </ul>
      </Section>
    </div>
  );
}
