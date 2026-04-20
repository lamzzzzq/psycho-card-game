# PsychoCardGame · 设计系统

> 设计语言代号：**Psy（深夜书房 / 心理学手稿）**
> 目标：营造一种「在昏黄台灯下翻开心理学典籍 + 现代游戏感」的氛围。
> 真相源：`src/app/globals.css`（设计令牌） + `src/components/shared/PsyOverlayPanel.tsx`（蒙层规范）。
> 修改本文档前请先同步 CSS 变量；CSS 与 DESIGN.md 必须始终一致。

---

## 1. 设计意图

| 维度 | 关键词 |
|------|--------|
| 氛围 | 深夜、内省、典籍、低饱和、温暖金属点缀 |
| 节奏 | 安静的留白 + 有质感的高光 + 克制的动效 |
| 反对 | 高饱和荧光、扁平贴纸感、卡通圆润、霓虹科幻 |
| 借鉴 | 古籍封面、皮革封套、铜版印刷、深色 IDE |

> 一切元素先问一句：**这玩意能不能想象成一本旧书或皮包上的金属饰件？** 不行就重做。

---

## 2. 色彩令牌

所有颜色都通过 `var(--psy-*)` 引用，**禁止硬编码 hex / Tailwind 灰阶**。

### 2.1 基础（背景与表面）
| Token | 值 | 用途 |
|-------|----|------|
| `--psy-bg` | `#07111b` | 最底层背景（黑底偏蓝） |
| `--psy-bg-soft` | `#0f1c28` | 区块底色，比 bg 稍亮 |
| `--psy-surface` | `rgba(13,24,36,0.78)` | 一级面板（玻璃） |
| `--psy-surface-strong` | `rgba(15,27,40,0.94)` | 强调面板（更不透明） |
| `--psy-card` | `rgba(20,31,46,0.92)` | 卡牌正面底色 |
| `--psy-card-2` | `rgba(24,39,56,0.92)` | 卡牌渐变第二色 |

### 2.2 文字
| Token | 值 | 用途 |
|-------|----|------|
| `--psy-ink` | `#ecdfc8` | 主要正文 / 标题（米黄） |
| `--psy-ink-soft` | `#bda988` | 次要文字 |
| `--psy-muted` | `#8c7c66` | 提示 / 占位 / 元信息 |

### 2.3 边框与强调
| Token | 值 | 用途 |
|-------|----|------|
| `--psy-border` | `rgba(179,141,92,0.34)` | 默认描边（铜金） |
| `--psy-border-strong` | `rgba(207,167,112,0.56)` | hover / 高亮描边 |
| `--psy-accent` | `#c89b5d` | 标志色（铜金） |
| `--psy-accent-soft` | `rgba(200,155,93,0.16)` | accent 软化背景 |

### 2.4 阴影
| Token | 值 | 用途 |
|-------|----|------|
| `--psy-shadow` | `0 20px 60px rgba(0,0,0,0.34)` | 浮层默认阴影 |

### 2.5 维度色（Big Five）
来自 `src/data/dimensions.ts`，由 `meta.colorHex` 提供。**勿混入主色板**——它们只用于标识维度（标签、角条、归档色块）。

> 透明度约定：`+'26'` ≈ 边框、`+'10'` ≈ 浅底、`+'0d'` ≈ 极浅底。

---

## 3. 字体

| 变量 | 字体 | 场景 |
|------|------|------|
| `--font-geist-sans` | Geist | 默认 UI / 数字 / 英文 |
| `--font-geist-mono` | Geist Mono | 卡牌编号、调试 |
| `--font-serif-cn` | Noto Serif SC（400/500/600/700） | 标题、典籍感强调（用 `.psy-serif` 套用） |

排版准则：
- **标题/卡牌名**：`.psy-serif`，体现书卷感。
- **正文**：sans，行高 1.5，字间距默认。
- **数字/计数**：等宽更佳，必要时用 `font-variant-numeric: tabular-nums`。
- 中文字体不走 `font-bold`，改用 `font-weight: 500`，避免假粗。

---

## 4. 圆角与间距

### 4.1 圆角阶梯
| 用途 | 值 |
|------|----|
| 标签 / pill / 按钮 | `999px`（全圆） |
| 小卡片 / 输入框 | `0.9rem` |
| 内容卡块 | `1.2rem` |
| 大面板 / Modal | `1.6rem` |

### 4.2 间距
沿用 Tailwind 默认 4px 网格。常用：
- 组件内部：`gap-1.5 / gap-2 / gap-3`
- 区块之间：`space-y-4 / gap-4`
- 页面外边距：`px-4` 移动 / `px-6` 桌面

---

## 5. 组件令牌（CSS 类）

### `.psy-panel`
玻璃面板基底：渐变 + 铜金描边 + 阴影 + `backdrop-filter: blur(16px)`。
**所有浮层、卡片、Modal 都从这里起步。**

### `.psy-etched`
内嵌雕刻线：在 `psy-panel` 内侧 8px 处加一条 12% 透明的米黄边框，模拟典籍/相框的双层边。
**用于强调"这是一件被装裱的东西"——卡牌、Modal、归档区块。**

### `.psy-serif`
切换到 Noto Serif SC，专给标题与卡牌名。

### `.psy-btn`（+ 修饰符）
| 类 | 用途 |
|----|------|
| `.psy-btn` | 默认按钮：圆角胶囊 + 铜金描边 + 渐变深底 |
| `.psy-btn-ghost` | 透明底（`white/0.025`），用于次级动作 |
| `.psy-btn-accent` | 铜金渐变实底，用于主 CTA |
| `.psy-btn-danger` | 红铜渐变，用于销毁/弃牌等危险操作 |

交互规则：
- hover 上浮 1px + 描边变强
- disabled 透明度 0.52，无 transform
- 过渡时长统一 **140ms ease**

### `.psy-scroll`
深棕铜金滚动条（兼容 webkit + Firefox），用在所有可滚动容器。

### `<PsyOverlayPanel>`
所有蒙层（centered modal / bottom sheet）的唯一入口，封装：
- Portal 到 `document.body`
- 背景蒙层（`bg-black/65` 或 `/55`）+ `backdrop-blur-sm`
- spring 入场（centered 用 scale，sheet 用 translateY）
- 顶部标题栏 + 关闭按钮
- ESC 键关闭

变体：
- `variant="centered"`：z 82，最大宽 3xl，桌面用
- `variant="bottom-sheet"`：z 90，`hideAbove="sm"`，仅移动端

---

## 6. 背景与材质

`<body>` 由三层叠加：
1. 顶部柔和蓝色径向光（高光）
2. 左上角铜金径向光（暖色点缀）
3. 主体深蓝渐变（`#0b1724 → #050b12`）

`body::before` 叠一层垂直 55px 周期的微纹理（≤1.2% 白），模拟纸纤维。
**禁止直接覆盖整个背景的纯色——任何 wrapper 都应让底色透出来或用 `psy-panel`。**

---

## 7. 动效

| 场景 | 时长 / 缓动 |
|------|------------|
| 按钮 hover / 颜色 / 阴影 | 140ms ease |
| Modal/Sheet 入场 | spring `stiffness: 320, damping: 26~28` |
| 蒙层 fade | 150ms linear |
| 卡牌翻面（如有） | 220–280ms ease-out |
| AI 思考延迟 | 280ms（手感节奏，见 `src/app/game/page.tsx`） |

原则：
- 一次只动一个量（要么位移要么缩放，避免堆叠）
- 不超 320ms（再长就拖沓）
- 移动端禁止视差、禁止 hover-only 反馈

---

## 8. 选区与可达性

- `::selection` 统一为铜金底（`rgba(200,155,93,0.28)`）
- 焦点态：建议追加 `outline: 2px solid var(--psy-accent); outline-offset: 2px`（**待补**）
- 文字最低对比度：`--psy-muted` on `--psy-bg` 实测约 4.6:1，达标 AA。`--psy-muted` 不要用于按钮主文。

---

## 9. 维护规则（写代码前必读）

1. **禁止硬编码颜色**——所有颜色走 `var(--psy-*)` 或维度色。
2. **禁止裸用 Tailwind `bg-gray-*` / `border-gray-*`**——这些是 reset，不是设计。
3. **新蒙层必走 `<PsyOverlayPanel>`**——不要再写第三个 portal+motion 组合。
4. **新组件先想能否复用 `.psy-panel` / `.psy-btn`**——能复用就别自创。
5. **改令牌请同步本文 §2 与 globals.css**，并在 commit message 注明。
6. **维度色不进主色板**，保持 5 维独立可视。

---

## 10. 待补 / 未决

- [ ] 焦点态视觉规范（键盘导航的 outline）
- [ ] 状态色（success / warning / info）尚无独立令牌，目前借用 accent + danger
- [ ] Toast / Banner 尚未规范
- [ ] 暗色为唯一主题；浅色模式暂不计划
