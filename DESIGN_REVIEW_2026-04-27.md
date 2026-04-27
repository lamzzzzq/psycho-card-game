# Design Review — 2026-04-27

> 对 5 个核心页面做了桌面（1280x800）+ 手机（390x844）双视口截图 + 控制台 + 网络检查。
> 截图存档：`/tmp/psycho-screenshots/`（10 张 PNG）
> Dev server: localhost:3001（main 分支，未提交改动 = TODO/TESTING/此文档）

## 覆盖的页面

| 页面 | URL | 桌面 | 手机 | 备注 |
|---|---|---|---|---|
| 首页 | `/` | ✅ | ✅ | hero + 3 卡 + 3 CTA + stats 链接 |
| 测评 | `/assessment` | ✅ | ✅ | Big Five 60 题 |
| 单机大厅 | `/lobby` | ✅ | ✅ | 实测时被 gate 在"请先完成测评" |
| PVP 大厅 | `/pvp` | ✅ | ✅ | 创建/加入房间表单 |
| 数据统计 | `/stats` | ✅ × 2 | ✅ × 2 | 截了"loading 中"+"loaded"两态 |

## 没截到的页面

- `/game/[code]`（单机对战）— 需先进测评 + 起对局
- `/pvp/room/[code]`（房间等待）— 需先创建房间
- `/pvp/game/[code]`（PVP 对战）— 需 2+ 浏览器协同

→ 这三页留作后续 Layer：用 vitest 写组件级 mock（提供测试用 GameState fixture 就能截）。

---

## 🔴 Critical（功能性）

### C1. Stats 页"加载统计数据..."无骨架占位
**现象**：页面打开后纯文字 "加载统计数据..." 居中显示 ~2-3 秒，整页空白。我截图的瞬间正好处在这状态，给用户的体感和"页面卡了"无异。
**截图**：`stats-desktop.png` / `stats-mobile.png`
**根因**：`/stats` 客户端 fetch 时只渲染 loading 文字，没有 skeleton。
**修法**：
- 用 Psy 设计系统的 `psy-panel` + `animate-pulse` 组件做骨架表格（保留表头 + 5 行 placeholder bar）
- 或退而求其次：loading 文字加上 spinner 旋转动画 + 改文案为"正在打开档案室…"（保持 Psy 古籍主题）

---

## 🟠 Major（UX）

### U1. Next.js dev badge "N" 出现在所有页面左下角
**现象**：所有页面左下角有圆形深色 "N" 徽标。
**截图**：所有 8 张
**根因**：Next.js 16 的 `devIndicators` — 默认在开发环境显示 build / route status。
**判断**：生产环境**不显示**，所以这只在 dev + 截图/演示时碍眼。
**修法**（如果你确实想关）：在 `next.config.ts` 加 `devIndicators: false`（或 `{ position: 'bottom-right' }` 移到不挡眼的位置）。

### U2. 手机首页：3 个 CTA 不在首屏
**现象**：手机版首页第一屏只看到 hero + 3 张卡片，**联机对战 / 单机对战 / 开始测评**三个按钮要 scroll 才能看到。
**截图**：`homepage-mobile.png`
**根因**：hero "PsychoCard" 大字 + 长描述占了 ~40% 高度，3 卡又各 ~18%。
**修法选项**：
- (A) hero 字号 mobile 上从 `~64px` 降到 `~44px`，描述截短 50%
- (B) 把 3 卡改成横向滚动 carousel
- (C) 把"联机对战"作为 sticky CTA 在 hero 下方（替代右侧"人格牌阵"装饰元素的位置）
- 推荐 (A) — 最少改动，最大收益

### U3. Stats 表格手机端列宽过窄
**现象**：手机版 stats 表格里「参 加 场 次」「胜 利 场 次」每个汉字单独成一行，垂直列宽 < 1ch。
**截图**：`stats-mobile-loaded.png`
**修法**：
- 缩短列名："参加场次" → "场次"，"胜利场次" → "胜场"
- 或卡片化：每个学号一张 `psy-tile`（学号 + 3 行数据），避免表格挤压

### U4. lobby gating 缺 escape hatch
**现象**：未做测评的用户进 `/lobby` 会被弹出「请先完成人格测评」卡，**只有"开始测评"按钮**，没有"返回首页"链接。如果用户误点了 lobby 又改主意了，必须用浏览器后退。
**截图**：`lobby-desktop.png` / `lobby-mobile.png`
**修法**：在 `开始测评` 按钮旁加一个低强调的 `← 返回首页` 文本链接

---

## 🟡 Minor（视觉一致性）

### V1. 首页"查看数据统计"链接颜色太弱
**现象**：桌面首页右下角「查看数据统计」是灰白细字，几乎和背景融为一体，只有眼睛凑近才看到。
**截图**：`homepage-desktop.png`（看右下）
**修法**：用 Psy 的 `--psy-ink-soft` 替代当前色 + 加细下划线，或者直接用 `psy-eyebrow` 类。

### V2. Stats 表格"100% / 50%"用绿色 monospace
**现象**：胜率列用了 monospace 数字字体（绿色），与整体 Psy 古籍主题（米黄 + 金属金）风格不统一。
**截图**：`stats-desktop-loaded.png`
**修法**：
- 数字字体可保留 monospace（数据感正当），但**配色换成 Psy 维度色**（比如用 E 维度的金色，或 success 语义色）
- 或保留绿色但调暗到 Psy 米黄系亮度

### V3. PVP 大厅表单密度高
**现象**：`/pvp` 桌面版上半屏挤满表单（学号 × 2 + 完整测评/手动输入 + 创建/加入 + 玩家数 + 轮数）— 信息密度过高，第一次看会有点压迫感。
**截图**：`pvp-desktop.png`
**修法**：分两步走 wizard："Step 1 玩家身份 → Step 2 房间设置"。或者把"创建/加入"做成 tabs 而不是同时显示。

---

## ✅ 设计上做得好的地方（保留）

- Psy "深夜书房" 风格执行得很到位 — 米黄字 + 深蓝底 + 金属点缀
- 字体 hierarchy 清晰（衬线大标题 + 无衬线正文 + 小写 etched eyebrow）
- 卡片"古籍封面"质感真实（边框 + 微妙渐变 + 留白）
- assessment 页第一题展示干净，5 选项 affordance 清楚
- PVP 大厅的"DUEL CHAMBER"古籍命名风格一致
- 配色克制，无任何高饱和荧光，符合 DESIGN.md §1 设计意图

---

## 修复优先级建议

| 优先级 | 项 | 估时 | 是否影响生产 |
|---|---|---|---|
| 🥇 | C1 stats 骨架 | 15 min | ✅ |
| 🥈 | U2 手机首页 CTA 上移 | 10 min | ✅ |
| 🥉 | U3 stats 手机列宽 | 10 min | ✅ |
| 4 | U4 lobby 返回链接 | 3 min | ✅ |
| 5 | V1 首页 stats 链接增强 | 3 min | ✅ |
| 6 | U1 dev badge | 2 min | ❌（仅 dev） |
| 7 | V2 stats 胜率配色 | 5 min | ✅ |
| 8 | V3 pvp 表单 wizard | 30 min | ✅ |

**建议**：先做 1-5（合计 ~40 min），是用户最先碰到的问题。6-8 可以推迟到下次 polish batch。
