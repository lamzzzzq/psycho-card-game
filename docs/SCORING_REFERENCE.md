# IPIP-50 计分对照（代码真相源自动生成）

> 自动从 `src/data/questions.ts` + `src/data/dimensions.ts` 生成，与游戏实际计分**完全一致**。
> 生成命令：`node scripts/gen-scoring-ref.mjs`。

## 计分规则
- 每题原始作答 raw ∈ {1,2,3,4,5}（Likert：非常不同意→非常同意）。
- **正向题(+ keyed)**：得分 = raw。**反向题(− keyed)**：得分 = 6 − raw。
- 维度分 = 该维度 10 题（按上式处理后）的**均值**，保留 1 位小数。
- 该维度「目标张数」= round(维度分)，下限 1（游戏用，不影响分数本身）。

## 各维度 正/反向 一览（核对用）

| 维度 | Dimension | 正向题(+ raw) | 反向题(− 6−raw) |
|---|---|---|---|
| 開放性 | Openness | 5, 15, 25, 35, 40, 45, 50 | 10, 20, 30 |
| 盡責性 | Conscientiousness | 3, 13, 23, 33, 43, 48 | 8, 18, 28, 38 |
| 外向性 | Extraversion | 1, 11, 21, 31, 41 | 6, 16, 26, 36, 46 |
| 宜人性 | Agreeableness | 7, 17, 27, 37, 42, 47 | 2, 12, 22, 32 |
| 神經質 | Neuroticism | 4, 14, 24, 29, 34, 39, 44, 49 | 9, 19 |

> 注：N 维度按 **Neuroticism** 计分 —— 第 9、19 反向；4,14,24,29,34,39,44,49 正向（2 反 8 正，参 Goldberg 1999 / Ehrhart et al. 2008）。

## 全 50 题逐条

| id | 维度 | Keyed | English item | 中文題面 |
|---|---|---|---|---|
| 1 | Extraversion | + | I am the life of the party. | 我是派對中的靈魂人物。 |
| 2 | Agreeableness | − | I feel little concern for others. | 我覺得自己很少關心別人。 |
| 3 | Conscientiousness | + | I am always prepared. | 我隨時做好準備。 |
| 4 | Neuroticism | + | I get stressed out easily. | 我容易感到壓力過大。 |
| 5 | Openness | + | I have a rich vocabulary. | 我詞彙豐富。 |
| 6 | Extraversion | − | I don't talk a lot. | 我話不多。 |
| 7 | Agreeableness | + | I am interested in people. | 我對人感興趣。 |
| 8 | Conscientiousness | − | I leave my belongings around. | 我總是丟三落四。 |
| 9 | Neuroticism | − | I am relaxed most of the time. | 我大多時候是放鬆的。 |
| 10 | Openness | − | I have difficulty understanding abstract ideas. | 我對於理解抽象概念有困難。 |
| 11 | Extraversion | + | I feel comfortable around people. | 我和其他人在一起時感覺自在。 |
| 12 | Agreeableness | − | I insult people. | 我會侮辱別人。 |
| 13 | Conscientiousness | + | I pay attention to details. | 我經常注意細節。 |
| 14 | Neuroticism | + | I worry about things. | 我時常為事擔心。 |
| 15 | Openness | + | I have a vivid imagination. | 我有生動的想像力。 |
| 16 | Extraversion | − | I keep in the background. | 我是個低調的人。 |
| 17 | Agreeableness | + | I sympathize with others' feelings. | 我會同情他人的感受。 |
| 18 | Conscientiousness | − | I make a mess of things. | 我常把事物弄得一團糟。 |
| 19 | Neuroticism | − | I seldom feel blue. | 我很少感到鬱悶。 |
| 20 | Openness | − | I am not interested in abstract ideas. | 我對抽象概念不感興趣。 |
| 21 | Extraversion | + | I start conversations. | 我總是主動開始談話。 |
| 22 | Agreeableness | − | I am not interested in other people's problems. | 我對別人的問題不感興趣。 |
| 23 | Conscientiousness | + | I get chores done right away. | 我會立即將日常家務做完。 |
| 24 | Neuroticism | + | I am easily disturbed. | 我容易受擾亂。 |
| 25 | Openness | + | I have excellent ideas. | 我常有絕佳的點子。 |
| 26 | Extraversion | − | I have little to say. | 我沒什麼話說。 |
| 27 | Agreeableness | + | I have a soft heart. | 我有顆柔軟的心。 |
| 28 | Conscientiousness | − | I often forget to put things back in their proper place. | 我常忘記物歸原處。 |
| 29 | Neuroticism | + | I get upset easily. | 我容易感到悶悶不樂。 |
| 30 | Openness | − | I do not have a good imagination. | 我想像力欠佳。 |
| 31 | Extraversion | + | I talk to a lot of different people at parties. | 在聚會中我會跟許多不同的人說話。 |
| 32 | Agreeableness | − | I am not really interested in others. | 我對別人沒什麼興趣。 |
| 33 | Conscientiousness | + | I like order. | 我喜歡井然有序。 |
| 34 | Neuroticism | + | I change my mood a lot. | 我的心情變化很大。 |
| 35 | Openness | + | I am quick to understand things. | 我可以很快理解事物。 |
| 36 | Extraversion | − | I don't like to draw attention to myself. | 我不喜歡引起別人對自己的注意。 |
| 37 | Agreeableness | + | I take time out for others. | 我總會為別人抽出時間。 |
| 38 | Conscientiousness | − | I shirk my duties. | 我會推卸責任。 |
| 39 | Neuroticism | + | I have frequent mood swings. | 我的心情時常起伏不定。 |
| 40 | Openness | + | I use difficult words. | 我常使用艱澀的字彙。 |
| 41 | Extraversion | + | I don't mind being the center of attention. | 我不介意成為注目的焦點。 |
| 42 | Agreeableness | + | I feel others' emotions. | 我能感受他人的情緒。 |
| 43 | Conscientiousness | + | I follow a schedule. | 我總是按照預定計畫行事。 |
| 44 | Neuroticism | + | I get irritated easily. | 我容易感到煩躁。 |
| 45 | Openness | + | I spend time reflecting on things. | 我會花時間反思事物。 |
| 46 | Extraversion | − | I am quiet around strangers. | 我和陌生人相處時顯得安靜。 |
| 47 | Agreeableness | + | I make people feel at ease. | 我能使人感到自在。 |
| 48 | Conscientiousness | + | I am exacting in my work. | 我對我的工作要求嚴謹。 |
| 49 | Neuroticism | + | I often feel blue. | 我常感到鬱悶。 |
| 50 | Openness | + | I am full of ideas. | 我總是充滿想法。 |
