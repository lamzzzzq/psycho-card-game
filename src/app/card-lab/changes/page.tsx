'use client';

/**
 * 本輪改動說明頁 —— /card-lab/changes
 * 給老板/自己對照用的圖文 changelog，不影響正式遊戲；一律繁體。
 * 涵蓋：單機場景整合、AI 改名、PVP 房間頁三修。
 */

type Change = {
  tag: string;
  title: string;
  where: string;
  before: string[];
  after: string[];
  note?: string;
};

const SINGLE: Change[] = [
  {
    tag: '桌面',
    title: '中央左欄：空面板 → 對局資訊卡',
    where: 'game/page.tsx · 牌桌中央那一行',
    before: [
      '左欄是個大邊框盒子，裡面只有一行小字「第 X 輪」＋「已完成 0/5 · 29s」，浮在一大片空白裡。',
    ],
    after: [
      '同一個框從上到下填滿三塊：',
      '① 輪次 ＋ 大號「1 / 10」',
      '② 獨立小框裡的大計時器「29s」（≤5 秒轉紅）',
      '③ 已完成 ＋「0/5」＋ 綠色進度條',
    ],
    note: '僅桌面（md+）顯示，移動端不受影響。',
  },
  {
    tag: '桌面',
    title: '去掉重複的「完成 0/5」',
    where: 'game/page.tsx · 底部維度目標列',
    before: [
      '5 個維度目標 pill（開放性4/盡責性3…）後面還掛了一個「完成 0/5」小 pill，與上面資訊卡的進度重複。',
    ],
    after: [
      '刪掉重複的「完成 0/5」pill。',
      '5 個維度目標 pill 全部保留。',
    ],
  },
  {
    tag: '移動',
    title: '三條堆疊 → 兩條',
    where: 'game/page.tsx · 手牌上方',
    before: [
      '手牌上方豎著堆三條：',
      '（a）輪次 / 已完成 / 計時 pill',
      '（b）目標維度迷你條',
      '（c）人格 / 歸檔 / 記錄 按鈕條',
    ],
    after: [
      '把（a）與（c）併進同一行：左邊資訊 pill 撐開、右邊三個按鈕。',
      '（b）目標迷你條留在下方。',
      '少一條豎向堆疊，手牌區更從容。',
    ],
  },
];

const RENAME: Change = {
  tag: '改名',
  title: '單機 AI 對手改名（中英分離）',
  where: 'ai-personas.ts · types · game-logic · 6 處顯示點',
  before: [
    '對手：Brian / Prof. Chen / Lin（單一 name，中英共用）。',
  ],
  after: [
    '中文（繁體）：大雄 / 陳教授 / 老林',
    '英文（粵語拼音）：Tai Hung / Prof. Chan / Lam',
    '新增 nameEn 欄位 ＋ playerLabel(p, locale) 助手，對手區與行動記錄按語言取名。',
  ],
  note: 'PVP 玩家用自填暱稱，不受影響。',
};

const ROOM: Change[] = [
  {
    tag: 'Bug',
    title: '「等待玩家（X/Y）」計數修正',
    where: 'pvp/room/[code]/page.tsx · 底部按鈕',
    before: [
      'Y 寫死為「/2」——選 3 人房也顯示「等待玩家（1/2）」。',
    ],
    after: [
      'Y 隨最多玩家數：選 3 人顯示「（1/3）」、4 人顯示「（1/4）」。',
    ],
  },
  {
    tag: '設計',
    title: '房間設置改唯讀',
    where: 'pvp/room/[code]/page.tsx · 房間設置區',
    before: [
      '等待室裡「最多玩家數 / 遊戲輪數」是可點按鈕，可再次修改（與建房步驟重複）。',
    ],
    after: [
      '建房時已決定，等待室改為唯讀雙卡展示（最多玩家數 3人 / 遊戲輪數 5），不可再改。',
      '所有玩家（含加入者）皆可見。',
    ],
  },
  {
    tag: '新增',
    title: '房間碼加複製圖標',
    where: 'pvp/room/[code]/page.tsx · ROOM CODE',
    before: [
      '房間碼只能手動讀 / 手打。',
    ],
    after: [
      '房間碼旁加複製按鈕（navigator.clipboard），點擊複製並顯示「已複製 ✓」回饋。',
    ],
  },
];

function TagChip({ tag }: { tag: string }) {
  const danger = tag === 'Bug';
  return (
    <span
      className="psy-serif shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
      style={{
        color: danger ? 'var(--psy-danger)' : 'var(--psy-accent)',
        background: danger ? 'var(--psy-danger-soft)' : 'var(--psy-accent-soft)',
        border: `1px solid ${danger ? 'rgba(201,96,63,0.32)' : 'rgba(154,116,72,0.28)'}`,
      }}
    >
      {tag}
    </span>
  );
}

function ChangeCard({ c }: { c: Change }) {
  return (
    <div className="psy-panel psy-etched space-y-4 rounded-[1.5rem] p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <TagChip tag={c.tag} />
        <div className="min-w-0">
          <h3 className="psy-serif text-base font-semibold text-[var(--psy-ink)] sm:text-lg">{c.title}</h3>
          <p className="mt-0.5 font-mono text-[11px] text-[var(--psy-muted)]">{c.where}</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.1rem] border border-[rgba(201,96,63,0.22)] bg-[var(--psy-danger-soft)] p-4">
          <p className="psy-eyebrow mb-2 text-[10px] text-[var(--psy-danger)]">改前</p>
          <ul className="space-y-1.5">
            {c.before.map((b, i) => (
              <li key={i} className="text-[13px] leading-6 text-[var(--psy-ink-soft)]">{b}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-[1.1rem] border border-[rgba(111,143,85,0.28)] bg-[var(--psy-success-soft)] p-4">
          <p className="psy-eyebrow mb-2 text-[10px]" style={{ color: 'var(--psy-success)' }}>改後</p>
          <ul className="space-y-1.5">
            {c.after.map((a, i) => (
              <li key={i} className="text-[13px] leading-6 text-[var(--psy-ink-soft)]">{a}</li>
            ))}
          </ul>
        </div>
      </div>

      {c.note && (
        <p className="rounded-[0.9rem] border border-[rgba(154,116,72,0.16)] bg-[var(--psy-card-content)] px-3 py-2 text-[12px] leading-6 text-[var(--psy-muted)]">
          ⓘ {c.note}
        </p>
      )}
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mt-2">
      <p className="psy-eyebrow text-[11px] text-[var(--psy-accent)]">{eyebrow}</p>
      <h2 className="psy-serif mt-1 text-xl font-semibold text-[var(--psy-ink)] sm:text-2xl">{title}</h2>
    </div>
  );
}

export default function ChangesPage() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      <header className="space-y-3 text-center">
        <p className="psy-eyebrow text-[11px] text-[var(--psy-accent)]">本輪改動說明</p>
        <h1 className="psy-serif text-3xl font-medium text-[var(--psy-ink)] sm:text-4xl">場景整合 · 改名 · 房間頁修正</h1>
        <p className="mx-auto max-w-xl text-sm leading-7 text-[var(--psy-muted)]">
          此頁僅為改動對照說明，不影響正式遊戲。只動佈局與資訊，未碰玩法、手牌排布、抽/棄牌堆、動作按鈕與浮層彈窗。
        </p>
      </header>

      <SectionTitle eyebrow="01 · SINGLE PLAYER" title="單機場景整合（桌面 ＋ 移動）" />
      {SINGLE.map((c, i) => <ChangeCard key={i} c={c} />)}

      <SectionTitle eyebrow="02 · NAMING" title="AI 對手改名" />
      <ChangeCard c={RENAME} />

      <SectionTitle eyebrow="03 · PVP ROOM" title="聯機房間頁三修" />
      {ROOM.map((c, i) => <ChangeCard key={i} c={c} />)}

      <footer className="pt-4 text-center">
        <p className="text-[12px] text-[var(--psy-muted)]">
          聯機遊戲頁（pvp/game）的場景整合待同步；確認後一併推送。
        </p>
      </footer>
    </div>
  );
}
