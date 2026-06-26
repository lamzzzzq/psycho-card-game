// 教學頁（tutorial）文案詞典。zh / en 同結構。
// 含 ${...} 變量的句子一律用箭頭函數（zh/en 同簽名、同參數）。
// 維度名本身已是雙語數據（DIMENSION_META.name / .nameEn），調用方按 locale 取好字符串再傳進來。

export const TUTORIAL_T = {
  zh: {
    // ── 頁眉 / 頁腳 ──
    eyebrow: 'Tutorial',
    title: '人格麻將 · 教學',
    rulesHardcopy: '規則 Hardcopy',
    backHome: '返回首頁',

    // ── 主 CTA ──
    ctaTitle: '先看流程，再進沙盒打一回合',
    ctaBody: '教學覆蓋：聯機 / 單機開局、答題檢查、房間流程、查看手牌、碰、食胡、失敗懲罰。',
    ctaButton: '▶ 進入交互沙盒',

    // ── 概念卡片區標題 ──
    rulesPointsLabel: '規則要點',
    // 規則示意圖（CSS 拼圖）文案
    dgHand: '你的手牌',
    dgIncoming: '抽到／別人棄的',
    dgLocked: '鎖定一組',
    dgGoalCaption: '5 維全部歸檔 → 食胡獲勝',
    dgTableCaption: '你 + 3 AI（或 1 到 3 名玩家）圍住牌堆',
    dgDrawCaption: '每回合先從牌堆摸 1 張',
    dgDiscardCaption: '棄 1 張 → 開啟判讀窗口',
    dgWinBtn: '食胡',
    dgWinCaption: '5 維湊齊 → 按「食胡」',
    dgFrozenCaption: '宣告失敗 → 罰停 1 回合、亮牌',
    dgViewCaption: '每回合 1 次：翻開 2 張看維度',
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

    // ── PVP_FLOW ──
    pvpFlow: [
      {
        title: '進入聯機對戰',
        body: '從首頁點「聯機對戰」。這裏不是直接進牌桌，而是先進入聯機大廳。',
      },
      {
        title: '填寫身份信息',
        body: '只輸入學號，並再次輸入學號確認。學號用於防止同一個人同時佔兩個活動房間的座位。',
      },
      {
        title: '檢查是否完成測評',
        body: '已測評：系統會用你的五維分數生成本局目標張數。未測評：會先引導去測評，否則你的目標張數沒有依據。',
        note: '測評結果會影響每個維度需要歸檔幾張，所以不同玩家的胡牌路線不同。',
      },
      {
        title: '創建房間 / 加入房間',
        body: '房主創建房間後拿到房間碼並等待其他玩家；非房主輸入房間碼加入。4 個真實玩家坐齊後才適合開始。',
      },
      {
        title: '開始遊戲',
        body: '房主負責點開始。進入牌桌後，所有人的手牌維度默認不公開，只能靠描述、記憶和每回合查看能力判斷。',
      },
    ] as ReadonlyArray<{ title: string; body: string; note?: string }>,

    // ── SOLO_FLOW ──
    soloFlow: [
      {
        title: '進入單機對戰',
        body: '從首頁點「單機對戰」。如果沒有測評結果，會先去測評；如果已經測評，直接進入單機設置大廳。',
      },
      {
        title: '選擇 AI 難度',
        body: '簡單偏隨機，中等會做基礎歸檔判斷，困難會更積極推測你的牌。',
      },
      {
        title: '選擇輪數',
        body: '5 / 10 / 15 / 無限都可以。無限會一直打到有人食胡或牌局自然結束。',
      },
      {
        title: '確認對手陣容',
        body: '單機固定是你 + 3 個 AI。AI 會按自己的策略抽牌、棄牌、碰牌和食胡。',
      },
      {
        title: '開始遊戲',
        body: '進入牌桌後流程和聯機一致：抽牌、查看、歸檔、棄牌、響應別人棄牌。',
      },
    ] as ReadonlyArray<{ title: string; body: string; note?: string }>,

    // ── STEPS（規則要點卡片）──
    steps: [
      {
        title: '你的目標',
        body: '5 個人格維度（開放性、盡責性、外向性、宜人性、神經質）全部完成「公開歸檔」，先達成的玩家獲勝。每個維度需要湊多少張，取決於你自己的測評分數 —— 所以每個人的「胡牌路線」都不一樣。',
      },
      {
        title: '牌桌',
        body: '單機固定 4 人（你 + 3 個 AI）；聯機 1 到 3 名玩家。牌堆會依人數縮放。牌分兩類：帶顏色標記的「人格描述牌」（屬於某一維度），以及無維度歸屬的「檔案註記 / 知識牌」（中立，可棄可觀察對手風格）。',
        hint: '初始手牌張數 = 5 個維度目標張數之和 − 1。少的那張要靠「碰」或「食胡」補齊。',
      },
      {
        title: '抽牌',
        body: '輪到你時，先點擊牌堆抽 1 張。如果你願意，可以一次性開啓「查看 2 張牌」的特權 —— 每回合最多 1 次，把任意 2 張未知的手牌真實人格揭開。用完即重置到下次回合。',
      },
      {
        title: '出牌',
        body: '抽完後選 1 張你不需要的丟到中間的棄牌堆。被棄出的牌進入「心理判讀窗口」，其他 3 名玩家有幾秒鐘決定是否要「碰」（同維度歸檔）或「食胡」（直接勝利）。',
      },
      {
        title: '碰（公開歸檔）',
        body: '把同維度的牌湊齊目標張數即可歸檔。兩種觸發方式：\n• 自摸碰（你自己回合內，每回合最多 1 次）→ 從你的「手牌 + 剛抽到的牌」裏挑選恰好「該維度目標張數」張同維度牌；\n• 截胡碰（claim 窗口內先點先得）→ 從手牌挑選「該維度目標張數 − 1」張同維度牌，加上那張棄牌正好湊齊；\n選錯維度、混入其他人格牌、張數不對 → 視爲「碰失敗」，會被罰停（見下「罰停」一節）。',
        hint: '系統不會告訴你「這個維度你夠了」，5 個未歸檔維度全部讓你選，需要自己判斷。',
      },
      {
        title: '食胡（宣佈勝利）',
        body: '當你的牌（已歸檔 + 手中 + 這張待判定牌）正好完成全部 5 個維度時，按下「食胡」。\n觸發時機：\n• 你的回合中（自摸食胡）；\n• 任意人棄牌進入判讀窗口時（截胡食胡）。\n判定不成立 → 食胡失敗，整副手牌公開並罰停。',
      },
      {
        title: '罰停（失敗的懲罰）',
        body: '「碰失敗 / 自摸碰失敗 / 食胡失敗」三者懲罰相同：下次輪到你時罰停一回合，自動跳過（不抽牌、不出牌）後立即解除。\n罰停期間：\n• 你押錯的那幾張牌（碰 / 自摸碰）或整副手牌（食胡）立即公開；\n• 任何人棄牌進入判讀窗口時，你都不能參與（不能碰、不能食胡）。\n所有玩家都會在你頭像下看到「⛔ 罰停中」標識。',
        hint: '一次誤判 ≈ 損失下一個出牌回合，務必想清楚再下手。罰停期間也不能宣告食胡。',
      },
      {
        title: '查看 2 張牌（每回合 1 次）',
        body: '手牌人格默認不顯示維度，必須靠記憶和推理。但你可以在自己回合開始抽完後，啓用「🔍 查看 2 張牌」一次性把 2 張手牌的真實維度揭開。本回合內有效，下回合自動重置。\n用得好的玩家會優先看自己最不確定的牌，避免歸檔時混入錯誤。',
      },
      {
        title: '知識牌（檔案註記）',
        body: '牌堆裏有一類無人格歸屬的「檔案註記 / 知識牌」 —— 內容是心理學課程概念（術語 + 定義）。它們不能用於歸檔，但也不會"穿幫"成錯誤維度。\n用途：\n• 抽到就丟，騰出手牌空間；\n• 也是觀察對手心理風格的趣味設計（看對手怎麼挑這些中性牌可以暴露偏好）。',
      },
      {
        title: '聯機 · 退出與輪轉',
        body: '聯機房 2–4 人，任何人點「退出對局」即從該桌退出 —— 不接管，剩下的玩家繼續打到分勝負。\n• 退出者的座位永久跳過（看到「🚪 已退出對局」徽章）；\n• 僅剩 1 人即自動宣告該玩家勝利；\n• 你的回合超過 30 秒未操作會彈「請注意：現在是你的回合」提醒，每 30 秒重複一次直到你出牌。',
        hint: '同學號同時進入兩個活動房間會被拒絕 —— 防止兩個客戶端共享同一座位。',
      },
      {
        title: '勝負與結算',
        body: '第一個完成全部 5 維度歸檔的玩家直接獲勝。若打滿約定輪數仍無人胡，則按排名結算：先比已歸檔維度數（多者勝），同數再比剩餘手牌（少者勝）。',
      },
    ] as ReadonlyArray<{ title: string; body: string; hint?: string }>,

    // ── 沙盒：底部指引欄標籤 ──
    guideLabel: '指引',

    // ── 沙盒：頭部 ──
    sandboxLabel: '交互式沙盒',
    sandboxReset: '重置',
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
    btnContinueJudge: '繼續判斷',
    btnSelfPong: '自摸碰',
    btnCancel: '取消',
    btnSelfArchive: '自摸歸檔',
    btnContinue: '繼續 →',
    btnPong: '碰',
    btnContinueHu: '繼續看食胡',
    btnSimDiscard: '模擬別人棄牌',
    btnPlayAgain: '再來一遍',

    // ── 沙盒：自摸碰選維度 ──
    pongStep1: '🎯 第一步 · 選擇要歸檔的人格維度',

    // ── 沙盒：自摸碰選牌（cnt = 目標張數，sel = 已選）──
    pongStep2: (name: string, cnt: number, sel: number) =>
      `🎯 第二步 · 自摸碰 · ${name} · 請精確選擇 ${cnt} 張（已選 ${sel}/${cnt}）`,

    // ── 沙盒：罰停演示框 ──
    penaltyDemo: '罰停一回合演示：本輪不能參與別人棄牌的判讀窗口，下次輪到你時自動跳過。',

    // ── 沙盒：截胡窗口卡片 ──
    claimWho: '小明棄出了一張線索牌',
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
    captionStart: '這是你的開局：手牌裏有多種人格描述和 1 張檔案註記。你需要先抽牌，再決定要查看、歸檔還是棄牌。',
    captionViewing: '每回合可以查看 2 張手牌的真實維度。點擊「查看 2 張」後，再繼續進入歸檔判斷。',
    captionAfterDraw: '你現在擁有足夠完成一組的線索。下一步點高亮的「自摸碰」試試。',
    captionPongDimension: (name: string) =>
      `自摸碰要先選定一個人格維度。在下方五個維度裏選擇高亮的「${name}」（手牌裏正好有 4 張）。`,
    captionPongPickingDone: (name: string, cnt: number) => `已選 ${cnt} 張「${name}」。點高亮的「自摸歸檔」完成歸檔。`,
    captionPongPicking: (name: string, cnt: number, sel: number) =>
      `從手牌精確選擇 ${cnt} 張「${name}」的牌（高亮的牌就是，已選 ${sel}/${cnt}）。`,
    captionPongFailed: '失敗會公開你押錯的牌並罰停一回合（下次輪到你時自動跳過）。點「繼續」回到選牌模式。',
    captionPongSuccess: '歸檔成功！現在必須棄 1 張牌結束回合。點下方高亮的手牌中任意一張棄掉。',
    captionClaimWindow: (name: string, sel: number) =>
      `別人棄牌後的判讀窗口：從手牌選 2 張高亮的「${name}」，加那張棄牌湊一組，再點「碰」（已選 ${sel}/2）。`,
    captionClaimWindowFallback: '現在是別人棄牌後的判讀窗口。你可以截胡碰，也可以在已經滿足全部目標時食胡。',
    captionClaimSuccess: '截胡碰也會形成公開歸檔。這個記錄會出現在玩家頭像下和歸檔記錄裏。',
    captionHuDemo: '食胡是勝利按鈕，只在所有目標完成時使用。失敗成本很高，所以不要拿它試錯。',
    captionDiscardPicking: '點擊要棄的牌。',
    captionDone: '你的回合結束。下一步模擬別人棄牌後的「碰 / 食胡」窗口。',

    // ── 沙盒：feedback（reducer 內）──
    fbDraw: '抽到一張線索牌。現在選擇很多，先演示「查看 2 張牌」。',
    fbViewTwo: '本回合查看了 2 張牌：一張盡責性，一張神經質。真實牌局裏只會揭開你選的 2 張。',
    fbFinishView: '現在你知道剛抽到的牌能補齊一組。下一步演示自摸碰。',
    fbOpenPong: '自摸碰要先選定一個人格維度。提示：手牌裏有 4 張「神經質」，選它。',
    fbChooseDim: (name: string, cnt: number) => `已選擇「${name}」。現在從手牌精確選擇 ${cnt} 張「${name}」的牌。`,
    fbPongSuccess: '歸檔成功。4 張進入公開歸檔區，歸檔後必須立即棄 1 張牌。',
    fbPongFailWrongCount: (selected: number, cnt: number) => `選了 ${selected} 張，必須正好 ${cnt} 張`,
    fbPongFailWrongDim: (name: string) => `選中的牌裏有非「${name}」（檔案註記不算任何維度）`,
    fbPongFail: (reason: string) =>
      `自摸碰失敗：${reason}。真實遊戲會罰停一回合（下次輪到你時自動跳過），並公開你剛剛押錯的牌。`,
    fbContinueAfterFail: (name: string, cnt: number) => `試試這次只選 ${cnt} 張「${name}」（高亮的牌）。`,
    fbPickDiscard: '出牌完成。現在切到別人棄牌時，你如何響應「碰 / 食胡」。',
    fbOpenClaim: (name: string) => `對手棄出一張「${name}」線索牌。從手牌選 2 張「${name}」，加這張棄牌湊成一組。`,
    fbClaimFail: (name: string, picked: number) =>
      `截胡碰需要正好 2 張「${name}」手牌（已選 ${picked}）。真實遊戲選錯會判失敗並罰停一回合。`,
    fbClaimSuccess: '截胡碰成功。你用手裏 2 張同類牌 + 對手棄牌完成了一組公開歸檔。',
    fbShowHu: '食胡用於宣佈勝利：當 5 個維度全部完成時按下。誤按會公開整副手牌並罰停。',

    // ── 沙盒：失敗原因兜底維度名 ──
    fallbackDimName: '該維度',

    // ── FlowScreenshot（靜態示意圖）──
    shotPvpTitle: '聯機流程截圖示意',
    shotSoloTitle: '單機流程截圖示意',
    shotStaticBadge: '靜態示意',
    shotProductName: '人格麻將',
    shotPvp: '聯機對戰',
    shotSolo: '單機對戰',
    shotPlayerInfo: '玩家信息',
    shotStudentId: '學號',
    shotEnterStudentId: '請輸入學號',
    shotConfirmStudentId: '確認學號',
    shotReenterStudentId: '再次輸入學號確認',
    shotAssessedTrue: '已完成測評',
    shotAssessedTrueBody: '直接生成本局目標張數。',
    shotAssessedFalse: '未完成測評',
    shotAssessedFalseBody: '先去答題，再回到大廳。',
    shotCreateRoom: '創建房間',
    shotRoomCode: (code: string) => `房間碼 ${code}`,
    shotJoinRoom: '加入房間',
    shotEnter4Code: '輸入 4 位房間碼',
    shotHost: '房主',
    shotReady: '已就緒',
    shotStartGame: '開始遊戲',
    shotStartMatch: '開始對戰',
    shotYou: '你',
    shotDifficulties: ['簡單', '中等', '困難'] as readonly string[],
    shotRounds: ['5輪', '10輪', '15輪', '無限'] as readonly string[],
    shotAiOpponents: ['小明', '林教授', '老陳'] as readonly string[],
    shotAiOpponentLabel: 'AI 對手',
  },
  en: {
    // ── Header / footer ──
    eyebrow: 'Tutorial',
    title: 'Personalities Mahjong · Tutorial',
    rulesHardcopy: 'Rules Hardcopy',
    backHome: 'Back to Home',

    // ── Main CTA ──
    ctaTitle: 'See the flow first, then play a round in the sandbox',
    ctaBody: 'Covers: online / solo setup, assessment check, room flow, viewing cards, Pong, Win, and failure penalties.',
    ctaButton: '▶ Enter Interactive Sandbox',

    // ── Concept cards section title ──
    rulesPointsLabel: 'Key Rules',
    // Rule diagram (CSS mockup) captions
    dgHand: 'Your hand',
    dgIncoming: 'Drawn / discarded',
    dgLocked: 'Locked set',
    dgGoalCaption: 'Declare all 5 dimensions → win (Hu)',
    dgTableCaption: 'You + 3 AI (or 1 to 3 players) around the pile',
    dgDrawCaption: 'Draw 1 from the pile to start your turn',
    dgDiscardCaption: 'Discard 1 → opens the read window',
    dgWinBtn: 'Win',
    dgWinCaption: 'All 5 complete → press "Win"',
    dgFrozenCaption: 'Failed call → frozen 1 turn, cards shown',
    dgViewCaption: 'Once a turn: flip 2 cards to see dimensions',
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

    // ── PVP_FLOW ──
    pvpFlow: [
      {
        title: 'Enter Online Match',
        body: 'Tap "Online Match" on the home page. This does not take you straight to the table — it opens the online lobby first.',
      },
      {
        title: 'Fill in Your Identity',
        body: 'Just enter your student ID, then re-enter it to confirm. The student ID prevents one person from occupying two active rooms at once.',
      },
      {
        title: 'Check Whether You Have Been Assessed',
        body: 'Assessed: the system uses your five-dimension scores to generate this game’s target counts. Not assessed: you are guided to the assessment first, otherwise your target counts have no basis.',
        note: 'Your assessment result determines how many cards each dimension needs to declare, so different players have different paths to a Win.',
      },
      {
        title: 'Create / Join a Room',
        body: 'The host creates a room, gets a room code, and waits for others; non-hosts enter the room code to join. It is best to start once 4 real players are seated.',
      },
      {
        title: 'Start the Game',
        body: 'The host taps start. Once at the table, everyone’s hand dimensions are hidden by default — you rely on descriptions, memory, and your per-turn view ability to judge.',
      },
    ] as ReadonlyArray<{ title: string; body: string; note?: string }>,

    // ── SOLO_FLOW ──
    soloFlow: [
      {
        title: 'Enter Single Player',
        body: 'Tap "Single Player" on the home page. If you have no assessment result, you go to the assessment first; if already assessed, you go straight to the single-player setup lobby.',
      },
      {
        title: 'Choose AI Difficulty',
        body: 'Easy is more random, Medium makes basic declaration judgements, and Hard guesses your cards more aggressively.',
      },
      {
        title: 'Choose the Number of Rounds',
        body: '5 / 10 / 15 / Unlimited all work. Unlimited keeps going until someone Wins or the game ends naturally.',
      },
      {
        title: 'Confirm the Opponents',
        body: 'Single player is always you + 3 AI opponents. The AI draws, discards, Pongs, and Wins by its own strategy.',
      },
      {
        title: 'Start the Game',
        body: 'Once at the table the flow matches online play: draw, view, declare, discard, and respond to others’ discards.',
      },
    ] as ReadonlyArray<{ title: string; body: string; note?: string }>,

    // ── STEPS ──
    steps: [
      {
        title: 'Your Goal',
        body: 'Complete a "Declared" set for all 5 personality dimensions (Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism); the first player to do so wins. How many cards each dimension needs comes from your own assessment score — so every player has a different path to a win.',
      },
      {
        title: 'The Table',
        body: 'Single player is always 4 players (you + 3 AI); online is 1 to 3 players. The draw pile scales with the player count. Cards come in two kinds: color-tagged "personality description cards" (belonging to one dimension), and the dimensionless "Knowledge cards" (neutral — discardable, and useful for reading opponents’ styles).',
        hint: 'Starting hand size = the sum of all 5 dimension targets − 1. The missing card must be completed via "Pong" or "Win".',
      },
      {
        title: 'Draw',
        body: 'On your turn, first tap the draw pile to draw 1 card. If you wish, you can activate the "view 2 cards" privilege once — at most once per turn — to reveal the true personality of any 2 unknown cards in your hand. It resets at the start of your next turn.',
      },
      {
        title: 'Discard',
        body: 'After drawing, pick 1 card you do not need and discard it to the pile in the middle. The discarded card opens a "psychological read window" where the other 3 players have a few seconds to decide whether to "Pong" (same-dimension declaration) or "Win" (instant victory).',
      },
      {
        title: 'Pong (Declare)',
        body: 'Collect enough same-dimension cards to reach the target count and declare. Two ways to trigger:\n• Self-draw Pong (during your own turn, at most once per turn) → with a drawn card and the cards in your hand, your cards are exactly that target count for a dimension;\n• Claim Pong (first click wins, within the discard/claim window) → with a discarded card and the cards in your hand, your cards are exactly the target count for a dimension;\nWrong dimension, mixing in other traits, or wrong count → counts as a "failed Pong" and you are frozen (see "Frozen" below).',
        hint: 'The system will not tell you "you have enough for this dimension"; all 5 unsealed dimensions are offered, so you must judge for yourself.',
      },
      {
        title: 'Win (Declare Victory)',
        body: 'When all of your cards exactly completes target counts for all 5 dimensions, press "Win".\nWhen to trigger:\n• During your own turn (self-draw Win);\n• When anyone discards and the read window opens (claim Win).\nIf the judgement fails → the Win fails, your whole hand is revealed and you are frozen.',
      },
      {
        title: 'Frozen (the Penalty for Failure)',
        body: 'A "failed Pong / failed self-draw Pong / failed Win" all carry the same penalty: you are frozen for one turn — on your next turn it is auto-skipped (no draw, no discard) and then immediately cleared.\nWhile frozen:\n• The cards you wrongly bet (Pong / self-draw Pong) or your whole hand (Win) are revealed immediately;\n• You cannot take part when anyone discards and the read window opens (no Pong, no Win).\nAll players see a "⛔ Frozen" badge under your avatar.',
        hint: 'One misjudgement ≈ losing your next discard turn, so think carefully before acting. You also cannot declare a Win while frozen.',
      },
      {
        title: 'View 2 Cards (once per turn)',
        body: 'Hand cards hide their dimension by default — you rely on memory and reasoning. But after drawing at the start of your turn, you can activate "🔍 view 2 cards" once to reveal the true dimensions of 2 hand cards. It applies this turn only and resets automatically next turn.\nGood players prioritize their least-certain cards to avoid mixing errors when they declare.',
      },
      {
        title: 'Knowledge Cards',
        body: 'The draw pile contains a class of dimensionless "Knowledge cards" — their content is psychology course concepts (term + definition). They cannot be used to declare, but they also never "out" you as the wrong dimension.\nUses:\n• Discard them when drawn to free up hand space;\n• They are also a playful way to read opponents’ psychological styles (how an opponent picks these neutral cards can reveal preferences).',
      },
      {
        title: 'Online · Leaving & Rotation',
        body: 'An online room holds 2–4 players; anyone can tap "Leave" to exit the table — no takeover, the remaining players keep playing until a winner is decided.\n• The leaver’s seat is permanently skipped (you see a "🚪 Left the game" badge);\n• When only 1 player remains, that player is automatically declared the winner;\n• If your turn goes more than 30 seconds without action, a "Heads up: it’s your turn" reminder pops, repeating every 30 seconds until you discard.',
        hint: 'The same student ID entering two active rooms at once is rejected — preventing two clients from sharing one seat.',
      },
      {
        title: 'Winning & Scoring',
        body: 'The first player to declare all 5 dimensions wins outright. If the agreed rounds run out with no Win, ranking decides it: compare declared dimension counts first (more wins), then on a tie compare remaining hand cards (fewer wins).',
      },
    ] as ReadonlyArray<{ title: string; body: string; hint?: string }>,

    // ── Sandbox: bottom guidance bar label ──
    guideLabel: 'Guide',

    // ── Sandbox: header ──
    sandboxLabel: 'Interactive Sandbox',
    sandboxReset: 'Reset',
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
    btnContinueJudge: 'Continue',
    btnSelfPong: 'Self-draw Pong',
    btnCancel: 'Cancel',
    btnSelfArchive: 'Declare',
    btnContinue: 'Continue →',
    btnPong: 'Pong',
    btnContinueHu: 'See the Win',
    btnSimDiscard: 'Simulate a discard',
    btnPlayAgain: 'Play again',

    // ── Sandbox: self-draw Pong dimension pick ──
    pongStep1: '🎯 Step 1 · Choose the dimension to declare',

    // ── Sandbox: self-draw Pong card pick ──
    pongStep2: (name: string, cnt: number, sel: number) =>
      `🎯 Step 2 · Self-draw Pong · ${name} · Select exactly ${cnt} (${sel}/${cnt} selected)`,

    // ── Sandbox: frozen demo box ──
    penaltyDemo: 'Frozen-for-one-turn demo: you cannot join others’ read windows this round, and your next turn is auto-skipped.',

    // ── Sandbox: claim window card ──
    claimWho: 'Xiao Ming discarded a clue card',
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
    captionViewing: 'Each turn you may view the true dimensions of 2 hand cards. After tapping "View 2", continue on to the declaration judgement.',
    captionAfterDraw: 'You now have enough clues to complete a set. Next, tap the highlighted "Self-draw Pong" to try it.',
    captionPongDimension: (name: string) =>
      `Self-draw Pong needs you to fix a dimension first. From the five dimensions below, choose the highlighted "${name}" (your hand has exactly 4).`,
    captionPongPickingDone: (name: string, cnt: number) => `${cnt} "${name}" cards selected. Tap the highlighted "Declare" to declare.`,
    captionPongPicking: (name: string, cnt: number, sel: number) =>
      `Select exactly ${cnt} "${name}" cards from your hand (the highlighted ones; ${sel}/${cnt} selected).`,
    captionPongFailed: 'A failure reveals the cards you wrongly bet and freezes you for one turn (your next turn is auto-skipped). Tap "Continue" to return to card-picking.',
    captionPongSuccess: 'Declared! Now you must discard 1 card to end the turn. Tap any of the highlighted hand cards below to discard it.',
    captionClaimWindow: (name: string, sel: number) =>
      `The read window after someone discards: pick 2 highlighted "${name}" cards from your hand, plus that discard to form a set, then tap "Pong" (${sel}/2 selected).`,
    captionClaimWindowFallback: 'This is the read window after someone discards. You can Claim Pong, or Win if you have already met every target.',
    captionClaimSuccess: 'A Claim Pong also forms a declaration. This record appears under the player’s avatar and in the archive log.',
    captionHuDemo: 'Win is the victory button, used only when all targets are complete. Failure is costly, so do not use it for trial and error.',
    captionDiscardPicking: 'Tap the card to discard.',
    captionDone: 'Your turn is over. Next, simulate the "Pong / Win" window after someone else discards.',

    // ── Sandbox: feedback (in reducer) ──
    fbDraw: 'Drew a clue card. There are many options now — first let’s demo "view 2 cards".',
    fbViewTwo: 'This turn you viewed 2 cards: one Conscientiousness, one Neuroticism. In a real game only the 2 you pick are revealed.',
    fbFinishView: 'Now you know the just-drawn card can complete a set. Next, a demo of Self-draw Pong.',
    fbOpenPong: 'Self-draw Pong needs you to fix a dimension first. Hint: your hand has 4 "Neuroticism" cards — choose it.',
    fbChooseDim: (name: string, cnt: number) => `Chose "${name}". Now select exactly ${cnt} "${name}" cards from your hand.`,
    fbPongSuccess: 'Declared. The 4 cards enter the open declaration area; after declaring you must immediately discard 1 card.',
    fbPongFailWrongCount: (selected: number, cnt: number) => `You selected ${selected}, but it must be exactly ${cnt}`,
    fbPongFailWrongDim: (name: string) => `Your selection includes non-"${name}" cards (Knowledge cards count as no dimension)`,
    fbPongFail: (reason: string) =>
      `Self-draw Pong failed: ${reason}. In a real game you would be frozen for one turn (your next turn auto-skipped) and the cards you wrongly bet would be revealed.`,
    fbContinueAfterFail: (name: string, cnt: number) => `This time try selecting only the ${cnt} "${name}" cards (the highlighted ones).`,
    fbPickDiscard: 'Discard done. Now switching to how you respond with "Pong / Win" when someone else discards.',
    fbOpenClaim: (name: string) => `An opponent discarded a "${name}" clue card. Pick 2 "${name}" cards from your hand, plus this discard to complete a set.`,
    fbClaimFail: (name: string, picked: number) =>
      `Claim Pong needs exactly 2 "${name}" cards in hand (selected ${picked}). In a real game a wrong pick fails and freezes you for one turn.`,
    fbClaimSuccess: 'Claim Pong succeeded. You completed a declaration using 2 same-type cards from your hand + the opponent’s discard.',
    fbShowHu: 'Win declares victory: press it when all 5 dimensions are complete. Pressing it by mistake reveals your whole hand and freezes you.',

    // ── Sandbox: fallback dimension name for fail reasons ──
    fallbackDimName: 'that dimension',

    // ── FlowScreenshot (static mockups) ──
    shotPvpTitle: 'Online Flow Mockup',
    shotSoloTitle: 'Single-Player Flow Mockup',
    shotStaticBadge: 'Static mockup',
    shotProductName: 'Personalities Mahjong',
    shotPvp: 'Online Match',
    shotSolo: 'Single Player',
    shotPlayerInfo: 'Player Info',
    shotStudentId: 'Student ID',
    shotEnterStudentId: 'Enter your student ID',
    shotConfirmStudentId: 'Confirm Student ID',
    shotReenterStudentId: 'Re-enter your student ID',
    shotAssessedTrue: 'Assessment completed',
    shotAssessedTrueBody: 'Generate this game’s target counts directly.',
    shotAssessedFalse: 'Assessment not completed',
    shotAssessedFalseBody: 'Take the test first, then return to the lobby.',
    shotCreateRoom: 'Create Room',
    shotRoomCode: (code: string) => `Room code ${code}`,
    shotJoinRoom: 'Join Room',
    shotEnter4Code: 'Enter the 4-digit room code',
    shotHost: 'Host',
    shotReady: 'Ready',
    shotStartGame: 'Start Game',
    shotStartMatch: 'Start Match',
    shotYou: 'You',
    shotDifficulties: ['Easy', 'Medium', 'Hard'] as readonly string[],
    shotRounds: ['5 rds', '10 rds', '15 rds', 'Unlimited'] as readonly string[],
    shotAiOpponents: ['Xiao Ming', 'Prof. Lin', 'Old Chen'] as readonly string[],
    shotAiOpponentLabel: 'AI opponent',
  },
} as const;
