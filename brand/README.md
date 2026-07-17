# brand/ —— 人格麻將 Logo 设计交付

Logo 提案：完整思考过程、方向与方案（2026-07-17）。**目前仅为提案，尚未落地到网站任何位置。**

## Round 2 · 老板方向深化（2026-07-18）

新增 **4 个母题 × 每题 9 个变体 = 36 个可比较 Logo 方向**，都已在 `/brand` 页内排版展示，并同时导出为 SVG 源文件与 PNG 切图：

| 母题 | 设计意图 | 资产目录 |
|---|---|---|
| 蜂巢 / 麻将结构 | 组合、归档、关系网；不将格数绑定为人格维度数 | `public/brand/generated/round2/honeycomb/` |
| 多面体 / 心理切面 | 老板提供的多面体参考；以切面表达人格观察 | `public/brand/generated/round2/polyhedron/` |
| 轨道 / 人格关系 | 灵活节点数，适合未来模型与动效 | `public/brand/generated/round2/orbit/` |
| 人格树 / 生长网络 | Ψ 为树干与根，分枝表达理解自己与他人 | `public/brand/generated/round2/tree/` |

- 每个目录含 `01`–`09` 的 SVG 和 640px PNG。
- 每个母题另有一张 3×3 联络表：`public/brand/generated/round2/*-contact-sheet.png`。
- 源生成器：`brand/scripts/generate-round2-logo-marks.mjs`；需要重导出时运行 `node brand/scripts/generate-round2-logo-marks.mjs`。

> 该轮在评审中被否决：36 张仅是同一居中 Ψ 的表面换皮，不应继续作为候选。

## Round 3 · 四个主标重做（2026-07-18）

重做时不再追求数量，先以老板给出的蜂巢、多面体、轨道、树四条参考，做出 **4 个独立剪影 × 每个 3 个结构版本 = 12 个主标**。所有标志都让 Ψ 成为构图自身的一部分（负形、切面、轨迹或树干），而不是被贴在中心。

- 资产：`public/brand/generated/round3/`
- SVG/PNG 生成器：`brand/scripts/generate-round3-master-marks.mjs`
- `/brand` 页面只展示这一轮作为当前评审候选；Round 2 保留在文件系统内作废稿，不再引用。

## Round 4 · PNG 视觉成图（2026-07-18）

用户否决 Round 3 的代码化外观后，本轮尝试了 PNG 视觉生成稿；但这批带压印、烫金与物件质感的图也已被否决，不再在 `/brand` 展示。

| 方向 | PNG |
|---|---|
| 多面体切面 | `public/brand/generated/round4-ai/polyhedron-foil.png` |
| 折页 Ψ | `public/brand/generated/round4-ai/folded-psi.png` |
| 生长 Ψ | `public/brand/generated/round4-ai/growing-psi.png` |
| 蜂巢负形 | `public/brand/generated/round4-ai/honeycomb-negative.png` |

Round 2 / 3 / 4 只保留为作废探索稿，不再在 `/brand` 展示。

## Round 5 · 平面 PNG 36 张（2026-07-18）

严格按 `DESIGN.md` 与 `LOGO_STRATEGY.md` 重做：只用象牙、暖金、深金、墨色及少量陶土/柔绿；平面纯色、圆角描边、无纹理、无压印、无 3D。此轮方向选择错误，已不在 `/brand` 展示。

| 方向 | 变体数量 | 资产目录 | 联络表 |
|---|---:|---|---|
| Psi Tile | 9 | `public/brand/generated/round5-flat/tile/` | `sheets/tile.png` |
| Psi Vase | 9 | `public/brand/generated/round5-flat/vase/` | `sheets/vase.png` |
| Psi Orbit | 9 | `public/brand/generated/round5-flat/orbit/` | `sheets/orbit.png` |
| Psi Mind | 9 | `public/brand/generated/round5-flat/mind/` | `sheets/mind.png` |

## Round 6 · 四个母题展开 36 张（2026-07-18）

按评审反馈恢复并展开最初四个方向：**蜂巢负形、多面体切面、轨道标记、生长 Ψ**。每个方向都以不同的色彩、外轮廓、构图与 Ψ 的融入方式拓展 9 张；`/brand` 当前展示此轮。

### 与当前首页的底色规则

不新增深色/紫色/绿色整版品牌底。首页实际只有暖纸网格页底、象牙内容卡与暖金 CTA：前两者放深墨或暖金正标；只有暖金 CTA / 强调块放象牙负形标。定稿后，把选中的母题转成反白切口版，不另起一套深色 Logo。

| 方向 | 变体数量 | 资产目录 | 联络表 |
|---|---:|---|---|
| 蜂巢负形 | 9 | `public/brand/generated/round6-four-directions/hive/` | `sheets/hive.png` |
| 多面体切面 | 9 | `public/brand/generated/round6-four-directions/polyhedron/` | `sheets/polyhedron.png` |
| 轨道标记 | 9 | `public/brand/generated/round6-four-directions/orbit/` | `sheets/orbit.png` |
| 生长 Ψ | 9 | `public/brand/generated/round6-four-directions/growth/` | `sheets/growth.png` |

## 文件
- **[LOGO_STRATEGY.md](./LOGO_STRATEGY.md)** —— 设计目标、想放的元素、与网站一致性、设计思路、4 方向×3 变体、推荐、配色。**先读这个。**
- **[PLACEMENT.md](./PLACEMENT.md)** —— 定稿后 logo 放网页哪里（按优先级）+ Next.js 落地提示。
- **[preview.html](./preview.html)** —— 12 个概念的可视化预览（浏览器直接打开；含 favicon 小尺寸测试 + 亮/暗底 + 页首锁版 + 与网站卡框并排对比）。
- **concepts/** —— 12 个 SVG 概念稿（4 方向 × 3 变体）：

| 方向 | 变体 a | 变体 b | 变体 c |
|---|---|---|---|
| **1 · Psi Tile 麻将牌**（推荐主标记） | `d1-tile-classic` 经典 | `d1-tile-etched` 刻蚀框 | `d1-tile-emboss` 金身镂空 |
| **2 · Psi Vase 鲁宾花瓶**（徽记） | `d2-vase-badge` 圆徽 | `d2-vase-mono` 单色金 | `d2-vase-tile` 装进牌 |
| **3 · Psi Orbit 圆形轨道**（灵活维度） | `d3-orbit-dashed` 虚线轨道 | `d3-orbit-pills` 胶囊环 | `d3-orbit-min` 极简 |
| **4 · Psi Mind 脑+节点**（参考 A 暖化） | `d4-mind-badge` 圆徽脑弧 | `d4-mind-nodes` 节点极简 | `d4-mind-silhouette` 脑轮廓 |

## 30 秒结论
- **Ψ 一定保留**（硬需求）；全部用网站暖金色，不用冷蓝银。
- **主 logo = Psi Tile**（Ψ + 麻将牌）：最简、耐缩放、最贴网站卡框 → favicon / App 图标 / 页首。
- **徽记 = Psi Vase 或 Psi Orbit**：讲故事 / 灵活维度 → 加载页 / 结算分享 / 规则大图。

> SVG 为**方向概念稿**（手写代码），用于快速对齐方向；定稿后可交设计师或图生细化。
