# Logo 放哪里（网页端放置建议）

> 定稿后按优先级落地。主标记 = 方案 A（Psi Tile）；徽记 = 方案 B/C。

## 优先级 1 —— 一定要做

| 位置 | 用哪个 | 尺寸 | 说明 |
|---|---|---|---|
| **浏览器标签 favicon** | Psi Tile | 32 / 16px | 现在**没有**自定义 favicon（`src/app/icon.*` 缺失）。加 `src/app/icon.svg` 即可。 |
| **App / PWA 图标** | Psi Tile（暖沙底满版） | 192 / 512px | 加 `src/app/manifest.ts` + `apple-icon`。手机「加到主屏」时显示。 |
| **首页 `/` 页首** | Psi Tile | 高 ~36–44px | 放在「人格麻將」标题**左侧或上方**（老板原话 "next to the name"）。标记 + 文字锁版，文字不属于 logo 本体。 |

## 优先级 2 —— 强烈建议

| 位置 | 用哪个 | 说明 |
|---|---|---|
| **首屏加载 / Loading** | Psi Vase 或 Psi Orbit | 老板设想的「融入暖沙背景」的品牌一刻；Orbit 可做轨道旋转动效。 |
| **结算页 / 分享图** | Psi Vase | 截图分享时的品牌露出，故事感最强。 |
| **`/rules` 打印页页首** | Psi Tile | 现在中文版页首是空的（英文才有 "PSYCHO CARD"）。放一个小标记比英文字更通用、更好看。 |

## 优先级 3 —— 有余力再做

| 位置 | 用哪个 | 说明 |
|---|---|---|
| **PVP 房间 / 大厅角标** | Psi Tile | 房间码旁边一个小标记，强化品牌。 |
| **页尾 Footer** | Psi Tile（单色描边版） | 和「© 香港理工大學」并排。 |
| **教学页 / 空状态** | Psi Orbit | 作为装饰性水印。 |

---

## 落地代码提示（Next.js 16，本项目为魔改版，动手前先看 `AGENTS.md`）

- **favicon**：把 `brand/concepts/psi-tile.svg` 放成 `src/app/icon.svg`，Next 会自动作为 favicon。
- **页首标记**：新建 `src/components/shared/Logo.tsx` 内联 SVG（可 `currentColor` 化描边，跟随主题），首页标题旁引用。
- **manifest / App 图标**：`src/app/manifest.ts` 里配 `icons`，再加 `apple-icon.png`（512 导出）。
- **单色版**：页尾/深色场景，把 Ψ 描边改成 `--psy-ink` 或 `currentColor`，去掉牌面渐变。

> 建议先只做**优先级 1**（favicon + PWA + 页首），风险最低、露出最大；徽记等定稿后再铺。
