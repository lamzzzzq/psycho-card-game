// 教學頁（tutorial）文案詞典。zh / en 同結構。
// 含 ${...} 變量的句子一律用箭頭函數（zh/en 同簽名、同參數）。
// 維度名本身已是雙語數據（DIMENSION_META.name / .nameEn），調用方按 locale 取好字符串再傳進來。

export const TUTORIAL_T = {
  zh: {
    // ── 頁眉 / 頁腳 ──
    eyebrow: 'Tutorial',
    title: '人格麻將 · Big Five · 教學',
    titleMain: '人格麻將',
    titleSub: 'Big Five 教學',
    rulesHardcopy: '規則手冊 (可列印)',
    backHome: '返回主頁',

    // ── 主 CTA ──
    ctaTitle: '先看流程，再進引導實戰打一局',
    ctaBody: '系統會帶你一步步學會：開局（單機/聯機）、答題、房間流程、看手牌、碰、胡。',
    ctaButton: '▶ 進入引導實戰',

    // ── 概念卡片區標題 ──
    rulesPointsLabel: '規則要點',
    // 規則示意圖（CSS 拼圖）文案
    dgHand: '你的手牌',
    dgIncoming: '抽到／別人棄的',
    dgLocked: '鎖定一組',
    dgGoalCaption: '圈內數字＝目標張數 → 5 維全部歸檔即食胡並獲勝',
    dgPongCaption: '湊滿「該維度目標張數」即可鎖定：2 張手牌 + 1 張進來的牌 = 3 張（張數要與目標一致）',
    dgTableCaption: '你 + 3 AI（或 2–4 名玩家）圍住牌堆',
    dgDrawCaption: '每回合先從牌堆摸 1 張',
    dgDiscardCaption: '棄 1 張 → 開啟判讀窗口',
    dgDiscardPile: '棄',
    dgWinBtn: '食胡',
    dgWinCaption: '5 維湊齊 → 按「食胡」',
    dgFrozenCaption: '宣告失敗 → 罰停 1 回合、亮牌',
    dgViewCaption: '翻開手牌看真實維度（張數／是否永久依難度）',
    dgKnowledgeCaption: '無維度 · 安全棄牌',
    dgCardPersona: '人格描述牌',
    dgCardKnowledge: '知識牌',
    dgCanArchive: '可歸檔湊牌',
    dgCantArchive: '不可歸檔',
    dgTwoTypesCaption: '有顏色＝可歸檔　　灰色 ⓘ＝安全棄牌',
    dgExitCaption: '退出 → 座位永久跳過',
    dgScoringCaption: '無人胡 → 比已歸檔維度數',
    directStartAssess: '直接開始測評',

    // ── 開始遊戲流程（StartFlowGuide）──
    flowEyebrow: '開始遊戲流程',
    flowTitle: '從首頁到開局',
    tabPvp: '聯機對戰',
    tabSolo: '單機對戰',
    prevStep: '上一步',
    nextStep: '下一步',

    // ── PVP_FLOW ──（前 3 步與單機共用：測評 → 學號 → 畫像，之後才分岔）
    pvpFlow: [
      {
        title: '開始測評',
        body: '首次進入時，首頁只有一個「開始測評」入口。先完成人格測評，分數將決定你在每個維度需要湊幾多張牌。',
      },
      {
        title: '登入 / 註冊帳號',
        body: '當你首次點擊「開始測評」時，系統會提示你登入或註冊帳號。請以學號建立帳號，並設定密碼，以連結至課堂數據分析。',
      },
      {
        title: '查看人格畫像',
        body: '答完題進入「你的人格畫像」：五維雷達圖 + 各維度得分。這一頁底部就是「聯機對戰 / 單機對戰 / 重新測評」的入口。',
        note: '測評分數決定各維度目標張數，也決定你的起始手牌數（＝五維目標張數之和 − 1）。因此每個人的開局規模與胡牌路線都不同。',
      },
      {
        title: '進入聯機對戰',
        body: '創建或加入房間，並設定遊戲規格。',
      },
      {
        title: '開始對戰',
        body: '創建房間後，分享房間碼給其他玩家加入；人齊後便可開始對戰。',
      },
    ] as ReadonlyArray<{ title: string; body: string; note?: string }>,

    // ── SOLO_FLOW ──（前 3 步與聯機共用）
    soloFlow: [
      {
        title: '開始測評',
        body: '首次進入時，首頁只有一個「開始測評」入口。先完成人格測評，分數將決定你在每個維度需要湊幾多張牌。',
      },
      {
        title: '登入 / 註冊帳號',
        body: '當你首次點擊「開始測評」時，系統會提示你登入或註冊帳號。請以學號建立帳號，並設定密碼，以連結至課堂數據分析。',
      },
      {
        title: '查看人格畫像',
        body: '答完題進入「你的人格畫像」：五維雷達圖 + 各維度得分。這一頁底部就是「聯機對戰 / 單機對戰 / 重新測評」的入口。',
        note: '測評分數決定各維度目標張數，也決定你的起始手牌數（＝五維目標張數之和 − 1）。因此每個人的開局規模與胡牌路線都不同。',
      },
      {
        title: '進入單機對戰',
        body: '設定你的遊戲規格。',
      },
      {
        title: '開始對戰',
        body: '直接進入牌桌和 AI 對戰。',
      },
    ] as ReadonlyArray<{ title: string; body: string; note?: string }>,

    // ── STEPS（規則要點卡片）──
    steps: [
      {
        title: '🎯 終極目標：5維度「公開歸檔」！',
        body: '你的目標是將五大人格的 5 個維度（OCEAN）湊齊並「公開歸檔」，最快完成的人獲勝！\n特別注意：每個維度的目標張數取決於你的測評分數。例如：你的目標可能是 O 需 3 張、C 需 4 張、E 需 2 張、A 需 5 張、N 需 4 張等。',
        hint: '初始手牌公式：你的初始手牌張數 = 5 個維度目標張數之和 − 1（少的那 1 張，要靠「碰」或「食胡」來補齊）。',
      },
      {
        title: '🃏 認識卡牌',
        body: '牌堆中只有兩類牌，非常好認：\n・人格描述牌（有顏色）：帶有特定人格維度的標籤，是你用來歸檔（湊張數）的核心牌。\n・知識牌（灰色 / 無顏色）：印有心理學術語與定義。它們沒有維度屬性，不能用來歸檔。',
        hint: '策略提示：抽到就打掉，安全不穿幫；還能順便觀察對手打出知識牌的時機，試探他們的出牌風格！',
      },
      {
        title: '🔄 每回合運作：摸牌 ➔ 出牌',
        body: '❶ 摸牌（抽牌）\n輪到你時，先抽 1 張牌。你可以查看手牌、選擇歸檔（碰）或準備出牌。\n🔍「看牌難度」決定你能看多少張手牌：\n・明牌（預設）：所有牌都直接顯示人格標籤。\n・半公開：每回合可查看 4 張手牌的人格標籤。\n・隱藏：每回合只能查看 2 張，標籤在下一輪便會消失。\n❷ 出牌\n從手裏選 1 張牌丟到中間的「棄牌堆」。其他玩家可以搶這張牌來「碰」或「食胡」。',
      },
      {
        title: '⚡ 兩大核心動作：碰 與 食胡',
        body: '🀄 碰（公開歸檔）\n當湊齊某一維度的目標張數，你可以「碰」來鎖定（歸檔）該維度。\n・自摸碰：在自己的回合，從「手牌 + 剛摸的牌」中，挑出符合維度目標張數的牌。（每回合限 1 次）\n・截胡碰：在別人棄牌的指定時間內，如果你手牌只差 1 張就達維度目標張數，你可以立即點擊搶走那張棄牌，湊齊歸檔！（先搶先得）\n⚠️ 系統不會向你提示！你必須自己計算哪維度可達到目標張數。一旦選錯、放錯牌，就會被「罰停」一回合！\n🏆 食胡（宣告勝利）\n當你已歸檔 5 個維度的所有目標張數：\n・自摸食胡：自己回合摸到最後一張關鍵牌。\n・截胡食胡：別人丟出你需要的最後一張牌，直接截胡！\n⚠️ 沒算好就喊食胡？判定失敗的話，會遭受嚴厲的懲罰！',
      },
      {
        title: '🚫 懲罰機制：罰停',
        body: '如果「碰失敗 / 自摸碰失敗 / 食胡失敗」，你會被罰停一回合：\n・輪到你時自動被跳過（不得抽牌或出牌）。\n・不能參與別人的棄牌判定（無法碰牌、無法食胡）。\n・社死標記：你的頭像會掛上大大的「⛔ 罰停中」標誌。\n・碰失敗的牌、或食胡失敗時的「整副手牌」，將立即公開給全場看。',
        hint: '提示：一次失誤等於送對手一回合，動手前請務必看清楚、算明白！',
      },
      {
        title: '👥 聯機與勝負規則',
        body: '・人數彈性：聯機支援 2–4 名玩家；單機固定 4 人（你 + 3 個 AI）。\n・斷線 / 退出處理：有人點擊「退出對局」後，該座位會永久跳過（顯示 🚪 已退出），不影響剩餘玩家繼續切磋；若退到只剩 1 人，該玩家直接躺贏！\n・防作弊機制：同一個學號無法同時進入兩個活動房間。\n・逾時提醒：回合超時 60 秒未操作，系統會每分鐘彈窗溫馨提醒。\n・無人胡牌怎麼辦？如果打滿約定圈數仍無人食胡，則按以下順序判定勝負：\n已歸檔維度數（多者勝）→ 剩餘手牌張數（少者勝）',
      },
    ] as ReadonlyArray<{ title: string; body: string; hint?: string }>,

    // ── 沙盒：底部指引欄標籤 ──
    guideLabel: '指引',

    // ── 沙盒：頭部 ──
    sandboxLabel: '交互式引導實戰',
    sandboxReset: '重新開始',
    sandboxExit: '退出引導實戰',

    // ── 沙盒：牌桌標籤 ──
    publicArchiveLabel: '公開歸檔：',
    archiveNone: '（暫無）',
    archiveSetSuffix: (name: string, count: number) => `${name} ${count} 張`,
    drawPileClick: '點擊抽牌 ↓',
    drawPile: '牌堆',
    justDrawn: '剛抽到',
    handEmpty: '（手牌已清空）',

    // ── 沙盒：操作按鈕 ──
    btnHu: '食胡',
    btnViewTwo: '查看 2 張',
    btnContinueJudge: '完成查看',
    revealHalfNote: '半公開 · 看 4 張 · 永久保留',
    revealHiddenNote: '隱藏 · 看 2 張 · 不保留（本示範）',
    btnSelfPong: '自摸碰',
    btnCancel: '取消',
    btnSelfArchive: '確認自摸碰',
    btnContinue: '繼續 →',
    btnPong: '碰',
    btnDiscard: '棄牌',
    btnContinueHu: '進入食胡教學',
    btnSimDiscard: '模擬別人棄牌',
    btnPlayAgain: '再來一遍',
    btnFinishTutorial: '完成教程',

    // ── 沙盒：開局介紹遮罩 ──
    introTitle: '開局先看「目標張數」',
    introBody: '每個維度都有一個目標張數。你要湊夠牌，才能把這個維度的牌「碰」下來、公開鎖定。\n以下是這局示範的目標：',
    introBtn: '開始教學',

    // ── 沙盒：目標板 + 操作橫幅 ──
    targetBoardLabel: '目標張數',
    opSelfPong: '自摸碰',
    opClaim: '截胡碰',
    opHu: '食胡',
    toastPongDone: '自摸碰成功！',
    toastClaimDone: '截胡碰成功！',
    toastHuDone: '食胡成功！🏆',

    // ── 沙盒：自摸碰選維度 ──
    pongStep1: '第一步 · 選擇要歸檔的人格維度',

    // ── 沙盒：自摸碰選牌（cnt = 目標張數，sel = 已選）──
    pongStep2: (name: string, cnt: number, sel: number) =>
      `第二步 · 自摸碰 · ${name} · 請精確選擇 ${cnt} 張（已選 ${sel}/${cnt}）`,

    // ── 沙盒：罰停演示框 ──
    penaltyDemo: '罰停一回合演示：本輪不能參與別人棄牌的判讀窗口，下次輪到你時自動跳過。',

    // ── 沙盒：截胡窗口卡片 ──
    claimWho: 'Brian棄出了一張牌',
    claimCardBodyA: '從下方手牌選 ',
    claimCardBodyMid: (name: string) => `2 張「${name}」`,
    claimCardBodyB: (sel: number) => `（高亮的牌），加這張棄牌湊成一組。已選 ${sel}/2。`,

    // ── 沙盒：食胡演示框 ──
    huDemoBox: '食胡只在 5 個維度都完成時按。判定不成立會公開整副手牌並罰停，所以它是確認勝利，不是試探按鈕。',

    // ── 沙盒：手牌區標題 ──
    discardToEnd: '出 1 張牌結束回合 ↓',
    yourHand: '你的手牌',
    cardsCountSuffix: (n: number) => `${n} 張`,

    // ── 沙盒：caption（按 scene）──
    captionStart: '手牌裏有多種人格描述牌和一張知識牌。先抽牌、再決定查看、歸檔還是棄牌。',
    captionViewing: '所選難度決定可查看維度的牌數與保留機制：\n・明牌：所有牌的維度標示會一直顯示出來。\n・半公開：每回合可查看 4 張牌的人格標籤，標籤將會一直保留。\n・隱藏：每回合可看 2 張牌的人格標籤，但標籤會在下一輪消失。\n本次將示範「隱藏」模式——請先點擊上方高亮的「查看 2 張」。',
    captionViewPicking: (n: number) =>
      n >= 2
        ? '兩張都看過了！點高亮的「完成查看」繼續。'
        : `點選上方高亮的 2 張牌，揭開它們的真實維度（已看 ${n}/2）。`,
    captionAfterDraw: '神經質的「目標張數」是 4。你手裏正好有 4 張神經質牌。點高亮的「自摸碰」開始選維度及點牌。',
    captionPongDimension: (name: string) =>
      `自摸碰先選定一個維度。目標板上「${name}」需要的張數，正是你手裏有的張數——選高亮的「${name}」。`,
    captionPongPickingDone: (name: string, cnt: number) => `已選滿 ${cnt} 張「${name}」。點高亮的「確認自摸碰」完成歸檔。`,
    captionPongPicking: (name: string, cnt: number, sel: number) =>
      `從手牌精確選擇 ${cnt} 張「${name}」（高亮的就是，已選 ${sel}/${cnt}）。`,
    captionPongFailed: '失敗會公開你押錯的牌並罰停一回合（下次輪到你時自動跳過）。點「繼續」回到選牌模式。',
    captionPongSuccess: '自摸碰成功！4 張公開歸檔鎖定。現在點一張手牌準備棄掉，結束此回合。',
    captionDiscardConfirm: '確認要棄這張嗎？點「棄牌」結束回合，或「取消」換一張。',
    captionClaimWindow: (name: string, sel: number) =>
      `別人棄牌後的判讀窗口：從手牌選 2 張高亮的「${name}」，加那張棄牌湊一組（${name} 目標 3 張），再點「碰」（已選 ${sel}/2）。`,
    captionClaimWindowFallback: '現在是別人棄牌後的判讀窗口。你可以截胡碰，也可以在已經滿足全部目標時食胡。',
    captionClaimSuccess: '截胡碰也會形成公開歸檔。下一步示範「食胡」（宣告勝利）。',
    captionHuDemo: '食胡是勝利按鈕，只在所有目標完成時使用。失敗成本很高，所以不要拿它試錯。',
    captionHuWindow: (name: string) =>
      `你已歸檔 4 維，只差「${name}」。對手打出的這張判定為「${name}」，正是你缺的最後一維——點高亮的「食胡」宣告勝利。`,
    captionHuSuccess: '食胡成功！五個維度全部集齊，你贏了。',
    captionDiscardPicking: '點擊要棄的牌。',
    captionDone: '你的回合結束。下一步模擬當別人棄牌時，你如何「碰 / 食胡」。',

    // ── 沙盒：feedback（reducer 內）──
    fbDraw: '抽到一張牌。現在選擇很多，先演示「查看 2 張牌」。',
    fbViewTwo: '本回合查看了 2 張牌：一張盡責性，一張神經質。隱藏模式看過的牌下一輪會重置、不保留；真實牌局裏只會揭開你選的 2 張。',
    fbViewStart: '點選上方高亮的 2 張牌，揭開它們的真實維度。',
    fbViewPicked: '已揭開一張。再點另一張高亮的牌。',
    fbViewDone: '隱藏模式每回合只能看 2 張，且下一輪隨即重置、不作保留；半公開模式則是每回合看 4 張、看過可保留。',
    fbFinishView: '你知道剛抽到的牌能補齊一組。現在演示自摸碰。',
    fbOpenPong: '自摸碰要先選定一個人格維度。提示：手牌裏有 4 張「神經質」，選它。',
    fbChooseDim: (name: string, cnt: number) => `已選擇「${name}」。現在從手牌精確選擇 ${cnt} 張「${name}」的牌。`,
    fbPongSuccess: '歸檔成功。4 張進入公開歸檔區，歸檔後必須立即棄 1 張牌。',
    fbPongFailWrongCount: (selected: number, cnt: number) => `選了 ${selected} 張，必須正好 ${cnt} 張`,
    fbPongFailWrongDim: (name: string) => `選中的牌裏有非「${name}」（知識牌不算任何維度）`,
    fbPongFail: (reason: string) =>
      `自摸碰失敗：${reason}。真實遊戲會罰停一回合（下次輪到你時自動跳過），並公開你剛剛押錯的牌。`,
    fbContinueAfterFail: (name: string, cnt: number) => `試試這次只選 ${cnt} 張「${name}」（高亮的牌）。`,
    fbPickDiscard: '出牌完成。現在切到別人棄牌時，你如何響應「碰 / 食胡」。',
    fbOpenClaimDim: (name: string) => `對手棄出一張牌。截胡碰同樣先選定要歸檔的維度——選高亮的「${name}」。`,
    captionClaimDim: (name: string) =>
      `別人棄牌後的判讀窗口：和自摸碰一樣，先點高亮的「${name}」選定歸檔維度。`,
    fbOpenClaim: (name: string) => `對手棄出一張「${name}」牌。從手牌選 2 張「${name}」，加這張棄牌湊成一組。`,
    fbClaimFail: (name: string, picked: number) =>
      `截胡碰需要正好 2 張「${name}」手牌（已選 ${picked}）。真實遊戲選錯會判失敗並罰停一回合。`,
    fbClaimSuccess: '截胡碰成功。你用手裏 2 張同類牌 + 對手棄牌完成了一組公開歸檔。',
    fbShowHu: '食胡用於宣佈勝利：當 5 個維度全部完成時按下。誤按會公開整副手牌並罰停。',
    fbWrongDimHint: (name: string) => `這張不是「${name}」，混維度會碰失敗——只選「${name}」。`,
    fbEnterHu: (name: string) => `食胡課：你已歸檔 4 維，只差「${name}」最後一組。`,
    fbHuSuccess: '食胡成功！五維集齊，宣告勝利。',

    // ── 沙盒：食胡窗口 + 缺口標籤 ──
    huWho: '對手打出一張人格牌',
    huBody: (name: string) => `判定它屬於「${name}」——正是你缺的最後一維。手裏 3 張「${name}」+ 這張 = 第 5 組，符合食胡！`,
    huGapSuffix: (name: string) => `${name}（缺口）`,

    // ── 沙盒：失敗原因兜底維度名 ──
    fallbackDimName: '該維度',

    // ── FlowScreenshot（靜態示意圖）──
    shotPvpTitle: '聯機流程截圖示意',
    shotSoloTitle: '單機流程截圖示意',
    shotStaticBadge: '靜態示意',
    shotProductName: '人格麻將',
    shotPvp: '聯機對戰',
    shotSolo: '單機對戰',
    shotStudentId: '學號',
    shotStartAssessBtn: '開始測評',
    shotHomeHint: '首次進入只有這一個入口',
    shotStudentIdTitle: '登入',
    shotStudentIdPlaceholder: '學號（例如 17094905G）',
    shotPasswordPlaceholder: '密碼',
    shotLoginBtn: '登入',
    shotStudentIdOnce: '學號就是你的帳號',
    shotPortraitTitle: '你的人格畫像',
    shotRetest: '重新測評',
    shotMaxPlayersLabel: '最多玩家',
    shotMaxPlayers: ['2 人', '3 人', '4 人'] as readonly string[],
    shotRevealLabel: '看牌難度',
    shotReveals: ['明牌', '半公開', '隱藏'] as readonly string[],
    shotAiDifficultyLabel: 'AI 難度',
    shotRoundsLabel: '遊戲輪數',
    shotOpponentLabel: '對手檔案',
    shotCreateRoom: '創建房間',
    shotJoinRoom: '加入房間',
    shotHost: '房主',
    shotStartGame: '開始遊戲',
    shotStartMatch: '開始對戰',
    shotYou: '你',
    shotDifficulties: ['簡單', '中等', '困難'] as readonly string[],
    shotRounds: ['5輪', '10輪', '15輪', '無限'] as readonly string[],
    shotAiOpponents: ['大雄', '陳教授', '老林'] as readonly string[],
    shotAiOpponentLabel: 'AI 對手',
    // 合併後的沙盒 CTA（流程指南底部）
    sandboxCtaLead: '流程看懂了嗎？現在進『引導實戰』，親手打一局',
  },
  en: {
    // ── Header / footer ──
    eyebrow: 'Tutorial',
    title: 'Personalities Mahjong · Big Five · Tutorial',
    titleMain: 'Personalities Mahjong',
    titleSub: 'Big Five Tutorial',
    rulesHardcopy: 'Rules (Printable)',
    backHome: 'Back to Home',

    // ── Main CTA ──
    ctaTitle: 'See the flow first, then play Guided Practice',
    ctaBody: 'The system walks you through step-by-step: setup (Solo/Multiplayer), personality assessment, room flow, viewing cards, pong, and hu (win).',
    ctaButton: '▶ Enter Guided Practice',

    // ── Concept cards section title ──
    rulesPointsLabel: 'Key Rules',
    // Rule diagram (CSS mockup) captions
    dgHand: 'Your hand',
    dgIncoming: 'Drawn / discarded',
    dgLocked: 'Locked set',
    dgGoalCaption: 'The number in the chip = target count → file all 5 dimensions to Win.',
    dgPongCaption: 'Reach that dimension\'s target count to lock it: 2 hand cards + 1 incoming card = 3 (the count must match the target).',
    dgTableCaption: 'You + 3 AI (or 1 to 3 players) around the pile',
    dgDrawCaption: 'Draw 1 from the pile to start your turn',
    dgDiscardCaption: 'Discard 1 → opens the read window',
    dgDiscardPile: 'DISC',
    dgWinBtn: 'Win',
    dgWinCaption: 'All 5 complete → press "Win"',
    dgFrozenCaption: 'Failed call → frozen 1 turn, cards shown',
    dgViewCaption: 'Flip hand cards to see dimensions (count/persistence varies by difficulty)',
    dgKnowledgeCaption: 'No dimension · safe discard',
    dgCardPersona: 'Personality card',
    dgCardKnowledge: 'Knowledge card',
    dgCanArchive: 'Fileable',
    dgCantArchive: 'Cannot be filed',
    dgTwoTypesCaption: 'Colored = fileable    Grey ⓘ = safe discard',
    dgExitCaption: 'Leave → seat skipped for good',
    dgScoringCaption: 'No win → rank by filed dimensions',
    directStartAssess: 'Go Straight to Assessment',

    // ── Start flow guide ──
    flowEyebrow: 'Getting Started',
    flowTitle: 'From Home to First Hand',
    tabPvp: 'Multiplayer Mode',
    tabSolo: 'Solo Mode',
    prevStep: 'Previous',
    nextStep: 'Next',

    // ── PVP_FLOW ──（first 3 steps shared with solo: assess → ID → profile）
    pvpFlow: [
      {
        title: 'Start the Assessment',
        body: 'On your first visit, the home page has only one entry point: "Start Assessment". Complete the personality assessment first — your scores decide how many cards you need to collect for each dimension.',
      },
      {
        title: 'Log In / Register',
        body: 'When you first tap "Start Assessment", you\'ll be prompted to log in or register. Create an account with your Student ID and set a password, so your results link to the class data analysis.',
      },
      {
        title: 'View Your Personality Portrait',
        body: 'After finishing the questions, you will see "Your Personality Portrait": a radar chart of your five dimensions along with your specific scores. The entry points for "Solo Match / Multiplayer Match / Retake Assessment" are located at the bottom of this page.',
        note: 'Your assessment scores determine the target card count for each dimension, which also sets your starting hand size (calculated as the sum of all five target counts minus one). Consequently, every player begins with a unique opening scale and a distinct path to a Win.',
      },
      {
        title: 'Enter Multiplayer Match',
        body: 'Create or join a room and set the game settings.',
      },
      {
        title: 'Start the Match',
        body: 'Create a room, then share the room code for other players to join. Once everyone\'s in, you\'re ready to start the match.',
      },
    ] as ReadonlyArray<{ title: string; body: string; note?: string }>,

    // ── SOLO_FLOW ──（first 3 steps shared with online）
    soloFlow: [
      {
        title: 'Start the Assessment',
        body: 'On your first visit, the home page has only one entry point: "Start Assessment". Complete the personality assessment first — your scores decide how many cards you need to collect for each dimension.',
      },
      {
        title: 'Log In / Register',
        body: 'When you first tap "Start Assessment", you\'ll be prompted to log in or register. Create an account with your Student ID and set a password, so your results link to the class data analysis.',
      },
      {
        title: 'View Your Personality Portrait',
        body: 'After finishing the questions, you will see "Your Personality Portrait": a radar chart of your five dimensions along with your specific scores. The entry points for "Solo Match / Multiplayer Match / Retake Assessment" are located at the bottom of this page.',
        note: 'Your assessment scores determine the target card count for each dimension, which also sets your starting hand size (calculated as the sum of all five target counts minus one). Consequently, every player begins with a unique opening scale and a distinct path to a Win.',
      },
      {
        title: 'Enter Solo Match',
        body: 'Set your game settings.',
      },
      {
        title: 'Start the Match',
        body: 'Head straight to the table and play against the AI.',
      },
    ] as ReadonlyArray<{ title: string; body: string; note?: string }>,

    // ── STEPS ──
    steps: [
      {
        title: '🎯 Ultimate Goal: Publicly File All 5 Dimensions!',
        body: 'Your goal is to collect and "publicly file" all 5 Big Five dimensions (OCEAN). The first to finish wins!\nNote: the target count for each dimension depends on your assessment score. Example: your targets might be O needs 3, C needs 4, E needs 2, A needs 5, N needs 4, and so on.',
        hint: 'Starting-hand formula: your starting hand size = the sum of the 5 dimension targets − 1. That 1 missing card must be completed later through a "Self-draw Pong", "Intercept Pong", or your final "Win"!',
      },
      {
        title: '🃏 Know the Cards',
        body: 'The deck contains only two types of cards, making them incredibly easy to tell apart:\n・Personality cards (colored): carry a specific dimension tag — these are your core cards used for filing and reaching your target counts.\n・Knowledge cards (grey / uncolored): printed with psychology terms and definitions. They have no dimension attributes and cannot be filed.',
        hint: 'Strategy tip: discard knowledge cards as soon as you draw them to stay safe without giving away your hand strategy. You can also watch when your opponents discard their knowledge cards to read their playing style!',
      },
      {
        title: '🔄 Each Turn: Draw ➔ Discard',
        body: '❶ Draw\nOn your turn, draw 1 card. You can then view your hand, choose to file (Pong), or get ready to discard.\n🔍 "Reveal Difficulty" decides how many hand cards you can see:\n・Open (Default): every card shows its dimension tag directly.\n・Semi-Open: view the dimension tags of 4 hand cards each turn.\n・Hidden: view only 2 cards each turn, and the tags disappear next round.\n❷ Discard\nPick 1 card from your hand and play it into the central "discard". Other players can seize it for a "Pong" or a "Win".',
      },
      {
        title: '⚡ Two Core Actions: Pong & Win',
        body: '🀄 Pong (public file)\nWhen you reach a dimension\'s target count, you can "Pong" to lock (file) that dimension.\n・Self-draw Pong: on your own turn, pick cards from your "hand + the just-drawn card" that meet the dimension\'s target count. (Once per turn)\n・Intercept Pong: within the time window after someone discards, if your hand is just 1 card short of a dimension\'s target count, you can instantly grab that discard to complete your file! (First-come, first-served)\n⚠️ The system won\'t prompt you! You must work out yourself which dimension can reach its target count. Choose wrong or misplace a card, and you\'ll be "Frozen" for one turn!\n🏆 Win (declare victory)\nWhen you have filed the target counts for all 5 dimensions:\n・Self-draw Win: you draw the final key card on your own turn.\n・Intercept Win: an opponent discards the exact final card you need — intercept it directly!\n⚠️ Call a Win without counting correctly? A failed judgment brings a harsh penalty!',
      },
      {
        title: '🚫 Penalty: Frozen',
        body: 'If you fail a "Pong / Self-draw Pong / Win", you\'ll be Frozen for one turn:\n・Your next turn is automatically skipped (no drawing or discarding).\n・You can\'t join others\' discard windows (no Pong, no Win).\n・Public shame badge: a big "⛔ Frozen" indicator is slapped onto your avatar.\n・The failed Pong cards, or your "entire hand" if you failed a Win, are immediately revealed to everyone.',
        hint: 'Tip: one slip hands your opponent a turn — look carefully and count clearly before you act!',
      },
      {
        title: '👥 Online & Results Rules',
        body: '・Flexible player count: Multiplayer matches support 2–4 players; Solo mode is fixed at 4 players (you + 3 AI).\n・Disconnect / quit: Once a player taps "Leave", their seat is permanently skipped (displays 🚪 Left) while the remaining players continue. If only 1 player remains in the room, that player wins automatically!\n・Anti-cheat: the same student ID cannot enter two active rooms at once.\n・Idle nudge: if a turn goes 60 seconds without action, the system pops a friendly reminder every minute.\n・What if no one wins? If the agreed rounds run out with no Win, the result is decided in this order:\nMost filed dimensions wins ➔ If tied, fewer remaining hand cards wins.',
      },
    ] as ReadonlyArray<{ title: string; body: string; hint?: string }>,

    // ── Sandbox: bottom guidance bar label ──
    guideLabel: 'Guide',

    // ── Sandbox: header ──
    sandboxLabel: 'Interactive Guided Practice',
    sandboxReset: 'Restart',
    sandboxExit: 'Exit Guided Practice',

    // ── Sandbox: table labels ──
    publicArchiveLabel: 'Public File:',
    archiveNone: '(none yet)',
    archiveSetSuffix: (name: string, count: number) => `${name} ×${count}`,
    drawPileClick: 'Tap to draw ↓',
    drawPile: 'Draw pile',
    justDrawn: 'just drawn',
    handEmpty: '(hand is empty)',

    // ── Sandbox: action buttons ──
    btnHu: 'Win',
    btnViewTwo: 'View 2',
    btnContinueJudge: 'Done viewing',
    revealHalfNote: 'Semi-Open · view 4 · kept',
    revealHiddenNote: 'Hidden · view 2 · not kept (this demo)',
    btnSelfPong: 'Self-draw Pong',
    btnCancel: 'Cancel',
    btnSelfArchive: 'Confirm Pong',
    btnContinue: 'Continue →',
    btnPong: 'Pong',
    btnDiscard: 'Discard',
    btnContinueHu: 'Next: Win lesson',
    btnSimDiscard: 'Simulate a discard',
    btnPlayAgain: 'Play again',
    btnFinishTutorial: 'Finish tutorial',

    // ── Sandbox: intro overlay ──
    introTitle: 'Check Your "Winning Targets" First',
    introBody: 'Each dimension has a target count. Collect enough cards to "Pong" that dimension and lock it in publicly.\nHere are the targets for this demo:',
    introBtn: 'Start Lesson',

    // ── Sandbox: target board + operation banner ──
    targetBoardLabel: 'Targets',
    opSelfPong: 'Self-draw Pong',
    opClaim: 'Intercept Pong',
    opHu: 'Win',
    toastPongDone: 'Self-draw Pong complete!',
    toastClaimDone: 'Intercept Pong complete!',
    toastHuDone: 'You win! 🏆',

    // ── Sandbox: self-draw Pong dimension pick ──
    pongStep1: 'Step 1 · Choose the dimension to declare',

    // ── Sandbox: self-draw Pong card pick ──
    pongStep2: (name: string, cnt: number, sel: number) =>
      `Step 2 · Self-draw Pong · ${name} · Select exactly ${cnt} (${sel}/${cnt} selected)`,

    // ── Sandbox: frozen demo box ──
    penaltyDemo: 'Frozen-for-one-turn demo: you cannot join others\' read windows this round, and your next turn is auto-skipped.',

    // ── Sandbox: claim window card ──
    claimWho: 'Brian discarded a card',
    claimCardBodyA: 'From your hand below pick ',
    claimCardBodyMid: (name: string) => `2 "${name}" cards`,
    claimCardBodyB: (sel: number) => ` (highlighted), plus this discard to complete a set. ${sel}/2 selected.`,

    // ── Sandbox: Win demo box ──
    huDemoBox: 'Press Win only when all 5 dimensions are complete. A failed judgement reveals your whole hand and freezes you, so it confirms victory — it is not a probing button.',

    // ── Sandbox: hand area heading ──
    discardToEnd: 'Discard 1 card to end the turn ↓',
    yourHand: 'Your hand',
    cardsCountSuffix: (n: number) => `${n} cards`,

    // ── Sandbox: captions (by scene) ──
    captionStart: 'Your hand holds several personality cards and one Knowledge Card. Draw first, then decide whether to view, file, or discard.',
    captionViewing: 'The chosen reveal difficulty decides how many cards\' dimensions you can see and whether the tags stay:\n・Open: every card\'s dimension tag stays visible the whole time.\n・Semi-Open: view the dimension tags of 4 cards each turn, and the tags stay revealed.\n・Hidden: view the tags of 2 cards each turn, but the tags disappear next round.\nThis demo uses "Hidden" mode — tap the highlighted "View 2" above to begin.',
    captionViewPicking: (n: number) =>
      n >= 2
        ? 'You\'ve seen both! Tap the highlighted "Done viewing" to continue.'
        : `Tap the 2 highlighted cards above to reveal their true dimensions (${n}/2 seen).`,
    captionAfterDraw: 'Neuroticism\'s target count is 4, and your hand has exactly 4 Neuroticism cards. Tap the highlighted "Self-draw Pong" to start choosing the dimension and cards.',
    captionPongDimension: (name: string) =>
      `Self-draw Pong needs a dimension first. The count "${name}" needs on the board is exactly what you hold — choose the highlighted "${name}".`,
    captionPongPickingDone: (name: string, cnt: number) => `${cnt} "${name}" cards selected. Tap the highlighted "Confirm Pong" to declare.`,
    captionPongPicking: (name: string, cnt: number, sel: number) =>
      `Select exactly ${cnt} "${name}" cards from your hand (the highlighted ones; ${sel}/${cnt} selected).`,
    captionPongFailed: 'A failure reveals the cards you wrongly bet and freezes you for one turn (your next turn is auto-skipped). Tap "Continue" to return to card-picking.',
    captionPongSuccess: 'Self-draw Pong successful! 4 cards are now locked into your public file. Tap a card in your hand to discard and end this turn.',
    captionDiscardConfirm: 'Discard this one? Tap "Discard" to end the turn, or "Cancel" to pick another.',
    captionClaimWindow: (name: string, sel: number) =>
      `The read window after someone discards: pick 2 highlighted "${name}" cards, plus that discard to form a set (${name} target is 3), then tap "Pong" (${sel}/2 selected).`,
    captionClaimWindowFallback: 'This is the read window after someone discards. You can Intercept Pong, or Win if you have already met every target.',
    captionClaimSuccess: 'An Intercept Pong also forms a public file. Next up, a demo of "Win" (Declaring Victory).',
    captionHuDemo: 'Win is the victory button, used only when all targets are complete. Failure is costly, so do not use it for trial and error.',
    captionHuWindow: (name: string) =>
      `You have filed 4 dimensions and only need "${name}" to win. The opponent\'s discard is verified as "${name}" — exactly the final dimension you need. Tap the highlighted "Win" to declare victory!`,
    captionHuSuccess: 'Winning card claimed! All 5 dimensions are complete — you win!',
    captionDiscardPicking: 'Tap the card to discard.',
    captionDone: 'Your turn is over. Next, we simulate how you "Pong / Win" when someone else discards.',

    // ── Sandbox: feedback (in reducer) ──
    fbDraw: 'Drew a card. There are many options now — first let\'s demo "view 2 cards".',
    fbViewTwo: 'This turn you viewed 2 cards: one Conscientiousness, one Neuroticism. In Hidden mode viewed cards reset next round — not kept; in a real game only the 2 you pick are revealed.',
    fbViewStart: 'Tap the 2 highlighted cards above to reveal their true dimensions.',
    fbViewPicked: 'One revealed. Now tap the other highlighted card.',
    fbViewDone: 'In Hidden mode you see only 2 per turn and they reset next round (not kept); in Semi-Open mode you\'d view 4 per turn and they stay revealed for good.',
    fbFinishView: 'You know the just-drawn card can complete a set. Now, a demo of Self-draw Pong.',
    fbOpenPong: 'A Self-draw Pong requires you to select a personality dimension first. Hint: your hand has 4 "Neuroticism" cards — choose it.',
    fbChooseDim: (name: string, cnt: number) => `Chose "${name}". Now select exactly ${cnt} "${name}" cards from your hand.`,
    fbPongSuccess: 'Successfully filed. 4 cards have entered your public file area; you must discard 1 card immediately after filing.',
    fbPongFailWrongCount: (selected: number, cnt: number) => `You selected ${selected}, but it must be exactly ${cnt}`,
    fbPongFailWrongDim: (name: string) => `Your selection includes non-"${name}" cards (Knowledge cards count as no dimension)`,
    fbPongFail: (reason: string) =>
      `Self-draw Pong failed: ${reason}. In a real game you would be frozen for one turn (your next turn auto-skipped) and the cards you wrongly bet would be revealed.`,
    fbContinueAfterFail: (name: string, cnt: number) => `This time try selecting only the ${cnt} "${name}" cards (the highlighted ones).`,
    fbPickDiscard: 'Discard done. Now switching to how you respond with "Pong / Win" when someone else discards.',
    fbOpenClaimDim: (name: string) => `An opponent discarded a card. Intercept Pong similarly requires you to select your file dimension first — select the highlighted "${name}".`,
    captionClaimDim: (name: string) =>
      `The read window after a discard: just like Self-draw Pong, first tap the highlighted "${name}" to choose the dimension.`,
    fbOpenClaim: (name: string) => `An opponent discarded a "${name}" card. Pick 2 "${name}" cards from your hand, plus this discard to complete a set.`,
    fbClaimFail: (name: string, picked: number) =>
      `Intercept Pong needs exactly 2 "${name}" cards in hand (selected ${picked}). In a real game a wrong pick fails and freezes you for one turn.`,
    fbClaimSuccess: 'Intercept Pong successful! You completed a public file using 2 matching cards from your hand + the opponent\'s discard.',
    fbShowHu: 'Win declares victory: press it when all 5 dimensions are complete. Pressing it by mistake reveals your whole hand and freezes you.',
    fbWrongDimHint: (name: string) => `This isn\'t "${name}". Mixing dimensions fails the Pong — pick only "${name}".`,
    fbEnterHu: (name: string) => `Winning Tutorial: you have filed 4 dimensions and only need one final set of "${name}".`,
    fbHuSuccess: 'You win! All 5 dimensions complete — victory declared.',

    // ── Sandbox: Win window + gap label ──
    huWho: 'An opponent discards a personality card',
    huBody: (name: string) => `It is judged as "${name}" — exactly the dimension you needed. Your 3 "${name}" in hand + this card = the 5th set. That\'s a Win!`,
    huGapSuffix: (name: string) => `${name} (missing)`,

    // ── Sandbox: fallback dimension name for fail reasons ──
    fallbackDimName: 'that dimension',

    // ── FlowScreenshot (static mockups) ──
    shotPvpTitle: 'Online Flow Mockup',
    shotSoloTitle: 'Solo Flow Mockup',
    shotStaticBadge: 'Static mockup',
    shotProductName: 'Personalities Mahjong',
    shotPvp: 'Online Match',
    shotSolo: 'Play Solo',
    shotStudentId: 'Student ID',
    shotStartAssessBtn: 'Start Assessment',
    shotHomeHint: 'The sole entry point on your first visit',
    shotStudentIdTitle: 'Log In',
    shotStudentIdPlaceholder: 'Student ID (e.g. 17094905G)',
    shotPasswordPlaceholder: 'Password',
    shotLoginBtn: 'Log In',
    shotStudentIdOnce: 'Your student ID is your account',
    shotPortraitTitle: 'Your Personality Portrait',
    shotRetest: 'Retake Assessment',
    shotMaxPlayersLabel: 'Max Players',
    shotMaxPlayers: ['2P', '3P', '4P'] as readonly string[],
    shotRevealLabel: 'Reveal',
    shotReveals: ['Open', 'Semi-Open', 'Hidden'] as readonly string[],
    shotAiDifficultyLabel: 'AI Difficulty',
    shotRoundsLabel: 'Rounds',
    shotOpponentLabel: 'Opponents',
    shotCreateRoom: 'Create Room',
    shotJoinRoom: 'Join Room',
    shotHost: 'Host',
    shotStartGame: 'Start Game',
    shotStartMatch: 'Start Match',
    shotYou: 'You',
    shotDifficulties: ['Easy', 'Medium', 'Hard'] as readonly string[],
    shotRounds: ['5 rds', '10 rds', '15 rds', 'Unlimited'] as readonly string[],
    shotAiOpponents: ['Brian', 'Prof. Chen', 'Lin'] as readonly string[],
    shotAiOpponentLabel: 'AI opponent',
    // Merged sandbox CTA (bottom of the flow guide)
    sandboxCtaLead: 'Got the flow? Enter "Guided Practice" and play a hands-on round!',
  },
} as const;
