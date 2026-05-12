# 玩家退出 + AI 接管设计

> 状态：单机已落地最小路径（reset → lobby）；联机 / 多人留座设计如下，待 PvP 端实施。

## 用户故事

> 4 人在一桌对局，其中 2 人点了「退出」。剩下 2 人应该能继续打到分出胜负 — 不是死局、不是强制结束。

## 现状

- `Player` 类型已加 `hasLeft?: boolean`（`src/types/index.ts:96`）
- 单机退出按钮（`src/app/game/page.tsx`）逻辑：`resetGame()` + 回 lobby。无 AI 接管 — 因为单机里只有 1 个 human，退出 = 整局结束没有继续打的意义。
- 联机模式（`src/lib/pvp-game-logic.ts`）尚未消费 `hasLeft` 字段。

## 联机版接管设计

### 触发

PvP 玩家点击「退出对局」 → 客户端发 `quit-game` event → 服务端 `markPlayerLeft(playerId)`。

### 状态变更

```ts
// 玩家被标记 hasLeft + isHuman 切到 false
player.hasLeft = true;
player.isHuman = false; // 让 AI 决策路径接手
```

`isHuman = false` 让现有 `executeAITurn` / `makeAIPongDecision` 直接接管 — 无需新增独立 takeover 路径。

### 引擎不变量

- **轮转规则不变**：`advancePlayer` 仍按 `currentIndex + 1 % playerCount` 走，离场玩家的座位**保留**，由 AI 顶替。座位不缩减，避免索引错位。
- **罚停/冻结不变**：离场玩家继承当前的 `skipNextTurn` / `frozenUntilDiscarderIndex`，AI 接手后照常自动跳过。
- **胜负判定调整**：`hasWon()` 不变。`determineWinner` 在 game-over 时**不排除** hasLeft 玩家（AI 接管照样可能赢），但 UI 需提示「你已退出，本场由 AI 接管完成」。

### 全部退出的兜底

如果**所有** human 都退出（PvP 4 人全跑）：
- 服务端检测到 `players.every(p => p.hasLeft)` → 自动 forfeit，宣告平局或最高归档数获胜
- 房间在 game-over 后保留 30s 复盘，然后销毁

### UI 影响

- 对手卡：已加「· AI 托管」标签（`OpponentHand.tsx`）
- 主操作区：退出 modal 文案区分「单机直接结束」/「联机 AI 接管」
- 退出后客户端跳到 `/pvp/results/[code]?spectator=1`，仍可观战到 game-over

### 引擎落地点

| 位置 | 改动 |
|---|---|
| `pvp-game-logic.ts` | 加 `markPlayerLeft(state, playerId)` 工具函数 |
| `room-api.ts` | 加 `quitRoom` RPC + supabase realtime 广播 |
| `usePvpStore.ts` | 加 `quitGame()` action |
| AI 决策入口 | 已 keyed by `currentPlayerIndex`，无需改 |

### 边界

- 离场玩家在自己回合**不能**主动触发 hu / pong（UI 已根据 `isHuman` 隐藏，AI 自动接管）
- 离场玩家**不能**重连同一座位（避免 AI 决策与人决策混淆）；如果允许重连，需在 reconnect 时把 `isHuman=true, hasLeft=false` 还原，并丢弃 AI 决策未提交的部分
- 服务端需对 quit event 做幂等处理 — 多次点退出只生效一次

## 单机版（可选 future work）

> 现版本：退出 = reset + 回 lobby。

如果要让单机也支持「AI 接管打到结束、玩家观战 results」：
1. `quitGame()` 改成不 reset，而是标记 human.hasLeft + isHuman=false
2. 移除 game page 退出后的 router.push，改成「跳到观战模式 / 等待 game-over → /results」
3. 在 results 页展示最终归档情况 + 「我退出，AI 接管的结果」标签

收益：玩家好奇心驱动的复盘体验。
成本：UI 多一个 spectator-view 形态。判断价值后再做。
