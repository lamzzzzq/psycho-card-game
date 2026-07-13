import { Question } from '@/types';

/**
 * IPIP-50 Big Five 人格測評（50 題）
 * 來源：docs/Big Five Personality_20260612.xlsx（Goldberg, 1999 / IPIP）
 * 順序：嚴格按文件「correct order」E/A/C/N/O 交錯排列，不打亂。
 * reversed：嚴格照文件 (- keyed) 標記。計分 reversed 時用 6 - rawScore。
 * ⚠️ N 維度按『神經質 / Neuroticism』方向計分（參考 Goldberg 1999 / Ehrhart et al. 2008）：
 *    第 9、19 題反向（放鬆/不憂鬱→低神經質），其餘 8 題（4,14,24,29,34,39,44,49）正向。
 *    故 N 高分 = 情緒不穩、易焦慮。（2026-06 改用「神經質 / Neuroticism」計分，N 題正反向已對調）
 * 中英雙語：text 繁中、textEn 英文，語言由 locale 切換。
 */
export const QUESTIONS: Question[] = [
  { id: 1, dimension: 'E', reversed: false, text: '我是派對中的靈魂人物。', textEn: 'I am the life of the party.' },
  { id: 2, dimension: 'A', reversed: true, text: '我覺得自己很少關心別人。', textEn: 'I feel little concern for others.' },
  { id: 3, dimension: 'C', reversed: false, text: '我隨時做好準備。', textEn: 'I am always prepared.' },
  { id: 4, dimension: 'N', reversed: false, text: '我容易感到壓力過大。', textEn: 'I get stressed out easily.' },
  { id: 5, dimension: 'O', reversed: false, text: '我詞彙豐富。', textEn: 'I have a rich vocabulary.' },
  { id: 6, dimension: 'E', reversed: true, text: '我話不多。', textEn: 'I don\'t talk a lot.' },
  { id: 7, dimension: 'A', reversed: false, text: '我對人感興趣。', textEn: 'I am interested in people.' },
  { id: 8, dimension: 'C', reversed: true, text: '我總是丟三落四。', textEn: 'I leave my belongings around.' },
  { id: 9, dimension: 'N', reversed: true, text: '我大多時候是放鬆的。', textEn: 'I am relaxed most of the time.' },
  { id: 10, dimension: 'O', reversed: true, text: '我對於理解抽象概念有困難。', textEn: 'I have difficulty understanding abstract ideas.' },
  { id: 11, dimension: 'E', reversed: false, text: '我和其他人在一起時感覺自在。', textEn: 'I feel comfortable around people.' },
  { id: 12, dimension: 'A', reversed: true, text: '我會侮辱別人。', textEn: 'I insult people.' },
  { id: 13, dimension: 'C', reversed: false, text: '我經常注意細節。', textEn: 'I pay attention to details.' },
  { id: 14, dimension: 'N', reversed: false, text: '我時常為事擔心。', textEn: 'I worry about things.' },
  { id: 15, dimension: 'O', reversed: false, text: '我有生動的想像力。', textEn: 'I have a vivid imagination.' },
  { id: 16, dimension: 'E', reversed: true, text: '我是個低調的人。', textEn: 'I keep in the background.' },
  { id: 17, dimension: 'A', reversed: false, text: '我會同情他人的感受。', textEn: 'I sympathize with others\' feelings.' },
  { id: 18, dimension: 'C', reversed: true, text: '我常把事物弄得一團糟。', textEn: 'I make a mess of things.' },
  { id: 19, dimension: 'N', reversed: true, text: '我很少感到鬱悶。', textEn: 'I seldom feel blue.' },
  { id: 20, dimension: 'O', reversed: true, text: '我對抽象概念不感興趣。', textEn: 'I am not interested in abstract ideas.' },
  { id: 21, dimension: 'E', reversed: false, text: '我總是主動開始談話。', textEn: 'I start conversations.' },
  { id: 22, dimension: 'A', reversed: true, text: '我對別人的問題不感興趣。', textEn: 'I am not interested in other people\'s problems.' },
  { id: 23, dimension: 'C', reversed: false, text: '我會立即將日常家務做完。', textEn: 'I get chores done right away.' },
  { id: 24, dimension: 'N', reversed: false, text: '我容易受擾亂。', textEn: 'I am easily disturbed.' },
  { id: 25, dimension: 'O', reversed: false, text: '我常有絕佳的點子。', textEn: 'I have excellent ideas.' },
  { id: 26, dimension: 'E', reversed: true, text: '我沒什麼話說。', textEn: 'I have little to say.' },
  { id: 27, dimension: 'A', reversed: false, text: '我有顆柔軟的心。', textEn: 'I have a soft heart.' },
  { id: 28, dimension: 'C', reversed: true, text: '我常忘記物歸原處。', textEn: 'I often forget to put things back in the right place.' },
  { id: 29, dimension: 'N', reversed: false, text: '我容易感到悶悶不樂。', textEn: 'I get upset easily.' },
  { id: 30, dimension: 'O', reversed: true, text: '我想像力欠佳。', textEn: 'I do not have a good imagination.' },
  { id: 31, dimension: 'E', reversed: false, text: '在聚會中我會跟許多不同的人說話。', textEn: 'I talk to a lot of different people at parties.' },
  { id: 32, dimension: 'A', reversed: true, text: '我對別人沒什麼興趣。', textEn: 'I am not really interested in others.' },
  { id: 33, dimension: 'C', reversed: false, text: '我喜歡井然有序。', textEn: 'I like order.' },
  { id: 34, dimension: 'N', reversed: false, text: '我的心情變化很大。', textEn: 'I change my mood a lot.' },
  { id: 35, dimension: 'O', reversed: false, text: '我可以很快理解事物。', textEn: 'I am quick to understand things.' },
  { id: 36, dimension: 'E', reversed: true, text: '我不喜歡引起別人對自己的注意。', textEn: 'I don\'t like to draw attention to myself.' },
  { id: 37, dimension: 'A', reversed: false, text: '我總會為別人抽出時間。', textEn: 'I take time out for others.' },
  { id: 38, dimension: 'C', reversed: true, text: '我會推卸責任。', textEn: 'I shirk my duties.' },
  { id: 39, dimension: 'N', reversed: false, text: '我的心情時常起伏不定。', textEn: 'I have frequent mood swings.' },
  { id: 40, dimension: 'O', reversed: false, text: '我常使用艱澀的字彙。', textEn: 'I use difficult words.' },
  { id: 41, dimension: 'E', reversed: false, text: '我不介意成為注目的焦點。', textEn: 'I don\'t mind being the center of attention.' },
  { id: 42, dimension: 'A', reversed: false, text: '我能感受他人的情緒。', textEn: 'I feel others\' emotions.' },
  { id: 43, dimension: 'C', reversed: false, text: '我總是按照預定計畫行事。', textEn: 'I follow a schedule.' },
  { id: 44, dimension: 'N', reversed: false, text: '我容易感到煩躁。', textEn: 'I get irritated easily.' },
  { id: 45, dimension: 'O', reversed: false, text: '我會花時間反思事物。', textEn: 'I spend time reflecting on things.' },
  { id: 46, dimension: 'E', reversed: true, text: '我和陌生人相處時顯得安靜。', textEn: 'I am quiet around strangers.' },
  { id: 47, dimension: 'A', reversed: false, text: '我能使人感到自在。', textEn: 'I make people feel at ease.' },
  { id: 48, dimension: 'C', reversed: false, text: '我對我的工作要求嚴謹。', textEn: 'I am exacting in my work.' },
  { id: 49, dimension: 'N', reversed: false, text: '我常感到鬱悶。', textEn: 'I often feel blue.' },
  { id: 50, dimension: 'O', reversed: false, text: '我總是充滿想法。', textEn: 'I am full of ideas.' },
];
