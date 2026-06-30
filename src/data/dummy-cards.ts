// 知识牌（dummy / 檔案註記）：APSS 课程心理学概念，术语 + 一句话定义。
// 英文：term = 课程 sheet A 列（术语）、definition = B 列（Bryant's version）。
// 繁中：termZh = E 列（Term, Mengying check）、definitionZh = F 列（Description, Mengying check）。
// 用途：作为手牌里的「噪音牌/知识牌」，不计入人格归档；同时承载课程知识点。语言由 locale 切换。
export interface KnowledgeCard {
  term: string;          // 英文术语（A 列）
  definition: string;    // 英文定义（B 列 Bryant's version）
  termZh: string;        // 繁中术语（E 列）
  definitionZh: string;  // 繁中定义（F 列）
}

export const KNOWLEDGE_CARDS: KnowledgeCard[] = [
  { term: 'Biological Approach', definition: 'Personality shaped by genetics and inherited biological structures.', termZh: '生物學取向', definitionZh: '人格由遺傳基因和先天生物結構所塑造。' },
  { term: 'Humanistic Approach', definition: 'Focuses on inherent human goodness and striving for self-actualization.', termZh: '人本取向', definitionZh: '強調人類與生俱來的善性，以及追求自我實現。' },
  { term: 'Behavioural Perspective', definition: 'Behavioral patterns learned entirely through external rewards and punishments.', termZh: '行為主義觀點', definitionZh: '行為模式主要由外在獎賞與懲罰所習得。' },
  { term: 'Social-Cognitive Theory', definition: 'How mental processes and social environments interact to guide behavior.', termZh: '社會認知理論', definitionZh: '探討心理歷程與社會環境如何交互作用以引導行為。' },
  { term: 'Trait Theory', definition: 'Views personality as a configuration of stable, measurable traits.', termZh: '特質理論', definitionZh: '認為人格是由穩定且可測量的特質所組成。' },
  { term: "Erikson's Stages of Development", definition: 'Eight lifelong developmental stages centered on unique psychosocial crises.', termZh: '艾瑞克森的心理社會發展階段', definitionZh: '一生包含八個以獨特心理社會危機為核心的發展階段。' },
  { term: 'Temperament', definition: 'Innate, biological tendencies shaping how we emotionally react and adapt.', termZh: '氣質', definitionZh: '塑造情緒反應與適應方式的先天生物傾向。' },
  { term: 'Traits', definition: 'Stable, enduring tendencies to think, feel, and behave in specific ways.', termZh: '特質', definitionZh: '穩定且持久的思考、感受與行為傾向。' },
  { term: 'Personality', definition: "An individual's unique, enduring pattern of thinking, feeling, and acting.", termZh: '人格', definitionZh: '個體獨特且持久的思考、情感與行為模式。' },
  { term: 'Self-Concept', definition: "An individual's internal perception and mental blueprint of who they are.", termZh: '自我概念', definitionZh: '個體對自身特質與身份的內在認知表徵。' },
  { term: 'Self-Efficacy', definition: "One's belief and confidence in their own ability to succeed.", termZh: '自我效能感', definitionZh: '個體對自身成功完成任務能力的信念與信心。' },
  { term: 'Archetypes', definition: 'Universal, inherited symbols or themes within the collective unconscious.', termZh: '原型', definitionZh: '存在於集體無意識中的普遍原型或象徵主題。' },
  { term: 'Reciprocal Determinism', definition: 'The continuous feedback loop between thoughts, behavior, and environment.', termZh: '交互決定論', definitionZh: '個人、行為與環境之間持續的三元交互作用歷程。' },
  { term: 'Congruence', definition: 'A state of high alignment between real self and ideal self.', termZh: '一致性', definitionZh: '真實自我與理想自我之間的高度一致性。' },
  { term: 'Id', definition: 'The unconscious mind driven by primitive urges and immediate pleasure.', termZh: '本我', definitionZh: '受原始衝動與快樂原則支配的無意識部分。' },
  { term: 'Ego', definition: 'The rational, conscious mind balancing primitive desires with reality.', termZh: '自我', definitionZh: '在原始慾望與現實要求之間進行平衡的理性意識部分。' },
  { term: 'Superego', definition: 'The internalized moral conscience tracking societal rules, ideals, and guilt.', termZh: '超我', definitionZh: '內化的道德良知，反映社會規範、理想與罪疚感。' },
  { term: 'Locus of Control', definition: "Believing life's outcomes are driven by your actions versus external forces.", termZh: '控制點', definitionZh: '個體傾向於認為人生結果由內在行動或外在力量所決定。' },
  { term: 'Defense Mechanisms', definition: 'Unconscious mental strategies used by the ego to distort reality and reduce anxiety.', termZh: '防衛機制', definitionZh: '自我用以扭曲現實並降低焦慮的無意識心理策略。' },
  { term: 'Projective Testing', definition: 'Using ambiguous stimuli (like inkblots) to explore unconscious psychological processes.', termZh: '投射測驗', definitionZh: '利用模糊刺激（如墨漬圖）探索無意識心理歷程。' },
];
