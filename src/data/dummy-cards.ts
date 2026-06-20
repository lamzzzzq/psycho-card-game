// 知识牌（dummy / 檔案註記）：APSS 课程心理学概念，术语 + 一句话定义（Bryant 修订版）。
// 来源：课程 sheet A 列(术语) + C 列(Bryant's version 定义)。统一英文。
// 用途：作为手牌里的「噪音牌/知识牌」，不计入人格归档；同时承载课程知识点。
export interface KnowledgeCard {
  term: string;
  definition: string;
}

export const KNOWLEDGE_CARDS: KnowledgeCard[] = [
  { term: 'Biological Approach', definition: 'Personality shaped by genetics and inherited biological structures.' },
  { term: 'Humanistic Approach', definition: 'Focuses on inherent human goodness and striving for self-actualization.' },
  { term: 'Behavioural Perspective', definition: 'Behavioral patterns learned entirely through external rewards and punishments.' },
  { term: 'Social-Cognitive Theory', definition: 'How mental processes and social environments interact to guide behavior.' },
  { term: 'Trait Theory', definition: 'Views personality as a configuration of stable, measurable traits.' },
  { term: "Erikson's Stages of Development", definition: 'Eight lifelong developmental stages centered on unique psychosocial conflicts.' },
  { term: 'Temperament', definition: 'Innate, biological tendencies shaping how we emotionally react and adapt.' },
  { term: 'Traits', definition: 'Stable, enduring tendencies to think, feel, and behave in specific ways.' },
  { term: 'Personality', definition: "An individual's unique, enduring pattern of thinking, feeling, and acting." },
  { term: 'Self-Concept', definition: "An individual's internal perception and mental blueprint of who they are." },
  { term: 'Self-Efficacy', definition: "One's belief and confidence in their own ability to succeed." },
  { term: 'Archetypes', definition: 'Universal, inherited symbols or themes within the collective unconscious.' },
  { term: 'Reciprocal Determinism', definition: 'The continuous feedback loop between thoughts, behavior, and environment.' },
  { term: 'Congruence', definition: 'A state of high alignment between real self and ideal self.' },
  { term: 'Id', definition: 'The unconscious mind driven by primitive urges and immediate pleasure.' },
  { term: 'Ego', definition: 'The rational, conscious mind balancing primitive desires with reality.' },
  { term: 'Superego', definition: 'The internalized moral conscience tracking societal rules, ideals, and guilt.' },
  { term: 'Locus of Control', definition: "Believing life's outcomes are driven by your actions versus external forces." },
  { term: 'Defense Mechanisms', definition: 'Unconscious mental strategies used by the ego to distort reality and reduce anxiety.' },
  { term: 'Projective Testing', definition: 'Using ambiguous stimuli (like inkblots) to expose unconscious dynamics.' },
];
