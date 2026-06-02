import { Question } from '@/types';

/**
 * 60 道 Big Five 人格測評題目
 * 基於 IPIP (International Personality Item Pool) 方法論
 * 每個維度 12 題，6 正向 + 6 反向計分
 * 每個維度覆蓋 6 個子面向 (facet)
 */
export const QUESTIONS: Question[] = [
  // ===== Openness 開放性 (O1-O12) =====
  { id: 1,  dimension: 'O', text: '我喜歡嘗試新的事物和體驗', reversed: false, facet: '冒險精神' },
  { id: 2,  dimension: 'O', text: '我對抽象的哲學問題很感興趣', reversed: false, facet: '思辨能力' },
  { id: 3,  dimension: 'O', text: '我覺得藝術和美學對我很重要', reversed: false, facet: '審美感受' },
  { id: 4,  dimension: 'O', text: '我經常會有天馬行空的想象', reversed: false, facet: '想象力' },
  { id: 5,  dimension: 'O', text: '我喜歡挑戰傳統觀念和固有想法', reversed: false, facet: '求新意識' },
  { id: 6,  dimension: 'O', text: '我對不同文化和價值觀持開放態度', reversed: false, facet: '包容性' },
  { id: 7,  dimension: 'O', text: '我不太喜歡接觸陌生的事物', reversed: true, facet: '冒險精神' },
  { id: 8,  dimension: 'O', text: '我認爲實用比創意更重要', reversed: true, facet: '想象力' },
  { id: 9,  dimension: 'O', text: '我更喜歡按照既定的方式做事', reversed: true, facet: '求新意識' },
  { id: 10, dimension: 'O', text: '我很少關注藝術或文學作品', reversed: true, facet: '審美感受' },
  { id: 11, dimension: 'O', text: '我對深奧的理論不感興趣', reversed: true, facet: '思辨能力' },
  { id: 12, dimension: 'O', text: '我傾向於堅持自己熟悉的環境和習慣', reversed: true, facet: '包容性' },

  // ===== Conscientiousness 盡責性 (C1-C12) =====
  { id: 13, dimension: 'C', text: '我做事情之前總會制定詳細的計劃', reversed: false, facet: '計劃性' },
  { id: 14, dimension: 'C', text: '我會認真完成我承諾過的每一件事', reversed: false, facet: '責任感' },
  { id: 15, dimension: 'C', text: '我的生活和工作空間總是整整齊齊的', reversed: false, facet: '條理性' },
  { id: 16, dimension: 'C', text: '我會爲實現長遠目標而堅持不懈地努力', reversed: false, facet: '成就動機' },
  { id: 17, dimension: 'C', text: '我能夠抵制誘惑，專注於當前的任務', reversed: false, facet: '自律性' },
  { id: 18, dimension: 'C', text: '我做決定前會仔細權衡各種選擇', reversed: false, facet: '審慎性' },
  { id: 19, dimension: 'C', text: '我經常拖延重要的事情', reversed: true, facet: '自律性' },
  { id: 20, dimension: 'C', text: '我有時候會忘記自己的承諾和義務', reversed: true, facet: '責任感' },
  { id: 21, dimension: 'C', text: '我的物品經常找不到放在哪裏', reversed: true, facet: '條理性' },
  { id: 22, dimension: 'C', text: '我做事經常是想到什麼就做什麼，不太有規劃', reversed: true, facet: '計劃性' },
  { id: 23, dimension: 'C', text: '遇到困難時我容易半途而廢', reversed: true, facet: '成就動機' },
  { id: 24, dimension: 'C', text: '我經常不假思索地做出決定', reversed: true, facet: '審慎性' },

  // ===== Extraversion 外向性 (E1-E12) =====
  { id: 25, dimension: 'E', text: '在社交場合中我感到精力充沛', reversed: false, facet: '社交活力' },
  { id: 26, dimension: 'E', text: '我喜歡成爲衆人關注的焦點', reversed: false, facet: '自信表達' },
  { id: 27, dimension: 'E', text: '我很容易和陌生人聊起來', reversed: false, facet: '社交能力' },
  { id: 28, dimension: 'E', text: '我喜歡參加熱鬧的聚會和活動', reversed: false, facet: '活動需求' },
  { id: 29, dimension: 'E', text: '我經常感到開心和充滿活力', reversed: false, facet: '積極情緒' },
  { id: 30, dimension: 'E', text: '我喜歡帶領別人，主導局面', reversed: false, facet: '支配性' },
  { id: 31, dimension: 'E', text: '在人多的環境中我會感到不自在', reversed: true, facet: '社交活力' },
  { id: 32, dimension: 'E', text: '我更喜歡安靜地獨處而不是社交', reversed: true, facet: '活動需求' },
  { id: 33, dimension: 'E', text: '我在羣體中通常比較沉默', reversed: true, facet: '社交能力' },
  { id: 34, dimension: 'E', text: '我不太喜歡引起別人的注意', reversed: true, facet: '自信表達' },
  { id: 35, dimension: 'E', text: '我很少主動發起對話或活動', reversed: true, facet: '支配性' },
  { id: 36, dimension: 'E', text: '我的情緒通常比較平淡，不太容易興奮', reversed: true, facet: '積極情緒' },

  // ===== Agreeableness 宜人性 (A1-A12) =====
  { id: 37, dimension: 'A', text: '我很容易信任別人', reversed: false, facet: '信任' },
  { id: 38, dimension: 'A', text: '我會主動幫助遇到困難的人', reversed: false, facet: '利他性' },
  { id: 39, dimension: 'A', text: '我在與人交往時總是坦誠相待', reversed: false, facet: '坦率性' },
  { id: 40, dimension: 'A', text: '看到別人受苦我會感到心疼', reversed: false, facet: '同理心' },
  { id: 41, dimension: 'A', text: '在發生衝突時我願意妥協退讓', reversed: false, facet: '順從性' },
  { id: 42, dimension: 'A', text: '我對人總是很謙虛，不喜歡炫耀', reversed: false, facet: '謙遜性' },
  { id: 43, dimension: 'A', text: '我覺得大多數人都有自己的私心', reversed: true, facet: '信任' },
  { id: 44, dimension: 'A', text: '別人的問題不關我的事', reversed: true, facet: '利他性' },
  { id: 45, dimension: 'A', text: '我有時候會爲了達到目的而隱瞞真相', reversed: true, facet: '坦率性' },
  { id: 46, dimension: 'A', text: '我認爲人應該自己解決自己的問題', reversed: true, facet: '同理心' },
  { id: 47, dimension: 'A', text: '我在爭論中很難讓步', reversed: true, facet: '順從性' },
  { id: 48, dimension: 'A', text: '我認爲自己在很多方面比別人優秀', reversed: true, facet: '謙遜性' },

  // ===== Neuroticism 神經質 (N1-N12) =====
  { id: 49, dimension: 'N', text: '我經常感到焦慮和擔憂', reversed: false, facet: '焦慮' },
  { id: 50, dimension: 'N', text: '我容易因爲小事而生氣或煩躁', reversed: false, facet: '憤怒' },
  { id: 51, dimension: 'N', text: '我時常感到悲傷或情緒低落', reversed: false, facet: '抑鬱' },
  { id: 52, dimension: 'N', text: '我在社交場合中會感到不安和緊張', reversed: false, facet: '社交焦慮' },
  { id: 53, dimension: 'N', text: '我在壓力下很難控制自己的衝動', reversed: false, facet: '衝動性' },
  { id: 54, dimension: 'N', text: '我覺得自己在面對困難時很脆弱', reversed: false, facet: '脆弱性' },
  { id: 55, dimension: 'N', text: '我很少感到緊張或不安', reversed: true, facet: '焦慮' },
  { id: 56, dimension: 'N', text: '我能夠很好地控制自己的情緒', reversed: true, facet: '憤怒' },
  { id: 57, dimension: 'N', text: '我大部分時間都感到心情愉快', reversed: true, facet: '抑鬱' },
  { id: 58, dimension: 'N', text: '在陌生人面前我也能保持自在', reversed: true, facet: '社交焦慮' },
  { id: 59, dimension: 'N', text: '我在壓力下依然能冷靜思考', reversed: true, facet: '衝動性' },
  { id: 60, dimension: 'N', text: '我在逆境中總能保持堅強', reversed: true, facet: '脆弱性' },
];
