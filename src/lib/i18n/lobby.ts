// 大廳（單機對戰設置）文案。zh/en 同結構，難度/輪數選項保持數組（label + desc）。
// 含動態數字的用箭頭函數（zh/en 同簽名）。
export const LOBBY_T = {
  zh: {
    needAssess: {
      title: '請先完成人格測評',
      body: '完整人格刻度會決定你在牌局中的歸檔目標。',
      startAssess: '開始測評',
      backHome: '← 返回首頁',
    },
    backHome: '← 返回主頁',
    title: '對戰大廳',
    subtitle: '設置遊戲參數，準備進入人格博弈。',
    difficultyLabel: 'AI 難度',
    difficultyOptions: [
      { label: '簡單', desc: '憑直覺出牌' },
      { label: '中等', desc: '會記牌分析' },
      { label: '困難', desc: '推測你的心理' },
    ],
    roundsLabel: '遊戲輪數',
    roundOptions: [
      { label: (n: number) => `${n} 輪`, desc: '快速' },
      { label: (n: number) => `${n} 輪`, desc: '標準' },
      { label: (n: number) => `${n} 輪`, desc: '持久' },
      { label: () => '∞ 無限', desc: '直到有人胡' },
    ],
    revealLabel: '看牌難度',
    revealOptions: [
      { label: '明牌', desc: '全場人格公開（預設）' },
      { label: '半公開', desc: '每回合查看 4 張並保留' },
      { label: '隱藏', desc: '每回合查看 2 張但不保留' },
    ],
    opponentsLabel: '對手檔案',
    start: '開始對戰',
  },
  en: {
    needAssess: {
      title: 'Complete the assessment first',
      body: 'Your full personality profile sets the Declared goals you chase in a match.',
      startAssess: 'Start assessment',
      backHome: '← Back home',
    },
    backHome: '← Back home',
    title: 'Battle Lobby',
    subtitle: 'Set the match parameters and step into the mind game.',
    difficultyLabel: 'AI difficulty',
    difficultyOptions: [
      { label: 'Easy', desc: 'plays on instinct' },
      { label: 'Medium', desc: 'tracks & analyzes cards' },
      { label: 'Hard', desc: 'reads your mind' },
    ],
    roundsLabel: 'Rounds',
    roundOptions: [
      { label: (n: number) => `${n} rounds`, desc: 'Quick' },
      { label: (n: number) => `${n} rounds`, desc: 'Standard' },
      { label: (n: number) => `${n} rounds`, desc: 'Long' },
      { label: () => '∞ Unlimited', desc: 'until someone wins' },
    ],
    revealLabel: 'Reveal difficulty',
    revealOptions: [
      { label: 'Open', desc: 'All tags public (default)' },
      { label: 'Half', desc: 'View 4 cards each turn, kept revealed' },
      { label: 'Hidden', desc: 'View 2 cards each turn, not kept' },
    ],
    opponentsLabel: 'opponents',
    start: 'Start Match',
  },
} as const;
