// 數據統計頁文案（繁中 / 英文）。跟隨用戶選擇的語言切換。
// 含 CSV 導出列標題、按鈕、表頭、空態、動態計數文案。
// 配合 src/lib/i18n.ts 的 useLocaleStore（SSR 首屏用 'zh'）。

export const STATS_T = {
  zh: {
    loading: '加載統計數據…',
    back: '← 返回主頁',
    title: '數據統計',
    subtitle: '參與者出勤與對戰記錄的歸檔卷宗。',
    participantsChip: (n: number) => `${n} 名參與者`,
    sessionsChip: (n: number) => `${n} 場對局`,
    exportCsv: (n: number) => `⬇ 導出 CSV（${n} 行）`,
    fetchError:
      '讀取數據失敗。請確認 Supabase 已執行 supabase/migrations/0001_game_records.sql 建好 3 張表。',
    tabSummary: '彙總統計',
    tabDetail: '對局明細',
    emptySummary: '暫無對局數據',
    emptyDetail: '暫無對局記錄',
    colStudentId: '學號',
    colGames: '場次',
    colWins: '勝場',
    colAvgDeclared: '均申報',
    colBestRank: '最佳名次',
    roundsSuffix: (n: number | string) => `${n} 輪`,
    interruptedTag: ' · 中斷局',
    roomPrefix: (code: string) => ` · 房間 ${code}`,
    // 明細卡片內每位玩家的小字：#名次 · 申報N組 · 剩M張
    playerDetail: (rank: number, declared: number, remaining: number) =>
      `#${rank} · 申報${declared}組 · 剩${remaining}張`,
    csvYes: '是',
    // CSV 列標題（跟隨語言）
    csvHeaders: [
      '學號', '房間', '結束時間', '模式', '輪數',
      '申報組數', '剩餘手牌', '最終得分', '名次', '是否獲勝', '是否中斷局',
      '胡成功', '胡失敗', '碰成功', '碰失敗',
    ],
  },
  en: {
    loading: 'Loading statistics…',
    back: '← Back to home',
    title: 'Statistics',
    subtitle: 'Archived records of participant attendance and matches.',
    participantsChip: (n: number) => `${n} participants`,
    sessionsChip: (n: number) => `${n} games`,
    exportCsv: (n: number) => `⬇ Export CSV (${n} rows)`,
    fetchError:
      'Failed to load data. Make sure Supabase has run supabase/migrations/0001_game_records.sql to create the 3 tables.',
    tabSummary: 'Summary stats',
    tabDetail: 'Match details',
    emptySummary: 'No match data yet',
    emptyDetail: 'No match records yet',
    colStudentId: 'Student ID',
    colGames: 'Games',
    colWins: 'Wins',
    colAvgDeclared: 'Avg declared',
    colBestRank: 'Best rank',
    roundsSuffix: (n: number | string) => `${n} rounds`,
    interruptedTag: ' · interrupted game',
    roomPrefix: (code: string) => ` · room ${code}`,
    playerDetail: (rank: number, declared: number, remaining: number) =>
      `#${rank} · ${declared} declared sets · ${remaining} cards left`,
    csvYes: 'Yes',
    csvHeaders: [
      'Student ID', 'Room', 'End time', 'Mode', 'Rounds',
      'Declared sets', 'Cards left', 'Final score', 'Rank', 'Won', 'Interrupted game',
      'Win success', 'Win fail', 'Pong success', 'Pong fail',
    ],
  },
} as const;
