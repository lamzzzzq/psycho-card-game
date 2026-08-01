# 对局操作排 · 按钮显隐规则（单机 = PVP）

> 真相源代码：`src/app/game/page.tsx`（单机）、`src/app/pvp/game/[code]/page.tsx`（PVP）、
> `src/components/game/DiscardControls.tsx`（两边共用的弃牌胶囊）。
> 引擎侧规则见 `src/lib/game-logic.ts` 与 [PENALTY_EDGE_CASES.md](PENALTY_EDGE_CASES.md)。
>
> **铁律：单机与 PVP 永远一模一样。** 老板反复要求过。改任何一条都要两边一起改，
> 改之前先看本文最后一节「为什么会有这份文档」。

---

## 1. 操作排里有什么，按什么顺序

两页顺序完全一致：

```
[碰完提示] → [Win 食胡] → [Self-Pong 自摸碰] → [查看 N 张 / 已查看] → [取消 · 提交棄牌]
```

- **碰完提示**（`pongDoneDiscard`「碰牌成功 — 請直接出一張手牌」）：截胡碰偷来的回合没有摸牌，
  这句解释为什么牌堆没动、为什么两个按钮不见了。手机和桌面都显示。
- **取消 · 提交棄牌**：共用组件 `DiscardControls`，圆角胶囊。桌面上圈定牌之后左侧还会带一句
  「點「提交棄牌」確認」。
- 操作排恒占 `min-h-[46px]`，按钮出现/消失时手牌不上下跳。

「先點擊一張要捨棄的牌」这句**不在操作排**，在上方回合行（`FilingProgressCard` 的 info 位），
出牌阶段且还没圈牌时替换掉「已完成 n/5」。放两处会重复，老板指出过。

---

## 2. 四个状态判据（决定按钮显不显示）

| 判据 | 代码里的名字 | 条件 | Win | Self-Pong | 查看 | 弃牌胶囊 |
|---|---|---|---|---|---|---|
| 抽牌前 | `preDraw` | 自己回合 + `phase==='drawing'` | 显示·**置灰** | 显示·**置灰** | — | — |
| 正常出牌 | `isDiscarding` | 自己回合 + `phase==='discarding'` | 显示·可点 | 显示·可点 | 显示 | 显示（未圈牌时置灰） |
| 本回合碰过 | `usedSelfPongThisTurn` | 上一条 + `selfPongUsedThisTurn` | **撤掉** | **撤掉** | 显示 | 显示 |
| 罚弃牌 | `owesPenaltyDiscard` | 食胡/自摸碰失败之后欠的那一张 | **撤掉** | **撤掉** | **撤掉** | 显示 |
| 截胡碰偷来的回合 | `postPongDiscard` | 自己回合 + `discarding` + `drawnCard===null` | **撤掉** | **撤掉** | 显示 | 显示 |

补充说明：

- **置灰而不是隐藏**，是老板定的：抽牌前两个按钮都要在位置上，只是暗的（避免摸完牌按钮才冒出来、
  整排跳位）。罚停解冻的那一回合同理——按钮显示但点不动，`title` 说明原因。
- **撤掉而不是置灰**，也是老板定的：本回合已经动过自摸碰之后，维度格子自己会变色，
  留一个灰按钮不提供任何新信息，只占地方。
- `postPongDiscard` 用 `drawnCard===null` 判断是可靠的：**正常回合一定有 `drawnCard`，
  只有碰来的那个回合是 null**（`pongCard` 成功时 `phase='discarding'` + `drawnCard=null`）。
- 「查看 N 张」在罚弃牌回合不给：那回合只剩「弃一张」一条路，给了等于白送一次查看。
- 判读窗口（别人弃牌，`claim-window`）走另一套面板，不受本表约束——单机是 `PongPanel` 组件，
  PVP 是页面自绘的（已知分歧，见第 5 节）。

---

## 3. 弃牌是两步：先圈定，再提交

1. 点手牌里的一张 → 该牌抬起高亮（`discardPickId`）。再点同一张 = 取消圈定。
2. 点「提交棄牌」才真正打出去。**双击卡牌不会直接打出**，防误触。

出牌阶段一进来，胶囊就已经在那里、两颗钮置灰不可点（老板：
"When this is shown, the box below shd be shown, but dimmed"），圈定一张牌之后才亮起。

`discardPickId` 由两个页面各自持有（`useState`），传给 `PlayerHand`（`discardPickId` /
`onDiscardPickChange`）和 `DiscardControls`。`PlayerHand` 只负责圈定，**不负责提交**。

---

## 4. 规则溯源（2026-08-01 老板 WhatsApp 反馈批）

| commit | 规则 | 老板原话 |
|---|---|---|
| `27b2bd7` | 抽牌前两个钮置灰显示；修「目标 1 张的维度永远碰不了别人的牌」 | 「抽牌前两个按钮都要在，只是暗的」 |
| `99a8f18` | 引擎：食胡/自摸碰失败**也要弃一张**；自摸碰后本回合不能再食胡 | 「撳咗 Win 掣冇出到牌，下次 draw 就多咗一张牌」 |
| `3fdab7e` | 本回合动过自摸碰 → 两个钮都撤掉 | 「归档成功之后那个灰着的自摸碰多此一举」 |
| `8e8c9bb` | 出牌阶段一进来弃牌胶囊就显示、置灰 | "When this is shown, the box below shd be shown, but dimmed" |
| `f8deb23` | 罚弃牌回合只留弃牌框 | "After wrong Win or wrong Pong, only the discard box shd be shown" |
| `210eaf7` | 截胡碰偷来的回合，两个钮都撤掉 | "After intercept pong, these two shd not be shown?" |
| `95e40b7` | 单机↔PVP 操作排彻底对齐 + 抽出 `DiscardControls` | 「PVP 和單機 都要統一」 |

**⚠️ `210eaf7` 有一个明确的代价**：藏掉截胡碰之后的 Win 钮，等于把**「碰完即胡」**这条赢法
从界面上收走了。引擎 `attemptHu` **仍然允许**它（`pongCard` 成功时特意清 `selfPongUsedThisTurn`，
注释就是为它写的），只是玩家点不到入口。这是拍板过的取舍，不是漏改；要放回来只改这一处。

---

## 5. 为什么会有这份文档

同一块 UI 曾经在两个地方各画了一份——单机在 `game/page.tsx` 的操作排自绘，PVP 靠 `PlayerHand`
自带的控制栏。结果 2026-08-01 连着三轮反馈其实都是同一个根因：**改一边漏一边**。

`95e40b7` 的处置：

- 抽出 `src/components/game/DiscardControls.tsx`，两页共用，样式行为只此一份。
- 删掉 `PlayerHand` 里那套重复实现，连同 `showDiscardControls` / `onDiscardCard` 两个失效的 prop。
- 操作排顺序、按钮尺寸（响应式）、查看 chip 门槛、Win 钮显示/启用条件、罚停横幅样式
  全部两页对齐。

**已知仍未统一**：PVP 的判读窗口是页面自绘的，单机用 `PongPanel` 组件
（0729 review 就记录在案）。重构面较大，尚未拍板。

新增按钮或改显隐条件时：先问「这个状态两页是不是长一样」，能共用组件就别复制第二份。
