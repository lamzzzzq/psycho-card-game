# 卡牌插画原图投放区（raw PNG）

把 AI 生成的人格牌插画放这里。**这是原图区，不会被部署**（已 gitignore *.png）。

## 目录

| 路径 | 用途 |
|---|---|
| `{id}.png` | Big Five 50 题（**已定稿，见下方配比铁律**） |
| `hexaco/{id}.png` | HEXACO 60 题 |
| `female/{id}.png` | Big Five 奇数号女主角版的**真相源备份**，与线上 webp 逐像素一致 |
| `_rejected/` | 被否决的版本（男主角版、废弃构图），留档不使用 |
| `{id}-v2.png` 等 | 同一题的构图变体。定稿的那版必须同时复制成 `{id}.png` |

## ⚠️ 主角配比铁律（Big Five 与 HEXACO 通用）

**奇数题 = 红衣长发女主角，偶数题 = 绿卫衣短发男主角**，交叉出现。这是刻意的性别配比设计，
不是随机结果。重画任何一张都必须保持该题号原本的主角性别。

2026-07 曾把 Big Five 奇数号整批换成男主角（#19/#34/#50 还换了构图），交叉配比全毁，
后来靠 `public/cards/*.webp` 与 `female/` 才回滚。教训：

- 改图前先确认该题号该是男是女
- Big Five 已定稿，非必要不要重转（转换脚本已默认跳过它，见下）

## 命名
- `{id}.png`，即 `1.png` … `50.png`
- id = 题目 id（见 `src/data/questions.ts` / `docs/i18n-review.csv` 的 card.{id} 行）
- 例：`1.png`=「我是派对中的灵魂人物」(E外向)，`5.png`=「我词汇丰富」(O开放)
- 知识牌(dummy)无需插画；只做 1–50。

## 规格
1024×1024 方图，主体居中留 ~10% 安全边，无框无字（见 docs/CARD_ART_SPEC.md）。

## 转换上线

```bash
node scripts/convert-card-art.mjs                 # 默认只转 HEXACO
node scripts/convert-card-art.mjs --deck=big-five # 显式才转 Big Five
node scripts/convert-card-art.mjs --all           # 两套都转
```

→ 输出到 `public/cards/{id}.webp` 与 `public/cards/hexaco/{id}.webp`，刷新即生效。

跑完**务必看一眼 `git status public/cards/`**：只有你确实想改的图才应该出现在变更列表里。
