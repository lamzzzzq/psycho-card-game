// SD4（Short Dark Tetrad 簡式暗黑四特質量表）28 題題庫。source：SD4_20260804.xlsx（泽权整理 / Check by Mengying）。
// 中文題面 = 繁體中文版（張益慈、詹雨臻、陳學志，2021，測驗學刊）；英文題面 = Paulhus et al. (2021) 原版。
// 4 維各 7 題，按 xlsx Item Order 排列（馬基維利主義 1–7、自戀 8–14、病態人格 15–21、虐待 22–28）。
// ⚠️ 全部正向計分，無反向計分（xlsx 明示）。切勿改題序/題面/維度——本檔由腳本自 xlsx 生成，勿手改。
// 唯一人工修正（2026-08-25 用戶拍板）：#17「同龄」→「同齡」——xlsx 原文夾了簡體字，統一繁體。
import { Sd4Question } from './sd4-types';

export const SD4_QUESTIONS: Sd4Question[] = [
  { id: 1, dimension: 'M', text: '讓別人知道你的秘密是不明智的。', textEn: 'It\'s not wise to let people know your secrets.' },
  { id: 2, dimension: 'M', text: '無論如何，你必須讓重要人士站在你這邊。', textEn: 'Whatever it takes, you must get the important people on your side.' },
  { id: 3, dimension: 'M', text: '避免與他人直接衝突，因為他們可能在未來對你有幫助。', textEn: 'Avoid direct conflict with others because they may be useful in the future.' },
  { id: 4, dimension: 'M', text: '如果想隨心所欲的話就得盡量保持低調。', textEn: 'Keep a low profile if you want to get your way.' },
  { id: 5, dimension: 'M', text: '掌握情勢是需要事先計畫的。', textEn: 'Manipulating the situation takes planning.' },
  { id: 6, dimension: 'M', text: '奉承他人是個讓別人站在你這邊的好方法。', textEn: 'Flattery is a good way to get people on your side.' },
  { id: 7, dimension: 'M', text: '當一項詭計成功時我會很開心。', textEn: 'I love it when a tricky plan succeeds.' },
  { id: 8, dimension: 'N', text: '人們視我為天生的領導者。', textEn: 'People see me as a natural leader.' },
  { id: 9, dimension: 'N', text: '我具有說服他人的獨特天分。', textEn: 'I have a unique talent for persuading people.' },
  { id: 10, dimension: 'N', text: '團體活動如果沒有我的話就會顯得無趣。', textEn: 'Group activities tend to be dull without me.' },
  { id: 11, dimension: 'N', text: '我知道自己很特別，因為人們也是一直這樣告訴我的。', textEn: 'I know that I am special because people keep telling me so.' },
  { id: 12, dimension: 'N', text: '我擁有一些出類拔萃的特質。', textEn: 'I have some exceptional qualities' },
  { id: 13, dimension: 'N', text: '我有可能是某個領域的明日之星。', textEn: 'I\'m likely to become a future star in some area.' },
  { id: 14, dimension: 'N', text: '我喜歡時不時地炫耀。', textEn: 'I like to show off every now and then.' },
  { id: 15, dimension: 'P', text: '人們常說我不受控制。', textEn: 'People often say I\'m out of control.' },
  { id: 16, dimension: 'P', text: '我傾向與權威人士以及他們制定的規範抗爭。', textEn: 'I tend to fight against authorities and their rules.' },
  { id: 17, dimension: 'P', text: '和大多數與我同齡及同性別的人相比，我與他人有更多的紛爭。', textEn: 'I’ve been in more fights than most people of my age and gender.' },
  { id: 18, dimension: 'P', text: '我傾向先投入眼前的情況，晚一點再來問問題。', textEn: 'I tend to dive in, then ask questions later.' },
  { id: 19, dimension: 'P', text: '我曾涉及與法律相關的麻煩事物。', textEn: 'I\'ve been in trouble with the law.' },
  { id: 20, dimension: 'P', text: '我有時會將自己置身於危險的情況之中。', textEn: 'I sometimes get into dangerous situations.' },
  { id: 21, dimension: 'P', text: '惹毛我的人總是會後悔。', textEn: 'People who mess with me always regret it.' },
  { id: 22, dimension: 'S', text: '看別人打架會讓我感到興奮。', textEn: 'Watching a fist-fight excites me.' },
  { id: 23, dimension: 'S', text: '我對涉及暴力內容的影片和電動遊戲樂在其中。', textEn: 'I really enjoy violent films and video games.' },
  { id: 24, dimension: 'S', text: '看傻瓜跌得一敗塗地很有趣。', textEn: 'It\'s funny when idiots fall flat on their face.' },
  { id: 25, dimension: 'S', text: '我很享受觀看暴力運動。', textEn: 'I enjoy watching violent sports.' },
  { id: 26, dimension: 'S', text: '有些人應該受苦。', textEn: 'Some people deserve to suffer.' },
  { id: 27, dimension: 'S', text: '我曾在社交媒體上說過惡毒的話只為了提高點閱率。', textEn: 'Just for kicks, I’ve said mean things on social media.' },
  { id: 28, dimension: 'S', text: '我知道如何單憑文字就能傷人。', textEn: 'I know how to hurt someone with words alone.' },
];
