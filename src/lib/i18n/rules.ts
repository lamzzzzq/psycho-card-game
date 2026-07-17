// 規則頁（A4 列印版）雙語文案。zh = 繁體中文，en = 英文。
// ⚠️ 規則正文「逐字照跟」big5_revised rules docx，不改字；emoji / 配圖為自由發揮。
// 純資料模組，無 React 依賴。

// 區塊型別：段落 / 條列 / 警告 / 小標題 / 提示框
export type RuleBlock = { t: 'p' | 'li' | 'warn' | 'sub' | 'tip'; text: string };
// 章節：title + 可選配圖（goal 目標張數圖 / flow 摸→出流程 / pong 碰湊組圖）+ 內容區塊
export type RuleSection = { title: string; fig?: 'goal' | 'flow' | 'pong'; blocks: readonly RuleBlock[] };

export const RULES_T = {
  zh: {
    // 工具列
    backToTutorial: '← 返回教學',
    printOrPdf: '🖨 列印 / 存 PDF',

    // 抬頭
    titleMain: '人格麻將',
    titleSub: 'Big Five 遊戲規則',
    scanToEnter: '掃碼進入遊戲',

    // 維度名（目標圖例用）
    dimO: '開放性',
    dimC: '盡責性',
    dimE: '外向性',
    dimA: '宜人性',
    dimN: '神經質',

    // 配圖文案
    figGoalCap: '圈內數字＝該維度要湊幾張（由你的測評分數決定，每維不同）→ 五維全部歸檔即食胡',
    figFlowDraw: '① 摸 1 張',
    figFlowDiscard: '② 出 1 張',
    figFlowWindow: '幾秒判讀窗口',
    figPongCap: '湊滿「該維度目標張數」即可鎖定（張數要與目標一致）',
    figHand: '你的手牌',
    figIncoming: '抽到／別人棄的',
    figLocked: '鎖定一組',

    sections: [
      {
        title: '🎯 一、終極目標：5維度「公開歸檔」！',
        fig: 'goal',
        blocks: [
          { t: 'p', text: '你的目標是將大五人格的 5 個維度（OCEAN）全部湊齊並「公開歸檔」，最快完成的人獲勝！' },
          { t: 'p', text: '特別注意：每個維度要湊幾張牌，取決於你自己一開始的測評分數。所以，每個人的「胡牌路線（目標張數）」都是不一樣的！' },
          { t: 'p', text: '例如：你的目標可能是 O 需 3 張、C 需 4 張、E 需 2 張、A 需 5 張、N 需 4 張。' },
          { t: 'tip', text: '初始手牌公式：你的初始手牌張數 = 5 個維度目標張數之和 − 1（少的那 1 張，要靠「碰」或「食胡」來補齊）。' },
        ],
      },
      {
        title: '🃏 二、認識卡牌',
        blocks: [
          { t: 'p', text: '牌堆中只有兩類牌，非常好認：' },
          { t: 'li', text: '人格描述牌（有顏色）：帶有特定人格維度的標籤，是你用來歸檔（湊張數）的核心牌。' },
          { t: 'li', text: '知識牌（灰色 / 無顏色）：印有心理學術語與定義。它們沒有維度屬性，不能用來歸檔。' },
          { t: 'tip', text: '妙用：抽到就打掉，安全不穿幫；還能順便觀察對手打出知識牌的時機，試探他們的出牌風格！' },
        ],
      },
      {
        title: '🔄 三、遊戲基本輪迴：摸牌 ➔ 出牌',
        fig: 'flow',
        blocks: [
          { t: 'sub', text: '❶ 摸牌（抽牌）' },
          { t: 'p', text: '輪到你時，先從牌堆摸 1 張牌。此時你可以查看手牌、選擇歸檔（碰）或準備出牌。' },
          { t: 'sub', text: '🔍 核心機制：你能看多少張手牌？' },
          { t: 'p', text: '依房主設定的「看牌難度」而定：' },
          { t: 'li', text: '明牌（預設）：全場公開！自己手牌 + 所有棄牌都直接顯示人格標籤，免查看。' },
          { t: 'li', text: '半公開：每回合可看 4 張手牌（看過就永久顯示）；棄牌不顯示。' },
          { t: 'li', text: '隱藏：每回合只能看 2 張，一輪後自動重置（蓋回去）；棄牌不顯示。' },
          { t: 'sub', text: '❷ 出牌' },
          { t: 'p', text: '從手牌選 1 張不需要的牌丟到中間的「棄牌堆」。這張牌會進入幾秒鐘的「心理判讀窗口」，這時其他玩家可以決定要不要搶這張牌來「碰」或「食胡」。' },
        ],
      },
      {
        title: '⚡ 四、兩大核心動作：碰 與 食胡',
        fig: 'pong',
        blocks: [
          { t: 'sub', text: '🀄 碰（公開歸檔）' },
          { t: 'p', text: '當某一維度的牌湊齊了你的目標張數，你就可以宣告「碰」來鎖定（歸檔）該維度。' },
          { t: 'li', text: '自摸碰：在自己的回合，從「手牌 + 剛摸的牌」中，挑出符合目標張數的同維度牌歸檔。（每回合限 1 次）' },
          { t: 'li', text: '截胡碰（搶牌）：在別人的「心理判讀窗口」內，如果你手牌的同維度張數「只差 1 張」就達標，可以立即點擊搶走那張棄牌，湊齊歸檔！（先搶先得）' },
          { t: 'warn', text: '⚠️ 系統不會提示你哪個維度夠了！5 個維度按鈕都會亮起，你必須自己算對張數與維度。一旦選錯、放錯牌，就會被「罰停」！' },
          { t: 'sub', text: '🏆 食胡（宣告勝利）' },
          { t: 'p', text: '當你已歸檔的維度 + 手牌 + 當下判定牌，剛好完美達成了 5 個維度的所有目標張數：' },
          { t: 'li', text: '自摸食胡：自己回合摸到最後一張關鍵牌。' },
          { t: 'li', text: '截胡食胡：別人丟出你需要的最後一張牌，直接攔截！' },
          { t: 'warn', text: '⚠️ 沒算好就喊食胡？判定失敗的話，會遭受嚴厲的罰停懲罰！' },
        ],
      },
      {
        title: '🚫 五、懲罰機制：罰停',
        blocks: [
          { t: 'p', text: '如果你「碰失敗 / 自摸碰失敗 / 食胡失敗」，會受到以下懲罰：' },
          { t: 'li', text: '罰停一回合：下次輪到你時自動被跳過（不抽牌、不出牌）。' },
          { t: 'li', text: '強制亮牌：碰失敗的牌（或食胡失敗時的「整副手牌」）必須立即公開給全場看。' },
          { t: 'li', text: '失去參與權：罰停期間，你不能參與別人的棄牌判定（無法碰牌、無法食胡）。' },
          { t: 'li', text: '社死標記：你的頭像會掛上大大的「⛔ 罰停中」標誌。' },
          { t: 'tip', text: '提示：一次失誤等於送對手一回合，動手前請務必看清楚、算明白！' },
        ],
      },
      {
        title: '👥 六、聯機與勝負規則',
        blocks: [
          { t: 'li', text: '人數彈性：聯機支援 2–4 名玩家；單機固定 4 人（你 + 3 個 AI）。' },
          { t: 'li', text: '斷線 / 退出處理：有人點擊「退出對局」後，該座位會永久跳過（顯示 🚪 已退出），不影響剩餘玩家繼續切磋；若退到只剩 1 人，該玩家直接躺贏！' },
          { t: 'li', text: '防作弊機制：同一個學號無法同時進入兩個活動房間。' },
          { t: 'li', text: '逾時提醒：回合超時 60 秒未操作，系統會每分鐘彈窗溫馨提醒。' },
          { t: 'p', text: '無人胡牌怎麼辦？如果打滿約定圈數仍無人食胡，則按以下順序判定勝負：' },
          { t: 'p', text: '已歸檔維度數（多者勝）→ 剩餘手牌張數（少者勝）' },
        ],
      },
    ] as readonly RuleSection[],

    // 頁尾
    footer: '掃描頁首 QR code 即可開始 · ',
  },

  en: {
    // toolbar
    backToTutorial: '← Back to Tutorial',
    printOrPdf: '🖨 Print / Save PDF',

    // header
    titleMain: 'Personalities Mahjong',
    titleSub: 'Big Five Game Rules',
    scanToEnter: 'Scan to enter',

    // dimensions
    dimO: 'Openness',
    dimC: 'Conscientiousness',
    dimE: 'Extraversion',
    dimA: 'Agreeableness',
    dimN: 'Neuroticism',

    // figure captions
    figGoalCap: 'The number in each chip = how many cards that dimension needs (from your score, different per dimension) → archive all five to Win',
    figFlowDraw: '① Draw 1',
    figFlowDiscard: '② Discard 1',
    figFlowWindow: 'few-sec read window',
    figPongCap: 'Reach that dimension\'s target count to lock it in (the count must match the target)',
    figHand: 'Your hand',
    figIncoming: 'Drawn / discarded',
    figLocked: 'Locked set',

    sections: [
      {
        title: '🎯 1. Ultimate Goal: Publicly Archive All 5 Dimensions!',
        fig: 'goal',
        blocks: [
          { t: 'p', text: 'Your goal is to collect and "publicly archive" all 5 Big Five dimensions (OCEAN); the first to finish wins!' },
          { t: 'p', text: 'Note: how many cards each dimension needs depends on your own assessment score at the start. So everyone\'s "path to a win (target counts)" is different!' },
          { t: 'p', text: 'Example: your targets might be O needs 3, C needs 4, E needs 2, A needs 5, N needs 4.' },
          { t: 'tip', text: 'Starting-hand formula: your starting hand size = the sum of the 5 dimension targets − 1 (that one missing card must be completed via "Pong" or "Win").' },
        ],
      },
      {
        title: '🃏 2. Know the Cards',
        blocks: [
          { t: 'p', text: 'The deck has only two kinds of cards, easy to tell apart:' },
          { t: 'li', text: 'Personality cards (colored): carry a specific dimension tag — your core cards for archiving (reaching a target count).' },
          { t: 'li', text: 'Knowledge cards (grey / uncolored): psychology terms and definitions. They have no dimension and cannot be archived.' },
          { t: 'tip', text: 'Handy tip: discard them the moment you draw one (safe, no giveaway); watching when opponents play them also probes their style!' },
        ],
      },
      {
        title: '🔄 3. The Basic Loop: Draw ➔ Discard',
        fig: 'flow',
        blocks: [
          { t: 'sub', text: '❶ Draw' },
          { t: 'p', text: 'On your turn, first draw 1 card from the deck. Now you can view your hand, choose to archive (Pong), or get ready to discard.' },
          { t: 'sub', text: '🔍 Core mechanic: how many hand cards can you see?' },
          { t: 'p', text: 'It depends on the host\'s "reveal difficulty":' },
          { t: 'li', text: 'Open (default): fully public! Your hand + all discards show their dimension tags directly, no viewing needed.' },
          { t: 'li', text: 'Half: view up to 4 hand cards each turn (once viewed, shown permanently); discards not shown.' },
          { t: 'li', text: 'Hidden: view only 2 each turn, auto-reset after a round (turned back over); discards not shown.' },
          { t: 'sub', text: '❷ Discard' },
          { t: 'p', text: 'Pick 1 unwanted card from your hand into the middle "discard pile". This card opens a few-second "psychological read window", during which other players may decide whether to grab it to "Pong" or "Win".' },
        ],
      },
      {
        title: '⚡ 4. Two Core Actions: Pong & Win',
        fig: 'pong',
        blocks: [
          { t: 'sub', text: '🀄 Pong (public archive)' },
          { t: 'p', text: 'When a dimension reaches your target count, you can declare "Pong" to lock (archive) that dimension.' },
          { t: 'li', text: 'Self-draw Pong: on your own turn, from "hand + the just-drawn card", pick the same-dimension cards matching the target count and archive them. (Once per turn)' },
          { t: 'li', text: 'Claim Pong (grab): within another player\'s "read window", if your same-dimension count is "just 1 short" of the target, you can instantly grab that discard to complete the archive! (First-come)' },
          { t: 'warn', text: '⚠️ The system won\'t tell you which dimension is ready! All 5 dimension buttons light up; you must count the counts and dimensions yourself. Pick or place wrong and you get "Frozen"!' },
          { t: 'sub', text: '🏆 Win (declare victory)' },
          { t: 'p', text: 'When your archived dimensions + hand + the current judged card perfectly complete all target counts for the 5 dimensions:' },
          { t: 'li', text: 'Self-draw Win: you draw the final key card on your own turn.' },
          { t: 'li', text: 'Claim Win: someone discards the last card you need — intercept it directly!' },
          { t: 'warn', text: '⚠️ Called Win without counting right? A failed judgment brings a harsh Frozen penalty!' },
        ],
      },
      {
        title: '🚫 5. Penalty: Frozen',
        blocks: [
          { t: 'p', text: 'If you fail a "Pong / self-draw Pong / Win", you receive these penalties:' },
          { t: 'li', text: 'Frozen one turn: your next turn is auto-skipped (no draw, no discard).' },
          { t: 'li', text: 'Forced reveal: the failed Pong cards (or your "whole hand" on a failed Win) are immediately shown to everyone.' },
          { t: 'li', text: 'Locked out: while frozen you cannot join others\' discard judgments (cannot Pong or Win).' },
          { t: 'li', text: 'Public shame badge: a big "⛔ Frozen" mark hangs on your avatar.' },
          { t: 'tip', text: 'Tip: one slip hands your opponent a turn — look carefully and count clearly before you act!' },
        ],
      },
      {
        title: '👥 6. Online & Results Rules',
        blocks: [
          { t: 'li', text: 'Flexible player count: online supports 2–4 players; single player is fixed at 4 (you + 3 AI).' },
          { t: 'li', text: 'Disconnect / leave: after someone taps "Leave", that seat is permanently skipped (shows 🚪 Left) and the remaining players keep going; if only 1 player remains, that player simply wins!' },
          { t: 'li', text: 'Anti-cheat: the same student ID cannot enter two active rooms at once.' },
          { t: 'li', text: 'Idle nudge: if a turn goes 60 seconds without action, the system pops a friendly reminder every minute.' },
          { t: 'p', text: 'What if no one wins? If the agreed rounds run out with no Win, the result is decided in the following order:' },
          { t: 'p', text: 'Most archived dimensions wins → if tied, fewer remaining hand cards wins.' },
        ],
      },
    ] as readonly RuleSection[],

    // footer
    footer: 'Scan the QR code above to start · ',
  },
} as const;
