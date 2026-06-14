'use client';

// 轻量 i18n：locale 存持久化 store；两个可分享链接 /?lang=en 与 /?lang=zh
// 进页面时由 LocaleSync 读取 query 设置语言。房间是后端实体（房间码 + Supabase），
// 与语言无关 → 英文链接和中文链接连同一个房间码即同桌。
// 当前先翻主页（入口）；深层页文案后续逐步补，locale 会一路带着。
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Locale = 'zh' | 'en';

export const LOCALES: Locale[] = ['zh', 'en'];
export function isLocale(v: unknown): v is Locale {
  return v === 'zh' || v === 'en';
}

interface LocaleState {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: 'zh',
      setLocale: (locale) => set({ locale }),
    }),
    { name: 'psycho-card-locale' }
  )
);

// ── 文案词典（按页面/区块分组，便于增量翻译）────────────────────────────────
export const STRINGS = {
  zh: {
    common: { tutorial: '玩法教學' },
    home: {
      eyebrow: 'Personalities Mahjong',
      title: '人格麻將',
      intro: '把人格測評、心理線索判斷與卡牌對戰編織在一起。先讀懂自己，再在牌桌上讀懂別人。',
      features: [
        { glyph: '✦', title: '自我評估', note: '先完成測評，得到你自己的五維傾向' },
        { glyph: '◈', title: '抽牌歸檔', note: '湊齊同一人格維度的手牌，公開歸檔' },
        { glyph: '☽', title: '識人破局', note: '對手的每張棄牌，都暴露了他的人格' },
        { glyph: '◐', title: '單機 / 聯機雙模式', note: '一人對 AI 練手，也能與真人同桌博弈' },
      ],
      cardEyebrow: '人格牌陣',
      cardArcana: 'ARCANA OF SELF',
      cardTitle: '人格鏡像',
      cardBody: '你的五維得分會轉化成不同維度的收集目標。每一張牌，既是自我描述，也是對手留下的線索。',
      pvp: '聯機對戰',
      single: '單機對戰',
      needAssess: '需先測評',
      startAssess: '開始測評',
      continueAssess: '繼續測評',
      reassess: '重新測評',
      report: '查看人格報告',
    },
    assessment: {
      eyebrow: 'Persona Reading',
      title: '抽取你的人格原型',
      intro: '每一道陳述題都像翻開一張隱喻牌面。你給出的傾向，會在結尾匯聚成五維人格圖譜，並影響後續牌局目標。',
      gateTitle: '輸入學號',
      gateHint: '學號用於記錄你的測評結果，方便課堂統計。請使用同一台設備、同一個瀏覽器，不要清除緩存。',
      gatePlaceholder: '例如 20231234',
      gateStart: '開始測評',
      backHome: '回到主頁',
      loading: '加載中…',
      skipToManual: '跳過測評，手動輸入分數',
      backToAssess: '返回測評',
      manualTitle: '手動錄入人格刻度',
      manualConfirm: '確認分數，進入遊戲',
      prev: '上一題',
      next: '下一題',
      navTitle: '題目導航',
      answeredSuffix: '已作答',
      legendAnswered: '已答',
      legendUnanswered: '未答',
      legendCurrent: '當前',
      arcanaPrompt: 'Arcana Prompt',
      likert: ['非常不貼切', '有些不貼切', '普通', '有些貼切', '非常貼切'],
      progressPrefix: '當前正在抽取 ',
      progressSuffix: ' 維度的人格線索。',
    },
  },
  en: {
    common: { tutorial: 'How to Play' },
    home: {
      eyebrow: 'Personalities Mahjong',
      title: 'Personalities Mahjong',
      intro: 'Personality assessment, psychological deduction, and card battles woven together. Read yourself first, then read others at the table.',
      features: [
        { glyph: '✦', title: 'Self-Assessment', note: 'Take the test first to reveal your five-factor tendencies' },
        { glyph: '◈', title: 'Draw & Archive', note: 'Collect cards of one personality dimension and archive them openly' },
        { glyph: '☽', title: 'Read the Player', note: 'Every card an opponent discards exposes their personality' },
        { glyph: '◐', title: 'Solo / Online Modes', note: 'Practice against AI, or duel real players at the same table' },
      ],
      cardEyebrow: 'PERSONA SPREAD',
      cardArcana: 'ARCANA OF SELF',
      cardTitle: 'Mirror of Self',
      cardBody: 'Your five-factor scores become collection goals across dimensions. Every card is both a self-description and a clue you leave behind.',
      pvp: 'Play Online',
      single: 'Play Solo',
      needAssess: 'assess first',
      startAssess: 'Start Assessment',
      continueAssess: 'Continue',
      reassess: 'Retake Assessment',
      report: 'View Personality Report',
    },
    assessment: {
      eyebrow: 'Persona Reading',
      title: 'Draw Your Persona Archetype',
      intro: 'Each statement is like turning over a metaphorical card. Your tendencies converge into a five-factor portrait that shapes your goals at the table.',
      gateTitle: 'Enter Student ID',
      gateHint: 'Your student ID records your assessment result for class statistics. Use the same device and browser, and do not clear your cache.',
      gatePlaceholder: 'e.g. 20231234',
      gateStart: 'Start Assessment',
      backHome: 'Back to Home',
      loading: 'Loading…',
      skipToManual: 'Skip the test, enter scores manually',
      backToAssess: 'Back to test',
      manualTitle: 'Manually Enter Personality Scores',
      manualConfirm: 'Confirm Scores, Enter Game',
      prev: 'Previous',
      next: 'Next',
      navTitle: 'Question Map',
      answeredSuffix: 'answered',
      legendAnswered: 'Answered',
      legendUnanswered: 'Unanswered',
      legendCurrent: 'Current',
      arcanaPrompt: 'Arcana Prompt',
      likert: ['Very Inaccurate', 'Mod. Inaccurate', 'Neither', 'Mod. Accurate', 'Very Accurate'],
      progressPrefix: 'Currently drawing clues for the ',
      progressSuffix: ' dimension.',
    },
  },
} as const;

export type Strings = (typeof STRINGS)['zh'];
