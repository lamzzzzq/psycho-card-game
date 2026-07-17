# Logo 放哪里（网页端放置建议）

> **定稿后**再按优先级落地；目前不动网站。主标记 = 方向1（Psi Tile）；徽记 = 方向2/3。

## 优先级 1 —— 一定要做

| 位置 | 用哪个 | 尺寸 | 说明 |
|---|---|---|---|
| **浏览器标签 favicon** | Psi Tile | 32 / 16px | 现在**没有**自定义 favicon（`src/app/icon.*` 缺失）。加 `src/app/icon.svg` 即可。 |
| **App / PWA 图标** | Psi Tile（暖沙底满版） | 192 / 512px | 加 `src/app/manifest.ts` + `apple-icon`。手机「加到主屏」时显示。 |
| **首页 `/` 页首** | Psi Tile | 高 ~36–44px | 放在「人格麻將」标题**左侧或上方**（标记 + 文字锁版，文字不属于 logo 本体）。 |

## 优先级 2 —— 强烈建议

| 位置 | 用哪个 | 说明 |
|---|---|---|
| **首屏加载 / Loading** | Psi Vase 或 Psi Orbit | 品牌一刻；Orbit 可做轨道旋转动效。 |
| **结算页 / 分享图** | Psi Vase | 截图分享时的品牌露出，故事感最强。 |
| **`/rules` 打印页页首** | Psi Tile | 现在中文版页首左上角是纯文字，可加一个小标记点缀。 |

## 优先级 3 —— 有余力再做

| 位置 | 用哪个 | 说明 |
|---|---|---|
| **PVP 房间 / 大厅角标** | Psi Tile | 房间码旁一个小标记。 |
| **页尾 Footer** | Psi Tile（单色描边版 `d1-tile-emboss` 思路） | 和「© 香港理工大學」并排。 |
| **教学页 / 空状态** | Psi Orbit | 装饰性水印。 |

---

## 落地代码提示（Next.js 16，本项目为魔改版，动手前先看 `AGENTS.md`）

- **favicon**：把选定的 tile SVG 放成 `src/app/icon.svg`，Next 会自动作为 favicon。
- **页首标记**：新建 `src/components/shared/Logo.tsx` 内联 SVG（描边可 `currentColor` 化跟随主题），首页标题旁引用。
- **manifest / App 图标**：`src/app/manifest.ts` 配 `icons`，加 `apple-icon.png`（512 导出）。
- **单色版**：页尾/深色场景，把 Ψ 描边改成 `--psy-ink` 或 `currentColor`，去掉牌面渐变。

> 建议定稿后先只做**优先级 1**（favicon + PWA + 页首），风险最低、露出最大；徽记再铺。
