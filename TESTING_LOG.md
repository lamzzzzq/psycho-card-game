# 单元测试搭建过程记录

> 与 `TESTING_PLAN.md` 对照阅读。这份是"实际执行了什么 + 遇到什么 + 怎么决策"的现场笔记。
> 时间：2026-04-27，耗时 ~15 分钟（含 plan + 写 + debug）。

---

## 步骤总览

| 阶段 | 命令 / 动作 | 结果 |
|---|---|---|
| 1 | `npm install -D vitest @vitest/coverage-v8 vite-tsconfig-paths` | 装了 46 个包，29s |
| 2 | 写 `vitest.config.ts` + `package.json scripts` | 三个 npm script：`test` / `test:watch` / `test:coverage` |
| 3 | 写 `src/test/fixtures.ts`（共享测试数据 factory）| 6 个 factory 函数 + 1 个 reset |
| 4 | 写 `src/lib/__tests__/game-logic.test.ts` | 24 tests |
| 5 | 第一次跑 `npm test` | 19 ✅ + 2 ❌ — 见 Discovery 1 |
| 6 | 修测试 → 反映源码真实行为 | 24 ✅ |
| 7 | 写 `src/lib/__tests__/pvp-serializer.test.ts` | 13 tests |
| 8 | 写 `src/lib/__tests__/pvp-game-logic.test.ts` | 11 tests |
| 9 | 跑全套 | 47 ✅ + 1 ❌ — 见 Discovery 2 |
| 10 | 修测试 → 改用 3 玩家场景 | **48 ✅ 全 pass** |

---

## 关键发现

### Discovery 1 — `game-logic.ts` 没有 phase 守卫

**第一次失败的两个 case**：
- `drawCard` 在 `phase != 'drawing'` 时**没有** noop，它直接执行
- `discardCard` 在 `phase != 'discarding'` 时也**没有** noop

**真相**：phase 守卫在 `pvp-game-logic.ts` 的 `applyPvpAction` 里：
```ts
if (action.type === 'pong' && !inClaimWindow) return state;
if (action.type === 'skip-pong' && !inClaimWindow) return state;
```

**判断**：这是**有意的设计**，不是 bug：
- `game-logic` 是单机内部 API，调用方（store）保证只在合法 phase 调用
- `pvp-game-logic` 是 PVP **信任边界**，任何来自远端的 action 都要先验证

**对测试的影响**：删掉了"假定有守卫"的 2 个 case，改成测真实行为：
- `drawCard` 测：消耗 drawPile / log action / 空牌堆触发 game-over / 弃牌堆 reshuffle
- `discardCard` 测：识别 cardId 不存在的 noop / 移除手牌 / 触发 claim-window

**给后续维护者**：如果有一天想给 `game-logic` 也加守卫，先来读这个 LOG。

---

### Discovery 2 — 2 玩家时 skip-pong 立刻关闭 claim-window

**失败的 case**：`pvp-game-logic.test.ts > skip-pong inside claim-window from non-current player records response`

**直接原因**：测试用了 2 玩家场景。当只有 uuid-a（出牌者）和 uuid-b 时，eligible claimer 只有 uuid-b。uuid-b skip 后 → `allClaimersResponded` → true → `finalizeClaimWindow` → 清空 `claimResponses` 并 advance turn。

所以 `result.claimResponses` 是 `[]`，不是 `['uuid-b']`。

**修法**：改用 3 玩家场景（uuid-a 出牌，uuid-b skip，uuid-c 还没响应），claim window 保持开启，能看到 `claimResponses = ['uuid-b']`。

**学习点**：写测试前要想清楚**前置条件**。"skip 一次"和"skip 后 window 还开着"是两个不同的 invariant，2 玩家场景把它们耦合了。

---

## 最终交付清单

```
PsychoCardGame/
├── package.json                              ← 加 3 个 test scripts
├── vitest.config.ts                          ← 新增
├── src/
│   ├── test/
│   │   └── fixtures.ts                       ← 新增（test factories）
│   └── lib/
│       └── __tests__/                        ← 新增目录
│           ├── game-logic.test.ts            ← 24 tests
│           ├── pvp-game-logic.test.ts        ← 11 tests
│           └── pvp-serializer.test.ts        ← 13 tests
└── TESTING_PLAN.md / TESTING_LOG.md          ← 文档
```

---

## 测试覆盖快照（48 tests）

### `game-logic.test.ts` (24)
| 函数 | tests | 说明 |
|---|---|---|
| `initializeGame` | 5 | 玩家数、phase、Big Five、手牌、初始空字段 |
| `hasWon` | 3 | 0 维度 / 部分 / 全 5 维度 |
| `getDeclaredDimensions` | 2 | 空玩家 / 去重 |
| `getPlayerScore` | 2 | 0 分 / 正分聚合 |
| `getRankings` | 2 | 倒序 / 不丢人 |
| `drawCard` | 4 | 正常 / 日志 / 空堆 game-over / 弃牌堆 reshuffle |
| `discardCard` | 3 | 非法 cardId / 移除手牌 / claim-window 触发 |
| `skipPong` | 1 | 累加 claimResponses |
| `skipPenalizedPlayers` | 2 | 无人受罚 / 跳过受罚玩家 |

### `pvp-serializer.test.ts` (13) ⭐ 安全边界
| 类别 | tests | 说明 |
|---|---|---|
| 视角隔离 | 5 | 自己看自己 / 看对手隐藏 / handCount 还在 / null 全隐藏 / `__all__` 全可见 |
| drawnCard 可见性 | 3 | 非当前玩家看不到 / 当前玩家看到 / `__all__` 看到 |
| 惩罚揭示 | 2 | hu-fail 全手牌 / pong-fail 仅尝试牌 |
| 透传字段 | 3 | phase/round/winner / drawPileCount 不暴露牌内容 / totalRounds |

### `pvp-game-logic.test.ts` (11) ⭐ 信任边界
| 类别 | tests | 说明 |
|---|---|---|
| `initializePvpGame` | 4 | 玩家数 / Big Five 兜底 / Big Five 透传 / settings 透传 |
| 安全守卫 | 5 | 非当前玩家 draw/discard 拒绝 / 非 claim-window pong/skip-pong 拒绝 / 已响应锁定 |
| 正常路径 | 2 | 当前玩家 draw 推进 / 非当前玩家 skip-pong 记响应 |

---

## 运行命令速查

```bash
npm test                # CI 模式：跑一次，输出结果，退出
npm run test:watch      # 开发模式：监听文件变化自动重跑
npm run test:coverage   # 带覆盖率报告（v8 provider）
```

---

## 已知 noise（可后续清理）

- vitest 启动时打印一行 deprecation：
  > The plugin "vite-tsconfig-paths" is detected. Vite now supports tsconfig paths resolution natively via the resolve.tsconfigPaths option. You can remove the plugin and set resolve.tsconfigPaths: true in your Vite config instead.

  **后续优化**：把 `vite-tsconfig-paths` 从依赖里去掉，`vitest.config.ts` 改成 `test: { ..., resolve: { tsconfigPaths: true } }`。**当前不影响功能**，留作后续 cleanup。

---

## 下一步建议（Layer 2 / Layer 3）

按 `TESTING_PLAN.md §7` 路线图：

**Layer 2（短期，按需补）** — 状态机回归测试
- 每修一个 PVP bug，加一个 fail-first test，再修。
- 现有 commit 有几条候选（`fix(pvp): pong threshold derives from target`、`auto-skip penalized players after turn advance` 等），可逐个补。

**Layer 3（中期）** — AI 自玩 smoke test
- 写 `scripts/ai-smoke.ts`，用 `ai-engine.ts` 驱动 N 局单机
- 检查：每局合法收尾 / 无死锁 / 分数合理
- 这条建议用 `tsx` 跑，不进 vitest（因为是端到端 smoke，时间长，不适合每次 CI）

**Layer 3.5 / 4** — PVP 集成测试 + E2E：等 Layer 1+2+3 稳定后再上。

---

## 给项目维护者的"自学路径"

1. **先读** `TESTING_PLAN.md`：了解为什么这样测、不测什么、未来怎么扩展
2. **读 1 个测试文件**：建议 `pvp-serializer.test.ts`（最体现"测承诺不测实现"的精神）
3. **跑 watch 模式**：`npm run test:watch` → 改一行 fixture / 源码看测试反应，立刻能体感
4. **加一个新 test**：找 `TESTING_PLAN.md §3` 表里**还没覆盖**的角落（比如 `attemptHu` 只是 smoke，可以加合法 hu / 非法 hu / hu-fail 罚停 等更多 case）
