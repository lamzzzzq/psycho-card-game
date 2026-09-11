// 局末概念小測的「維度題」題庫（2026-09-09 上線；2026-09-10 繁中改為老闆定稿版）。
// 來源：老闆給的 `docs/Knowledge questions_20260910.xlsx`，六個 sheet：
//   英文 = Big five / HEXACO / SD4，繁中 = Big five_C / HEXACO_C / SD4_C，各 4 題、題序一一對應。
// 用途：小測 4 題中，前 3 題仍由知識卡隨機組成，第 4 題固定從本檔對應模型的 4 題裏隨機抽 1 題。
//
// ⚠️ 照抄規則（改動前先看；`src/lib/__tests__/quiz-dimension-xlsx.test.ts` 會直接讀 xlsx 逐字核對）：
//   1. 中英文題幹/描述/選項【逐字照 xlsx】。xlsx 的 Question 格 = 提問句 + 空行 + 描述，
//      拆成 lead（提問句）與 body（描述）兩欄。
//   2. 只做三種機械處理：去掉選項的 "A. / B. / C. / D." 序號前綴（UI 是網格按鈕，不按字母排）；
//      去掉描述首尾的引號（“ ” " 「 」）；英文描述內的換行併成一個空格。
//      ‼️ SD4_C 第 2 題 xlsx 原稿描述前後多一對「」（其餘 11 題都沒有），按規則 2 去掉。
//   3. 選項【保持 xlsx 原順序不打亂】——老闆已刻意把正解位置打散（B/C/B/A、C/B/D/A、B/A/A/C）。
//
// xlsx 英文 sheet 另有 Source Text / Reference / Remarks(MY) 三欄（出處與改寫說明），本檔只留 reference 備查，UI 不顯示。

export type QuizModel = 'big-five' | 'hexaco' | 'sd4';

export interface DimensionQuizQuestion {
  /** 題幹提問句（顯示在小字提示位，取代「這是哪個概念的描述？」）。 */
  lead: string;
  leadZh: string;
  /** 被描述的定義引文（顯示在正文位）。 */
  body: string;
  bodyZh: string;
  /** 四個選項，順序照 xlsx。 */
  options: string[];
  optionsZh: string[];
  /** 正解在 options 中的索引。 */
  answerIndex: number;
  /** xlsx H 欄出處，僅備查。 */
  reference: string;
}

const BIG_FIVE_LEAD = 'Which Big Five trait is described below?';
// 2026-09-11 老闆更正：「大五」→「五大」（xlsx 未重發，測試檔 ZH_LEAD_CORRECTIONS 有對應記錄）。
const BIG_FIVE_LEAD_ZH = '以下描述的是哪一項五大人格特質？';
const HEXACO_LEAD = 'Which HEXACO dimension is described below?';
const HEXACO_LEAD_ZH = '以下描述的是哪一項 HEXACO 人格向度？';
const SD4_LEAD = 'Which SD4 subscale is described below?';
const SD4_LEAD_ZH = '以下描述的是哪一項短版黑暗四人格分量表？';

export const DIMENSION_QUIZ_QUESTIONS: Record<QuizModel, DimensionQuizQuestion[]> = {
  'big-five': [
    {
      lead: BIG_FIVE_LEAD,
      leadZh: BIG_FIVE_LEAD_ZH,
      body: 'The trait describes organisation, self-discipline, responsibility, carefulness, and persistence.',
      bodyZh: '此人格特質描述一個人的組織能力、自律、責任感、細心程度和堅持性。',
      options: ['Openness to Experience', 'Conscientiousness', 'Agreeableness', 'Neuroticism'],
      optionsZh: ['開放性', '盡責性', '宜人性', '神經質'],
      answerIndex: 1,
      reference: 'Ehrhart et al., (2008)',
    },
    {
      lead: BIG_FIVE_LEAD,
      leadZh: BIG_FIVE_LEAD_ZH,
      body: 'The trait describes how strongly and frequently a person tends to experience worry, stress, sadness, and other negative emotions, as well as emotional instability.',
      bodyZh: '此人格特質描述一個人經歷憂慮、壓力、悲傷和其他負面情緒的強度和頻率，以及情緒不穩定的程度。',
      options: ['Extraversion', 'Agreeableness', 'Neuroticism', 'Openness to Experience'],
      optionsZh: ['外向性', '宜人性', '神經質', '開放性'],
      answerIndex: 2,
      reference: 'Ehrhart et al., (2008)',
    },
    {
      lead: BIG_FIVE_LEAD,
      leadZh: BIG_FIVE_LEAD_ZH,
      body: 'The trait describes sociability, energy, assertiveness, and enjoyment of social interaction.',
      bodyZh: '此人格特質描述一個人的社交性、活力、自信表達，以及對社交互動的喜愛程度。',
      options: ['Openness to Experience', 'Extraversion', 'Agreeableness', 'Conscientiousness'],
      optionsZh: ['開放性', '外向性', '宜人性', '盡責性'],
      answerIndex: 1,
      reference: 'Ehrhart et al., (2008)',
    },
    {
      lead: BIG_FIVE_LEAD,
      leadZh: BIG_FIVE_LEAD_ZH,
      body: 'The trait describes compassion, cooperation, trust, and concern for others.',
      bodyZh: '此人格特質描述一個人的同情心、合作性、信任，以及對他人的關心程度。',
      options: ['Agreeableness', 'Openness to Experience', 'Conscientiousness', 'Neuroticism'],
      optionsZh: ['宜人性', '開放性', '盡責性', '神經質'],
      answerIndex: 0,
      reference: 'Ehrhart et al., (2008)',
    },
  ],
  hexaco: [
    {
      lead: HEXACO_LEAD,
      leadZh: HEXACO_LEAD_ZH,
      body: 'The dimension describes sincerity, fairness, modesty, and unwillingness to exploit others for personal gain.',
      bodyZh: '此人格向度描述一個人的真誠、公平、謙遜，以及不願為了個人利益而利用他人的傾向。',
      options: ['Emotionality', 'Agreeableness', 'Honesty–Humility', 'Conscientiousness'],
      optionsZh: ['情緒性', '宜人性', '誠實－謙遜', '盡責性'],
      answerIndex: 2,
      reference: 'Ashton, M. C., & Lee, K. (2007).',
    },
    {
      lead: HEXACO_LEAD,
      leadZh: HEXACO_LEAD_ZH,
      body: 'The dimension describes fearfulness, anxiety, emotional attachment, sentimentality, and need for support.',
      bodyZh: '此人格向度描述一個人的恐懼、焦慮、情感依附、感性程度，以及對支持的需要。',
      options: ['Extraversion', 'Emotionality', 'Openness to Experience', 'Agreeableness'],
      optionsZh: ['外向性', '情緒性', '開放性', '宜人性'],
      answerIndex: 1,
      reference: 'Ashton, M. C., & Lee, K. (2009).',
    },
    {
      lead: HEXACO_LEAD,
      leadZh: HEXACO_LEAD_ZH,
      body: 'The dimension describes patience, forgiveness, gentleness, and willingness to compromise with others, especially during conflict.',
      bodyZh: '此人格向度描述一個人的耐性、寬恕、溫和，以及願意與他人妥協的程度，尤其是在面對衝突時。',
      options: ['Honesty–Humility', 'Conscientiousness', 'Emotionality', 'Agreeableness'],
      optionsZh: ['誠實－謙遜', '盡責性', '情緒性', '宜人性'],
      answerIndex: 3,
      reference: 'Ashton, M. C., & Lee, K. (2009).',
    },
    {
      lead: HEXACO_LEAD,
      leadZh: HEXACO_LEAD_ZH,
      body: 'The dimension describes curiosity, creativity, appreciation of art and beauty, and interest in new or unconventional ideas.',
      bodyZh: '此人格向度描述一個人的好奇心、創造力、對藝術和美感的欣賞，以及對新穎或非傳統觀念的興趣。',
      options: ['Openness to Experience', 'Extraversion', 'Conscientiousness', 'Emotionality'],
      optionsZh: ['開放性', '外向性', '盡責性', '情緒性'],
      answerIndex: 0,
      reference: 'Ashton, M. C., & Lee, K. (2009).',
    },
  ],
  sd4: [
    {
      lead: SD4_LEAD,
      leadZh: SD4_LEAD_ZH,
      body: "The subscale describes impulsivity, boldness, risk-taking, and a reduced concern for rules or the consequences of one's behaviour.",
      bodyZh: '此分量表描述一個人的衝動性、無畏、冒險，以及較少顧及規則或自身行為後果的傾向。',
      options: ['Narcissism', 'Psychopathy', 'Machiavellianism', 'Sadism'],
      optionsZh: ['自戀', '病態人格', '馬基維利主義', '虐待'],
      answerIndex: 1,
      reference: 'Akat, M. (2025).',
    },
    {
      lead: SD4_LEAD,
      leadZh: SD4_LEAD_ZH,
      body: 'The subscale describes strategic thinking, manipulation, and a willingness to influence or exploit others to achieve personal goals.',
      bodyZh: '此分量表描述一個人的策略性思考、操控，以及為了達成個人目標而影響或利用他人的意願。',
      options: ['Machiavellianism', 'Psychopathy', 'Narcissism', 'Sadism'],
      optionsZh: ['馬基維利主義', '病態人格', '自戀', '虐待'],
      answerIndex: 0,
      reference: 'Akat, M. (2025).',
    },
    {
      lead: SD4_LEAD,
      leadZh: SD4_LEAD_ZH,
      body: "The subscale describes self-importance, superiority, admiration seeking, and a belief in one's own uniqueness.",
      bodyZh: '此分量表描述一個人的自我重要感、優越感、尋求讚賞，以及相信自己具有獨特性的傾向。',
      options: ['Narcissism', 'Machiavellianism', 'Psychopathy', 'Sadism'],
      optionsZh: ['自戀', '馬基維利主義', '病態人格', '虐待'],
      answerIndex: 0,
      reference: 'Akat, M. (2025).',
    },
    {
      lead: SD4_LEAD,
      leadZh: SD4_LEAD_ZH,
      body: 'The subscale describes enjoyment of cruelty, aggression, and pleasure derived from seeing others experience discomfort or suffering.',
      bodyZh: '此分量表描述一個人對殘酷行為、攻擊行為的享受，以及看到他人經歷不適或痛苦時所產生的愉悅。',
      options: ['Machiavellianism', 'Psychopathy', 'Sadism', 'Narcissism'],
      optionsZh: ['馬基維利主義', '病態人格', '虐待', '自戀'],
      answerIndex: 2,
      reference: 'Akat, M. (2025).',
    },
  ],
};
