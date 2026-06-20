# 卡牌插画原图投放区（raw PNG）

把 AI 生成的人格牌插画放这里。**这是原图区，不会被部署**（已 gitignore *.png）。

## 命名
- `{id}.png`，即 `1.png` … `50.png`
- id = 题目 id（见 `src/data/questions.ts` / `docs/i18n-review.csv` 的 card.{id} 行）
- 例：`1.png`=「我是派对中的灵魂人物」(E外向)，`5.png`=「我词汇丰富」(O开放)
- 知识牌(dummy)无需插画；只做 1–50。

## 规格
1024×1024 方图，主体居中留 ~10% 安全边，无框无字（见 docs/CARD_ART_SPEC.md）。

## 转换上线
放好后跑：`node scripts/convert-card-art.mjs`（待建）
→ 自动 `card-art-src/{id}.png` 转 webp 输出到 `public/cards/{id}.webp`，刷新即生效。
