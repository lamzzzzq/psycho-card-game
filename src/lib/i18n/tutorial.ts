// 教學頁（tutorial）文案詞典。zh / en 同結構。
// 含 ${...} 變量的句子一律用箭頭函數（zh/en 同簽名、同參數）。
// 維度名本身已是雙語數據（DIMENSION_META.name / .nameEn），調用方按 locale 取好字符串再傳進來。

export const TUTORIAL_T = {
  zh: {
    // ── 頁眉 / 頁腳 ──
    eyebrow: 'Tutorial',
    title: '人格麻將 · Big Five · 教學',
    rulesHardcopy: '規則 Hardcopy',
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
    dgGoalCaption: '每維各需湊夠對應張數（圈內數字＝要幾張，每維不同）→ 5 維全部歸檔即食胡獲勝',
    dgPongCaption: '湊滿「該維度目標張數」即可鎖定：2 張手牌 + 1 張進來的牌 = 3 張（張數要與目標一致）',
    dgTableCaption: '你 + 3 AI（或 2–4 名玩家）圍住牌堆',
    dgDrawCaption: '每回合先從牌堆摸 1 張',
    dgDiscardCaption: '棄 1 張 → 開啟判讀窗口',
    dgWinBtn: '食胡',
    dgWinCaption: '5 維湊齊 → 按「食胡」',
    dgFrozenCaption: '宣告失敗 → 罰停 1 回合、亮牌',
    dgViewCaption: '翻開手牌看真實維度（張數／是否永久依難度）',
    dgKnowledgeCaption: '無維度 · 安全棄牌',
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
        body: '首次進入時，首頁只有一個「開始測評」入口。先完成人格測評，測評分數會決定你之後每個維度要湊幾張牌。',
      },
      {
        title: '輸入學號',
        body: '答題前輸入一次學號即可，用於記錄你的測評結果、方便課堂統計。',
        note: '學號全程只輸入這一次，之後聯機 / 單機都會自動帶入，無需再填。',
      },
      {
        title: '查看人格畫像',
        body: '答完題進入「你的人格畫像」：五維雷達圖 + 各維度得分。這一頁底部就是「聯機對戰 / 單機對戰 / 重新測評」的入口。',
        note: '測評分數決定各維度目標張數，也決定你的起始手牌數（＝五維目標張數之和 − 1）。因此每個人的開局規模與胡牌路線都不同。',
      },
      {
        title: '進入聯機對戰',
        body: '在畫像頁點「聯機對戰」。學號已從測評帶入，創建或加入房間，並設定最多玩家數、遊戲輪數、看牌難度。',
      },
      {
        title: '開始對戰',
        body: '房主創建房間後拿到房間碼，分享給其他玩家加入；人齊後房主點「開始對戰」進入牌桌。默認明牌（全場人格公開），房主也可改半公開或隱藏。',
      },
    ] as ReadonlyArray<{ title: string; body: string; note?: string }>,

    // ── SOLO_FLOW ──（前 3 步與聯機共用）
    soloFlow: [
      {
        title: '開始測評',
        body: '首次進入時，首頁只有一個「開始測評」入口。先完成人格測評，測評分數會決定你之後每個維度要湊幾張牌。',
      },
      {
        title: '輸入學號',
        body: '答題前輸入一次學號即可，用於記錄你的測評結果、方便課堂統計。',
        note: '學號全程只輸入這一次，之後聯機 / 單機都會自動帶入，無需再填。',
      },
      {
        title: '查看人格畫像',
        body: '答完題進入「你的人格畫像」：五維雷達圖 + 各維度得分。這一頁底部就是「聯機對戰 / 單機對戰 / 重新測評」的入口。',
        note: '測評分數決定各維度目標張數，也決定你的起始手牌數（＝五維目標張數之和 − 1）。因此每個人的開局規模與胡牌路線都不同。',
      },
      {
        title: '進入單機對戰',
        body: '在畫像頁點「單機對戰」進入對戰大廳。設定 AI 難度、遊戲輪數、看牌難度，並查看三名 AI 對手檔案。',
      },
      {
        title: '開始對戰',
        body: '設定好後點「開始對戰」直接進入牌桌。單機固定是你 + 3 個 AI，流程與聯機一致：抽牌、查看、歸檔、棄牌、響應別人棄牌。',
      },
    ] as ReadonlyArray<{ title: string; body: string; note?: string }>,

    // ── STEPS（規則要點卡片）──
    steps: [
      {
        title: '🎯 終極目標：五維全部「公開歸檔」',
        body: '把大五人格的 5 個維度（開放性 O、盡責性 C、外向性 E、宜人性 A、神經質 N）全部湊齊並「公開歸檔」，最快完成的人「食胡」獲勝。\n每個維度要湊幾張，取決於你自己的測評分數 —— 所以每個人的「胡牌路線」都不一樣。',
        hint: '初始手牌張數 =（五維目標張數之和）− 1。少的那 1 張，要靠「碰」或「食胡」補齊。',
      },
      {
        title: '🃏 認識卡牌',
        body: '牌堆只有兩類牌，很好認：\n• 人格描述牌（有顏色）：帶特定人格維度標籤，是你用來歸檔（湊張數）的核心牌。\n• 知識牌（灰色 / 無顏色）：印有心理學術語與定義，沒有維度、不能用來歸檔。',
        hint: '知識牌抽到就打掉，安全不穿幫；還能順便觀察對手打出知識牌的時機，試探他們的出牌風格。',
      },
      {
        title: '🔄 基本輪迴：摸牌 → 出牌',
        body: '❶ 摸牌：輪到你先從牌堆摸 1 張，然後可查看手牌、歸檔或準備出牌。\n❷ 出牌：從手牌選 1 張不需要的丟到中間「棄牌堆」—— 這張牌會進入幾秒的「心理判讀窗口」，其他玩家可決定要不要搶來「碰」或「食胡」。\n看牌難度（房主設定）決定你每回合能看幾張手牌：明牌（全公開）/ 半公開（看 4 張、永久保留）/ 隱藏（看 2 張、下一輪重置）。',
      },
      {
        title: '⚡ 兩大核心動作：碰 與 食胡',
        body: '🀄 碰（公開歸檔）：某維度湊齊你的目標張數即可歸檔鎖定。\n• 自摸碰：自己回合（摸牌後），從「手牌 + 剛摸的牌」挑出恰好目標張數的同維度牌（每回合限 1 次）。\n• 截胡碰：別人的判讀窗口內、只差 1 張時，搶走那張棄牌湊齊（先搶先得）。\n🏆 食胡（宣告勝利）：已歸檔 + 手牌 + 當下判定牌，恰好完成全部 5 維時宣告，自摸或截胡皆可。',
        hint: '系統不會提示哪個維度夠了 —— 5 個維度按鈕都會亮，你得自己算對維度與張數。選錯 / 沒算好 → 判定失敗被「罰停」！',
      },
      {
        title: '🚫 懲罰機制：罰停',
        body: '「碰失敗 / 自摸碰失敗 / 食胡失敗」懲罰相同：\n• 罰停一回合：下次輪到你自動跳過（不抽、不出）。\n• 強制亮牌：押錯的牌（碰）或整副手牌（食胡）立即公開給全場。\n• 失去參與：罰停期間不能碰、不能食胡別人的棄牌。\n• 頭像掛上大大的「⛔ 罰停中」標識。',
        hint: '一次失誤等於送對手一回合，動手前務必看清楚、算明白！',
      },
      {
        title: '👥 聯機與勝負規則',
        body: '• 人數：聯機 2–4 人；單機固定 4 人（你 + 3 個 AI）。\n• 退出：有人點「退出對局」後座位永久跳過（🚪 已退出），不影響其他人繼續；若只剩 1 人，該玩家直接獲勝。\n• 逾時提醒：回合超過 30 秒未操作會彈提醒（每 30 秒一次）。\n• 防作弊：同一學號不可同時進入兩個活躍房間。\n• 無人胡：打滿約定輪數仍無人食胡 → 按「已歸檔維度數（多者勝）→ 剩餘手牌張數（少者勝）」判定。',
      },
    ] as ReadonlyArray<{ title: string; body: string; hint?: string }>,

    // ── 沙盒：底部指引欄標籤 ──
    guideLabel: '指引',

    // ── 沙盒：頭部 ──
    sandboxLabel: '交互式沙盒',
    sandboxReset: '重新開始',
    sandboxExit: '退出沙盒',

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
    introBody: '每個維度都有一個指定張數，你要湊到那個數量，才能把這組牌「碰」下來、公開鎖定。張數是根據你的測評分數決定的，每個維度不一樣，數字愈大就愈難湊。下面是這局示範的目標：',
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
    captionStart: '這是你的開局：手牌裏有多種人格描述和一張知識牌。你需要先抽牌，再決定要查看、歸檔還是棄牌。',
    captionViewing: '看牌難度不同，每回合能看幾張、看完是否保留也不同：半公開每回合看 4 張，看過的永久保留（直到打出）；隱藏每回合看 2 張（最難），看完下一輪就重置、不保留。本示範用最難的「隱藏」——先點上方高亮的「查看 2 張」開始。',
    captionViewPicking: (n: number) =>
      n >= 2
        ? '兩張都看過了！點高亮的「完成查看」繼續。'
        : `點選下方高亮的 2 張牌，揭開它們的真實維度（已看 ${n}/2）。`,
    captionAfterDraw: '看上方「目標張數」：神經質要 4 張，而你手裏正好有 4 張神經質。點高亮的「自摸碰」開始（之後再選維度、再點牌）。',
    captionPongDimension: (name: string) =>
      `自摸碰先選定一個維度。目標板上「${name}」需要的張數，正是你手裏有的張數——選高亮的「${name}」。`,
    captionPongPickingDone: (name: string, cnt: number) => `已選滿 ${cnt} 張「${name}」。點高亮的「確認自摸碰」完成歸檔。`,
    captionPongPicking: (name: string, cnt: number, sel: number) =>
      `從手牌精確選擇 ${cnt} 張「${name}」（高亮的就是，已選 ${sel}/${cnt}）。`,
    captionPongFailed: '失敗會公開你押錯的牌並罰停一回合（下次輪到你時自動跳過）。點「繼續」回到選牌模式。',
    captionPongSuccess: '自摸碰成功！4 張公開歸檔鎖定。現在點一張手牌準備棄掉，結束回合。',
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
    captionDone: '你的回合結束。下一步模擬別人棄牌後的「碰 / 食胡」窗口。',

    // ── 沙盒：feedback（reducer 內）──
    fbDraw: '抽到一張牌。現在選擇很多，先演示「查看 2 張牌」。',
    fbViewTwo: '本回合查看了 2 張牌：一張盡責性，一張神經質。隱藏模式看過的牌下一輪會重置、不保留；真實牌局裏只會揭開你選的 2 張。',
    fbViewStart: '點選下方高亮的 2 張牌，揭開它們的真實維度。',
    fbViewPicked: '已揭開一張。再點另一張高亮的牌。',
    fbViewDone: '兩張都看過了。隱藏模式每回合只能看 2 張，而且下一輪就重置、不保留；換成半公開則是每回合看 4 張、看過永久保留。',
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
    shotStudentIdTitle: '輸入學號',
    shotStudentIdPlaceholder: '例如 17094905G',
    shotStudentIdOnce: '全程只輸入這一次',
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
    rulesHardcopy: 'Rules Hardcopy',
    backHome: 'Back to Home',

    // ── Main CTA ──
    ctaTitle: 'See the flow first, then play Guided Practice',
    ctaBody: 'It walks you through, step by step: setup (solo/online), the quiz, room flow, viewing your hand, Pong, and Win.',
    ctaButton: '▶ Enter Guided Practice',

    // ── Concept cards section title ──
    rulesPointsLabel: 'Key Rules',
    // Rule diagram (CSS mockup) captions
    dgHand: 'Your hand',
    dgIncoming: 'Drawn / discarded',
    dgLocked: 'Locked set',
    dgGoalCaption: 'Each dimension needs its own count (the number in the chip = how many cards, different per dimension) → declare all 5 to win.',
    dgPongCaption: 'Reach that dimension’s target count to lock it: 2 hand cards + 1 incoming card = 3 (the count must match the target).',
    dgTableCaption: 'You + 3 AI (or 1 to 3 players) around the pile',
    dgDrawCaption: 'Draw 1 from the pile to start your turn',
    dgDiscardCaption: 'Discard 1 → opens the read window',
    dgWinBtn: 'Win',
    dgWinCaption: 'All 5 complete → press "Win"',
    dgFrozenCaption: 'Failed call → frozen 1 turn, cards shown',
    dgViewCaption: 'Flip hand cards to see dimensions (count/persistence varies by difficulty)',
    dgKnowledgeCaption: 'No dimension · safe discard',
    dgExitCaption: 'Leave → seat skipped for good',
    dgScoringCaption: 'No win → rank by declared dimensions',
    directStartAssess: 'Go Straight to Assessment',

    // ── Start flow guide ──
    flowEyebrow: 'Getting Started',
    flowTitle: 'From Home to First Hand',
    tabPvp: 'Online Match',
    tabSolo: 'Single Player',
    prevStep: 'Previous',
    nextStep: 'Next',

    // ── PVP_FLOW ──（first 3 steps shared with solo: assess → ID → profile）
    pvpFlow: [
      {
        title: 'Start the Assessment',
        body: 'On your first visit the home page has just one entry: "Start Assessment". Complete the personality assessment first — your scores decide how many cards each dimension will need later.',
      },
      {
        title: 'Enter Your Student ID',
        body: 'Before the questions, enter your student ID once. It records your assessment result for class statistics.',
        note: 'The student ID is entered only this once — online and single-player both carry it over automatically, no need to type it again.',
      },
      {
        title: 'View Your Personality Profile',
        body: 'After the questions you reach "Your Personality Profile": a five-dimension radar chart plus per-dimension scores. The bottom of this page is where "Online Match / Single Player / Retest" live.',
        note: 'Your assessment scores set each dimension’s target count and also your starting hand size (= the sum of the five targets − 1), so every player has a different opening and path to a Win.',
      },
      {
        title: 'Enter Online Match',
        body: 'Tap "Online Match" on the profile page. Your student ID is carried over from the assessment; create or join a room and set max players, rounds, and reveal difficulty.',
      },
      {
        title: 'Start the Match',
        body: 'The host creates a room, gets a room code, and shares it for others to join; once everyone is in, the host taps "Start Match" to enter the table. Open by default (all personalities public) — the host can switch to Half or Hidden.',
      },
    ] as ReadonlyArray<{ title: string; body: string; note?: string }>,

    // ── SOLO_FLOW ──（first 3 steps shared with online）
    soloFlow: [
      {
        title: 'Start the Assessment',
        body: 'On your first visit the home page has just one entry: "Start Assessment". Complete the personality assessment first — your scores decide how many cards each dimension will need later.',
      },
      {
        title: 'Enter Your Student ID',
        body: 'Before the questions, enter your student ID once. It records your assessment result for class statistics.',
        note: 'The student ID is entered only this once — online and single-player both carry it over automatically, no need to type it again.',
      },
      {
        title: 'View Your Personality Profile',
        body: 'After the questions you reach "Your Personality Profile": a five-dimension radar chart plus per-dimension scores. The bottom of this page is where "Online Match / Single Player / Retest" live.',
        note: 'Your assessment scores set each dimension’s target count and also your starting hand size (= the sum of the five targets − 1), so every player has a different opening and path to a Win.',
      },
      {
        title: 'Enter Single Player',
        body: 'Tap "Single Player" on the profile page to open the battle lobby. Set the AI difficulty, rounds, and view difficulty, and check the three AI opponent profiles.',
      },
      {
        title: 'Start the Match',
        body: 'Once set, tap "Start Match" to go straight to the table. Single player is always you + 3 AI, and the flow matches online play: draw, view, declare, discard, and respond to others’ discards.',
      },
    ] as ReadonlyArray<{ title: string; body: string; note?: string }>,

    // ── STEPS ──
    steps: [
      {
        title: '🎯 Ultimate Goal: Publicly Archive All Five',
        body: 'Collect and "publicly archive" all 5 Big Five dimensions (Openness O, Conscientiousness C, Extraversion E, Agreeableness A, Neuroticism N); the first to finish declares "Win." How many cards each dimension needs comes from your own assessment score — so everyone’s path to a win is different.',
        hint: 'Starting hand size = (sum of the five targets) − 1. That one missing card must be completed via "Pong" or "Win".',
      },
      {
        title: '🃏 Know the Cards',
        body: 'The deck has only two kinds of cards:\n• Personality cards (colored): carry a dimension tag — your core cards for archiving (reaching a target count).\n• Knowledge cards (grey / uncolored): psychology terms and definitions; no dimension, cannot be archived.',
        hint: 'Discard knowledge cards when drawn (safe, no giveaway); watching when an opponent plays them can also hint at their style.',
      },
      {
        title: '🔄 The Loop: Draw → Discard',
        body: '❶ Draw: on your turn, draw 1 card, then view your hand, archive, or get ready to discard.\n❷ Discard: pick 1 unwanted card to the middle "discard pile" — it opens a few-second "psychological read window" where others may grab it to "Pong" or "Win."\nReveal difficulty (set by the host) decides how many hand cards you can view each turn: Open (all public) / Half (view 4, kept) / Hidden (view 2, reset next round).',
      },
      {
        title: '⚡ Two Core Actions: Pong & Win',
        body: '🀄 Pong (public archive): reach a dimension’s target count to lock it.\n• Self-draw Pong: on your own turn (after drawing), pick exactly the target count of same-dimension cards from your hand + the just-drawn card (once per turn).\n• Claim Pong: within an opponent’s read window, if you are one short, grab that discard to complete the set (first-come).\n🏆 Win (declare victory): when archived + hand + the current card exactly complete all 5 dimensions — by self-draw or claim.',
        hint: 'The system won’t tell you which dimension is ready — all 5 buttons light up; you must count the dimension and cards yourself. A wrong or miscounted pick fails and you are "Frozen"!',
      },
      {
        title: '🚫 Penalty: Frozen',
        body: 'A failed Pong / self-draw Pong / Win all carry the same penalty:\n• Frozen one turn: your next turn is auto-skipped (no draw, no discard).\n• Forced reveal: the cards you bet (Pong) or your whole hand (Win) are shown to everyone.\n• Locked out: while frozen you cannot Pong or Win on others’ discards.\n• A big "⛔ Frozen" badge sits under your avatar.',
        hint: 'One slip hands your opponent a turn — look carefully and count before you act!',
      },
      {
        title: '👥 Online & Results',
        body: '• Players: online 2–4; single player is always 4 (you + 3 AI).\n• Leaving: tapping "Leave" permanently skips that seat (🚪 Left); others keep playing, and if only 1 remains that player wins.\n• Idle nudge: if a turn goes over 30 seconds without action, a reminder pops (every 30 seconds).\n• Anti-cheat: the same student ID cannot occupy two active rooms at once.\n• No winner: if the agreed rounds run out with no Win → rank by archived-dimension count (more wins), then remaining hand cards (fewer wins).',
      },
    ] as ReadonlyArray<{ title: string; body: string; hint?: string }>,

    // ── Sandbox: bottom guidance bar label ──
    guideLabel: 'Guide',

    // ── Sandbox: header ──
    sandboxLabel: 'Interactive Sandbox',
    sandboxReset: 'Restart',
    sandboxExit: 'Exit Sandbox',

    // ── Sandbox: table labels ──
    publicArchiveLabel: 'Declared:',
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
    revealHalfNote: 'Half · view 4 · kept',
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
    introTitle: 'First: the "Targets" board',
    introBody: 'Each dimension has a required count — you must collect that many cards to "Pong" the set and lock it in publicly. The count comes from your assessment score, differs per dimension, and the bigger the number the harder. Here are this demo’s targets:',
    introBtn: 'Start the lesson',

    // ── Sandbox: target board + operation banner ──
    targetBoardLabel: 'Targets',
    opSelfPong: 'Self-draw Pong',
    opClaim: 'Claim Pong',
    opHu: 'Win',
    toastPongDone: 'Self-draw Pong complete!',
    toastClaimDone: 'Claim Pong complete!',
    toastHuDone: 'You win! 🏆',

    // ── Sandbox: self-draw Pong dimension pick ──
    pongStep1: 'Step 1 · Choose the dimension to declare',

    // ── Sandbox: self-draw Pong card pick ──
    pongStep2: (name: string, cnt: number, sel: number) =>
      `Step 2 · Self-draw Pong · ${name} · Select exactly ${cnt} (${sel}/${cnt} selected)`,

    // ── Sandbox: frozen demo box ──
    penaltyDemo: 'Frozen-for-one-turn demo: you cannot join others’ read windows this round, and your next turn is auto-skipped.',

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
    captionStart: 'This is your opening: your hand has several personality descriptions and 1 Knowledge card. You must draw first, then decide whether to view, declare, or discard.',
    captionViewing: 'Reveal difficulty changes how many you can view per turn AND whether they stay revealed: Half lets you view 4 each turn and they stay revealed for good (until played); Hidden lets you view 2 (the hardest) but they reset next round — not kept. This demo uses the hardest — Hidden — so tap the highlighted "View 2" above to start.',
    captionViewPicking: (n: number) =>
      n >= 2
        ? 'You’ve seen both! Tap the highlighted "Done viewing" to continue.'
        : `Tap the 2 highlighted cards below to reveal their true dimensions (${n}/2 seen).`,
    captionAfterDraw: 'Look at the "Targets" board above: Neuroticism needs 4, and your hand has exactly 4 Neuroticism. Tap the highlighted "Self-draw Pong" to start (you’ll pick the dimension, then the cards).',
    captionPongDimension: (name: string) =>
      `Self-draw Pong needs a dimension first. The count "${name}" needs on the board is exactly what you hold — choose the highlighted "${name}".`,
    captionPongPickingDone: (name: string, cnt: number) => `${cnt} "${name}" cards selected. Tap the highlighted "Confirm Pong" to declare.`,
    captionPongPicking: (name: string, cnt: number, sel: number) =>
      `Select exactly ${cnt} "${name}" cards from your hand (the highlighted ones; ${sel}/${cnt} selected).`,
    captionPongFailed: 'A failure reveals the cards you wrongly bet and freezes you for one turn (your next turn is auto-skipped). Tap "Continue" to return to card-picking.',
    captionPongSuccess: 'Self-draw Pong complete! 4 cards are locked in the declared area. Now tap a hand card to discard and end the turn.',
    captionDiscardConfirm: 'Discard this one? Tap "Discard" to end the turn, or "Cancel" to pick another.',
    captionClaimWindow: (name: string, sel: number) =>
      `The read window after someone discards: pick 2 highlighted "${name}" cards, plus that discard to form a set (${name} target is 3), then tap "Pong" (${sel}/2 selected).`,
    captionClaimWindowFallback: 'This is the read window after someone discards. You can Claim Pong, or Win if you have already met every target.',
    captionClaimSuccess: 'A Claim Pong also forms a declaration. Next, a demo of "Win".',
    captionHuDemo: 'Win is the victory button, used only when all targets are complete. Failure is costly, so do not use it for trial and error.',
    captionHuWindow: (name: string) =>
      `You have declared 4 dimensions and only "${name}" is left. The opponent’s discard is judged as "${name}" — exactly the dimension you needed. Tap the highlighted "Win" to declare victory.`,
    captionHuSuccess: 'You win! All 5 dimensions are complete.',
    captionDiscardPicking: 'Tap the card to discard.',
    captionDone: 'Your turn is over. Next, simulate the "Pong / Win" window after someone else discards.',

    // ── Sandbox: feedback (in reducer) ──
    fbDraw: 'Drew a card. There are many options now — first let’s demo "view 2 cards".',
    fbViewTwo: 'This turn you viewed 2 cards: one Conscientiousness, one Neuroticism. In Hidden mode viewed cards reset next round — not kept; in a real game only the 2 you pick are revealed.',
    fbViewStart: 'Tap the 2 highlighted cards below to reveal their true dimensions.',
    fbViewPicked: 'One revealed. Now tap the other highlighted card.',
    fbViewDone: 'Both viewed. In Hidden mode you see only 2 per turn and they reset next round (not kept); in Half mode you’d view 4 per turn and they stay revealed for good.',
    fbFinishView: 'You know the just-drawn card can complete a set. Now, a demo of Self-draw Pong.',
    fbOpenPong: 'Self-draw Pong needs you to fix a dimension first. Hint: your hand has 4 "Neuroticism" cards — choose it.',
    fbChooseDim: (name: string, cnt: number) => `Chose "${name}". Now select exactly ${cnt} "${name}" cards from your hand.`,
    fbPongSuccess: 'Declared. The 4 cards enter the open declaration area; after declaring you must immediately discard 1 card.',
    fbPongFailWrongCount: (selected: number, cnt: number) => `You selected ${selected}, but it must be exactly ${cnt}`,
    fbPongFailWrongDim: (name: string) => `Your selection includes non-"${name}" cards (Knowledge cards count as no dimension)`,
    fbPongFail: (reason: string) =>
      `Self-draw Pong failed: ${reason}. In a real game you would be frozen for one turn (your next turn auto-skipped) and the cards you wrongly bet would be revealed.`,
    fbContinueAfterFail: (name: string, cnt: number) => `This time try selecting only the ${cnt} "${name}" cards (the highlighted ones).`,
    fbPickDiscard: 'Discard done. Now switching to how you respond with "Pong / Win" when someone else discards.',
    fbOpenClaimDim: (name: string) => `An opponent discarded a card. Like Self-draw Pong, first choose the dimension to declare — pick the highlighted "${name}".`,
    captionClaimDim: (name: string) =>
      `The read window after a discard: just like Self-draw Pong, first tap the highlighted "${name}" to choose the dimension.`,
    fbOpenClaim: (name: string) => `An opponent discarded a "${name}" card. Pick 2 "${name}" cards from your hand, plus this discard to complete a set.`,
    fbClaimFail: (name: string, picked: number) =>
      `Claim Pong needs exactly 2 "${name}" cards in hand (selected ${picked}). In a real game a wrong pick fails and freezes you for one turn.`,
    fbClaimSuccess: 'Claim Pong succeeded. You completed a declaration using 2 same-type cards from your hand + the opponent’s discard.',
    fbShowHu: 'Win declares victory: press it when all 5 dimensions are complete. Pressing it by mistake reveals your whole hand and freezes you.',
    fbWrongDimHint: (name: string) => `This isn’t "${name}". Mixing dimensions fails the Pong — pick only "${name}".`,
    fbEnterHu: (name: string) => `Win lesson: you’ve declared 4 dimensions and only "${name}" is left.`,
    fbHuSuccess: 'You win! All 5 dimensions complete — victory declared.',

    // ── Sandbox: Win window + gap label ──
    huWho: 'An opponent discards a personality card',
    huBody: (name: string) => `It is judged as "${name}" — exactly the dimension you needed. Your 3 "${name}" in hand + this card = the 5th set. That’s a Win!`,
    huGapSuffix: (name: string) => `${name} (missing)`,

    // ── Sandbox: fallback dimension name for fail reasons ──
    fallbackDimName: 'that dimension',

    // ── FlowScreenshot (static mockups) ──
    shotPvpTitle: 'Online Flow Mockup',
    shotSoloTitle: 'Single-Player Flow Mockup',
    shotStaticBadge: 'Static mockup',
    shotProductName: 'Personalities Mahjong',
    shotPvp: 'Online Match',
    shotSolo: 'Single Player',
    shotStudentId: 'Student ID',
    shotStartAssessBtn: 'Start Assessment',
    shotHomeHint: 'The only entry on first visit',
    shotStudentIdTitle: 'Enter Student ID',
    shotStudentIdPlaceholder: 'e.g. 17094905G',
    shotStudentIdOnce: 'Entered only once, ever',
    shotPortraitTitle: 'Your Personality Profile',
    shotRetest: 'Retest',
    shotMaxPlayersLabel: 'Max Players',
    shotMaxPlayers: ['2P', '3P', '4P'] as readonly string[],
    shotRevealLabel: 'Reveal',
    shotReveals: ['Open', 'Half', 'Hidden'] as readonly string[],
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
    sandboxCtaLead: 'Got the flow? Enter Guided Practice and play a hands-on round',
  },
} as const;
