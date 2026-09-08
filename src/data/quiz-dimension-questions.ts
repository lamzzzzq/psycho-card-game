// 局末概念小測的「維度題」題庫（2026-09-09）。
// 來源：老闆給的 `Knowledge questions_20260901.xlsx`，三個 sheet = Big five / HEXACO / SD4，各 4 題。
// 用途：小測 4 題中，前 3 題仍由知識卡隨機組成，第 4 題固定從本檔對應模型的 4 題裏隨機抽 1 題。
//
// ⚠️ 三條照抄規則（改動前先看）：
//   1. 英文題幹/描述/選項【逐字照 xlsx】，只去掉選項的 "A. / B. / C. / D." 序號前綴
//      （UI 是網格按鈕，不按字母排；序號留著會與實際位置對不上）。
//   2. 選項【保持 xlsx 原順序不打亂】——老闆已刻意把正解位置打散（B/C/B/A、C/B/D/A、B/A/A/C）。
//   3. 繁中為本專案翻譯（xlsx 只有英文），選項一律取站內既有維度名
//      （dimensions.ts / hexaco-dimensions.ts / sd4-dimensions.ts），確保與遊戲內用詞一致。
//      ⏳ 中文描述文案待老闆過目。
//
// xlsx 另有 Source Text / Reference / Remarks(MY) 三欄（出處與改寫說明），本檔只留 reference 備查，UI 不顯示。

export type QuizModel = 'bigfive' | 'hexaco' | 'sd4';

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
const BIG_FIVE_LEAD_ZH = '以下描述的是哪一個大五人格特質？';
const HEXACO_LEAD = 'Which HEXACO dimension is described below?';
const HEXACO_LEAD_ZH = '以下描述的是哪一個 HEXACO 維度？';
const SD4_LEAD = 'Which SD4 subscale is described below?';
const SD4_LEAD_ZH = '以下描述的是哪一個 SD4 分量表？';

export const DIMENSION_QUIZ_QUESTIONS: Record<QuizModel, DimensionQuizQuestion[]> = {
  bigfive: [
    {
      lead: BIG_FIVE_LEAD,
      leadZh: BIG_FIVE_LEAD_ZH,
      body: 'The trait describes organisation, self-discipline, responsibility, carefulness, and persistence.',
      bodyZh: '這項特質描述條理性、自律、責任感、謹慎與堅持。',
      options: ['Openness to Experience', 'Conscientiousness', 'Agreeableness', 'Neuroticism'],
      optionsZh: ['開放性', '盡責性', '宜人性', '神經質'],
      answerIndex: 1,
      reference: 'Ehrhart et al., (2008)',
    },
    {
      lead: BIG_FIVE_LEAD,
      leadZh: BIG_FIVE_LEAD_ZH,
      body: 'The trait describes how strongly and frequently a person tends to experience worry, stress, sadness, and other negative emotions, as well as emotional instability.',
      bodyZh: '這項特質描述一個人經歷擔憂、壓力、悲傷等負面情緒的強度與頻率，以及情緒的不穩定。',
      options: ['Extraversion', 'Agreeableness', 'Neuroticism', 'Openness to Experience'],
      optionsZh: ['外向性', '宜人性', '神經質', '開放性'],
      answerIndex: 2,
      reference: 'Ehrhart et al., (2008)',
    },
    {
      lead: BIG_FIVE_LEAD,
      leadZh: BIG_FIVE_LEAD_ZH,
      body: 'The trait describes sociability, energy, assertiveness, and enjoyment of social interaction.',
      bodyZh: '這項特質描述社交性、活力、自信果斷，以及享受人際互動。',
      options: ['Openness to Experience', 'Extraversion', 'Agreeableness', 'Conscientiousness'],
      optionsZh: ['開放性', '外向性', '宜人性', '盡責性'],
      answerIndex: 1,
      reference: 'Ehrhart et al., (2008)',
    },
    {
      lead: BIG_FIVE_LEAD,
      leadZh: BIG_FIVE_LEAD_ZH,
      body: 'The trait describes compassion, cooperation, trust, and concern for others.',
      bodyZh: '這項特質描述同理關懷、合作、信任與關心他人。',
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
      bodyZh: '這個維度描述真誠、公平、謙遜，以及不願為個人利益而利用他人。',
      options: ['Emotionality', 'Agreeableness', 'Honesty–Humility', 'Conscientiousness'],
      optionsZh: ['情緒性', '宜人性', '誠實－謙遜', '盡責性'],
      answerIndex: 2,
      reference: 'Ashton, M. C., & Lee, K. (2007).',
    },
    {
      lead: HEXACO_LEAD,
      leadZh: HEXACO_LEAD_ZH,
      body: 'The dimension describes fearfulness, anxiety, emotional attachment, sentimentality, and need for support.',
      bodyZh: '這個維度描述恐懼、焦慮、情感依附、感性程度，以及對支持的需要。',
      options: ['Extraversion', 'Emotionality', 'Openness to Experience', 'Agreeableness'],
      optionsZh: ['外向性', '情緒性', '開放性', '宜人性'],
      answerIndex: 1,
      reference: 'Ashton, M. C., & Lee, K. (2009).',
    },
    {
      lead: HEXACO_LEAD,
      leadZh: HEXACO_LEAD_ZH,
      body: 'The dimension describes patience, forgiveness, gentleness, and willingness to compromise with others, especially during conflict.',
      bodyZh: '這個維度描述耐心、寬恕、溫和，以及願意與他人妥協，尤其在衝突之中。',
      options: ['Honesty–Humility', 'Conscientiousness', 'Emotionality', 'Agreeableness'],
      optionsZh: ['誠實－謙遜', '盡責性', '情緒性', '宜人性'],
      answerIndex: 3,
      reference: 'Ashton, M. C., & Lee, K. (2009).',
    },
    {
      lead: HEXACO_LEAD,
      leadZh: HEXACO_LEAD_ZH,
      body: 'The dimension describes curiosity, creativity, appreciation of art and beauty, and interest in new or unconventional ideas.',
      bodyZh: '這個維度描述好奇心、創造力、對藝術與美的欣賞，以及對新奇或非傳統想法的興趣。',
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
      bodyZh: '這個分量表描述衝動、大膽、冒險，以及對規則或自身行為後果的顧慮較低。',
      options: ['Narcissism', 'Psychopathy', 'Machiavellianism', 'Sadism'],
      optionsZh: ['自戀', '病態人格', '馬基維利主義', '虐待'],
      answerIndex: 1,
      reference: 'Akat, M. (2025).',
    },
    {
      lead: SD4_LEAD,
      leadZh: SD4_LEAD_ZH,
      body: 'The subscale describes strategic thinking, manipulation, and a willingness to influence or exploit others to achieve personal goals.',
      bodyZh: '這個分量表描述策略性思考、操控，以及為達成個人目標而願意影響或利用他人。',
      options: ['Machiavellianism', 'Psychopathy', 'Narcissism', 'Sadism'],
      optionsZh: ['馬基維利主義', '病態人格', '自戀', '虐待'],
      answerIndex: 0,
      reference: 'Akat, M. (2025).',
    },
    {
      lead: SD4_LEAD,
      leadZh: SD4_LEAD_ZH,
      body: "The subscale describes self-importance, superiority, admiration seeking, and a belief in one's own uniqueness.",
      bodyZh: '這個分量表描述自我重要感、優越感、渴求讚賞，以及相信自己與眾不同。',
      options: ['Narcissism', 'Machiavellianism', 'Psychopathy', 'Sadism'],
      optionsZh: ['自戀', '馬基維利主義', '病態人格', '虐待'],
      answerIndex: 0,
      reference: 'Akat, M. (2025).',
    },
    {
      lead: SD4_LEAD,
      leadZh: SD4_LEAD_ZH,
      body: 'The subscale describes enjoyment of cruelty, aggression, and pleasure derived from seeing others experience discomfort or suffering.',
      bodyZh: '這個分量表描述享受殘酷與攻擊，並從他人的不適或痛苦中獲得快感。',
      options: ['Machiavellianism', 'Psychopathy', 'Sadism', 'Narcissism'],
      optionsZh: ['馬基維利主義', '病態人格', '虐待', '自戀'],
      answerIndex: 2,
      reference: 'Akat, M. (2025).',
    },
  ],
};
