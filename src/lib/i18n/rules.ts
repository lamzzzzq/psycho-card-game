// 規則頁（A4 列印版）雙語文案。zh = 繁體中文，en = 英文。
// 含動態變量的句子用箭頭函數（zh/en 同簽名）。
// 純資料模組，無 React 依賴。

export const RULES_T = {
  zh: {
    // 工具列
    backToTutorial: '← 返回教學',
    printOrPdf: '🖨 列印 / 存 PDF',

    // 抬頭
    title: '人格麻將 · 遊戲規則',
    subtitle: '用卡牌拼出你的人格 — Big Five 五大人格 × 麻將玩法',
    scanToEnter: '掃碼進入遊戲',

    // 維度名
    dimO: '開放性',
    dimC: '盡責性',
    dimE: '外向性',
    dimA: '宜人性',
    dimN: '神經質',

    // 一、遊戲目標
    sec1Title: '一、遊戲目標',
    goalIntroBefore: '每位玩家先完成 ',
    goalAssessment: 'Big Five 人格測評',
    goalIntroAfter: '，得到五個維度的分數：',
    goalDims: '開放性 O、盡責性 C、外向性 E、宜人性 A、神經質 N。',
    goalCollectBefore: '遊戲目標是',
    goalCollectAll: '集齊全部五個維度',
    goalCollectMid: '。每個維度需要的牌數 = 你在該維度的分數',
    goalExample: (d: string, n: number) => `（例如${d} ${n} 分，就要湊 ${n} 張${d}牌）`,
    goalWinBefore: '。最先湊齊全部五維者「',
    goalWinHu: '食胡',
    goalWinAfter: '」獲勝。',

    // 圖例文案
    figGoalCap: '圈內數字＝該維度要湊幾張（由你的測評分數決定，每維不同）',
    figPongCap: '湊滿「該維度目標張數」即可鎖定（張數要與目標一致）',
    figHand: '你的手牌',
    figIncoming: '抽到／別人棄的',
    figLocked: '鎖定一組',

    // 二、開局
    sec2Title: '二、開局',
    openItems: [
      '每人依自己的人格分數發一手牌（分數越高，起手牌越多）。',
      '桌面中央為抽牌堆；打出的牌進入棄牌堆（抽牌堆摸完會把棄牌堆洗回，牌不會用盡）。',
      '牌庫含少量「知識牌」，見第六節。',
    ],

    // 三、每回合流程
    sec3Title: '三、每回合流程',
    flowDraw: '① 從抽牌堆摸 1 張',
    flowDiscard: '② 從手牌打出 1 張',
    flowNext: '輪到下一位（順時針）',

    // 四、碰
    sec4Title: '四、碰（搶牌）',
    pongIntro: '當有人打出一張人格牌，若你手上有同維度的牌、加上這張剛好湊滿該維度所需張數，可宣告「碰」：',
    pongItems: [
      '把這組牌歸檔，並立刻搶到出牌權（不用摸牌，直接打一張）。',
      '自己回合也能用手牌湊齊宣告（自摸碰），每回合限一次。',
    ],
    pongWarn: '⚠ 張數必須剛好、且全為同維度。張數錯／維度錯／碰已歸檔的維度 → 失敗受罰。',

    // 五、食胡與失敗懲罰
    sec5Title: '五、食胡與失敗懲罰',
    huLineBeforeHu: '食胡：',
    huLineRest: '當手牌能一次湊齊所有尚未歸檔的維度 → 宣告胡牌，立即獲勝。',
    penaltyIntroBold: '失敗懲罰（罰停）：',
    penaltyIntroRest: '碰或胡宣告失敗時——',
    penaltyItems: [
      { b: '罰停：', rest: '下次輪到你時罰停一回合（自動跳過、不抽不出），期間不能碰／胡／搶牌。' },
      { b: '亮牌：', rest: '碰失敗只亮出你押錯的牌；胡失敗亮出整手牌。' },
    ],
    penaltyWarn: '→ 想清楚再宣告，賭錯代價很大。',

    // 六、知識牌
    sec6Title: '六、知識牌',
    knowledgeBody:
      '牌庫中有少量知識牌（上面是心理學小知識）。它不屬於任何維度、不能用來湊牌。打出知識牌不會觸發別人搶牌（安全棄牌）。數量很少，偶爾摸到、打掉即可。',

    // 七、勝負與計分
    sec7Title: '七、勝負與計分',
    scoreItems: [
      '有人食胡 → 該玩家直接獲勝。',
      '打滿約定輪數仍無人胡 → 按已歸檔維度數排名，多者勝；同數則比剩餘手牌少者勝。',
    ],

    // 頁尾
    footer: '掃描頁首 QR code 即可開始 · ',
  },

  en: {
    // toolbar
    backToTutorial: '← Back to Tutorial',
    printOrPdf: '🖨 Print / Save PDF',

    // header
    title: 'Personalities Mahjong · Game Rules',
    subtitle: 'Build your personality with cards — Big Five traits × Mahjong play',
    scanToEnter: 'Scan to enter',

    // dimensions
    dimO: 'Openness',
    dimC: 'Conscientiousness',
    dimE: 'Extraversion',
    dimA: 'Agreeableness',
    dimN: 'Neuroticism',

    // 1. Goal
    sec1Title: '1. Goal',
    goalIntroBefore: 'Each player first completes the ',
    goalAssessment: 'Big Five assessment',
    goalIntroAfter: ' and gets a score for five dimensions: ',
    goalDims: 'Openness O, Conscientiousness C, Extraversion E, Agreeableness A, Neuroticism N.',
    goalCollectBefore: 'The goal is to ',
    goalCollectAll: 'collect all five dimensions',
    goalCollectMid: '. The number of cards each dimension needs = your score in that dimension',
    goalExample: (d: string, n: number) =>
      ` (e.g. ${n} in ${d} means you need ${n} ${d} cards)`,
    goalWinBefore: '. The first to complete all five dimensions "',
    goalWinHu: 'Wins (Hu)',
    goalWinAfter: '".',

    // Figure captions
    figGoalCap: 'The number in each chip = how many cards that dimension needs (from your score, different per dimension)',
    figPongCap: 'Reach that dimension’s target count to lock it in (the count must match the target)',
    figHand: 'Your hand',
    figIncoming: 'Drawn / discarded',
    figLocked: 'Locked set',

    // 2. Opening
    sec2Title: '2. Opening',
    openItems: [
      'Each player is dealt a hand based on their personality scores (higher score = bigger starting hand).',
      'The draw pile sits in the center; discarded cards go to the discard pile (when the draw pile runs out, the discard pile is reshuffled back in, so cards never run out).',
      'The deck contains a few "Knowledge cards" — see section 6.',
    ],

    // 3. Turn flow
    sec3Title: '3. Turn Flow',
    flowDraw: '① Draw 1 from the draw pile',
    flowDiscard: '② Discard 1 from your hand',
    flowNext: 'Next player (clockwise)',

    // 4. Pong
    sec4Title: '4. Pong (Claiming)',
    pongIntro:
      'When someone discards a personality card, if your hand has cards of the same dimension that — together with this card — exactly complete the count that dimension needs, you may declare "Pong":',
    pongItems: [
      'Declare that set, and immediately seize the turn (no draw — discard one right away).',
      'On your own turn you can also complete a set from your hand (Self-draw Pong), once per turn.',
    ],
    pongWarn:
      '⚠ The count must be exact and all of the same dimension. Wrong count / wrong dimension / Pong on an already-declared dimension → failed and penalized.',

    // 5. Winning & penalty
    sec5Title: '5. Winning & Failure Penalty',
    huLineBeforeHu: 'Win (Hu): ',
    huLineRest:
      'When your hand can complete all not-yet-declared dimensions at once → declare a win and win immediately.',
    penaltyIntroBold: 'Failure penalty (frozen): ',
    penaltyIntroRest: 'When a Pong or Win declaration fails——',
    penaltyItems: [
      {
        b: 'Frozen: ',
        rest: 'On your next turn you are frozen for one turn (auto-skipped, no draw or discard), and cannot Pong / Win / claim during it.',
      },
      {
        b: 'Reveal: ',
        rest: 'A failed Pong only reveals the cards you wrongly bet; a failed Win reveals your whole hand.',
      },
    ],
    penaltyWarn: '→ Think before you declare — a wrong bet costs a lot.',

    // 6. Knowledge cards
    sec6Title: '6. Knowledge Cards',
    knowledgeBody:
      'The deck has a few Knowledge cards (psychology trivia on them). They belong to no dimension and cannot be used to complete sets. Discarding a Knowledge card does not let others claim it (safe discard). They are rare — just discard them when you draw one.',

    // 7. Scoring
    sec7Title: '7. Result & Scoring',
    scoreItems: [
      'If someone Wins (Hu) → that player wins outright.',
      'If the agreed number of rounds is played and no one wins → rank by number of Declared dimensions, most wins; on a tie, fewer remaining hand cards wins.',
    ],

    // footer
    footer: 'Scan the QR code above to start · ',
  },
} as const;
