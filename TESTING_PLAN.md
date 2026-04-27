# 单元测试方案 — Layer 1

> 这份是"为什么这样测"的说明书，新人读完应该能自己加测试。
> 实际执行过程见 `TESTING_LOG.md`。

---

## 1. 选 vitest，不选 jest

**vitest** 在 2026 是 Next.js 项目的事实标准，理由：

| 维度 | vitest | jest |
|---|---|---|
| 启动速度 | 秒级（用 esbuild） | 慢（要先 babel transform） |
| ESM / TS 支持 | 原生 | 需配 babel-jest / ts-jest |
| 与 Vite/Turbopack 同源 | 是 | 否 |
| API 兼容 | 99% jest 兼容 | 标准 |
| Watch mode | 即时 | 较慢 |

Next.js 16 + React 19 + Turbopack 的组合，vitest 是最少摩擦的选择。

---

## 2. 测什么 vs 不测什么

### ✅ 测（Layer 1 范围）
1. **`src/lib/game-logic.ts`** — 单机核心，11 个 export，全是纯函数
2. **`src/lib/pvp-game-logic.ts`** — PVP wrapper，2 个 export
3. **`src/lib/pvp-serializer.ts`** — 视角序列化（关键安全函数：对手手牌不能泄漏）
4. **`src/lib/scoring.ts`** — 计分相关
5. **`src/lib/card-engine.ts`** — 牌堆构造与发牌

### ❌ 不测（Layer 1 范围外）
- React 组件渲染（这是 Layer 4 的活，要 `@testing-library/react` + `jsdom`，先不开）
- Supabase 调用（`room-api.ts` — 需 mock，留 Layer 2/3）
- `usePvpStore.ts` — Zustand 状态机 + Realtime broadcast，复杂度高，留 Layer 3
- AI engine（`ai-engine.ts` — 用 Layer 3 的 AI 自玩 smoke test 反向验证）
- E2E（playwright，留 Layer 4）

**为什么这样划界**：
> 70/30 法则：**70% 的 bug 藏在纯函数里**（边界条件、状态转换），但纯函数是**最容易写测试的**。先把这一层 100% 覆盖，性价比极高。React 组件、副作用、网络层留到后面。

---

## 3. 覆盖目标

### `game-logic.ts`（最关键）
| 函数 | 测试关注点 |
|---|---|
| `initializeGame` | 玩家数 / 难度 / 牌堆数量 / 初始 phase |
| `skipPenalizedPlayers` | 跳过被罚的玩家、currentPlayerIndex 推进 |
| `hasWon` | 已申报全部 5 维度 → true；缺一个 → false |
| `getDeclaredDimensions` | 已申报 set 准确性 |
| `attemptHu` | 合法胡 → winner 设置；非法胡 → state 不变 |
| `drawCard` | phase 转换、drawnCard 设置、空牌堆分支 |
| `discardCard` | phase 转换、currentPlayerIndex 推进、claim-window 触发 |
| `pongCard` | 维度合法性、手牌足够、状态正确转换、抢牌生效（"pong success steals turn"） |
| `skipPong` | claimResponses 累加、所有人 skip → claim window 关闭 |
| `getPlayerScore` | 已申报维度的分数累加 |
| `getRankings` | 排名稳定性 + tie-break |

### `pvp-game-logic.ts`
| 函数 | 测试关注点 |
|---|---|
| `initializePvpGame` | 玩家映射 / BigFive 缺失时 randomBigFive 兜底 / 全员 isHuman / 牌堆 |
| `applyPvpAction` | 6 种 action × 各种 phase 组合 → 行为正确 |
| `applyPvpAction` 安全性 | 非当前玩家不能 draw/discard / 已响应玩家不能再 pong |

### `pvp-serializer.ts`
| 关注点 | 测试 |
|---|---|
| 视角隔离 | A 看 B 的手牌应是 `null` 或脱敏，不能泄漏明牌 |
| 自己看自己 | 完整可见 |
| 已申报牌 | 全员可见 |

---

## 4. 项目结构

```
PsychoCardGame/
├── src/lib/                      # 被测代码
│   ├── game-logic.ts
│   ├── pvp-game-logic.ts
│   └── pvp-serializer.ts
├── src/lib/__tests__/            # 测试文件 (新增)
│   ├── game-logic.test.ts
│   ├── pvp-game-logic.test.ts
│   └── pvp-serializer.test.ts
├── src/test/                     # 测试工具 (新增)
│   └── fixtures.ts               # 共享测试数据：玩家、初始 GameState
├── vitest.config.ts              # 配置 (新增)
└── package.json                  # 加 test scripts
```

**为什么用 `__tests__/` 而不是 `*.test.ts` 同目录**：
- 同目录散布在 lib/ 里会和源码混在一起，找东西难
- `__tests__/` 是 jest/vitest 的约定，符合默认 `include` glob
- 未来 lib 多起来时，按子目录的 `__tests__/` 组织更好

**为什么有 `src/test/fixtures.ts`**：
- 多个 test 文件都要构造 GameState、玩家、牌等
- 集中在 fixtures，避免每个 test 文件 copy-paste 100 行 setup
- 修改 fixture 一处，所有 test 自动跟上

---

## 5. 运行方式

```bash
npm test           # 跑一次
npm test -- --watch # 监听模式（开发时用）
npm test -- --ui   # 浏览器 UI（看覆盖率热力图）
npm test -- --coverage  # 输出覆盖率报告
```

---

## 6. 验收标准（Layer 1 完成的定义）

- [ ] `npm test` 命令能跑
- [ ] `game-logic.ts` 11 个 export 至少覆盖核心路径（行覆盖率 ≥ 80%）
- [ ] `pvp-game-logic.ts` 2 个 export 各 action 路径全覆盖
- [ ] `pvp-serializer.ts` 视角隔离测试 pass（这是数据安全测试，必须 pass）
- [ ] 总测试数 ≥ 30
- [ ] 写一份 `TESTING_LOG.md` 记录过程

---

## 7. 后续 Layer 路线图

| Layer | 范围 | 工具 | 时机 |
|---|---|---|---|
| 1 | 纯函数单元测试 | vitest | **现在做** |
| 2 | 状态机回归测试 | vitest（同框架） | Layer 1 稳定后，每修一个 bug 就加一个回归 test |
| 3 | AI 自玩 smoke | tsx 脚本 + ai-engine | Layer 1+2 稳定后 |
| 3.5 | PVP 集成测试 | vitest + Supabase Realtime mock | Layer 3 稳定后 |
| 4 | E2E | playwright | 上线前 |

---

## 8. 学习重点（给项目维护者）

如果你之前没写过测试，**重点掌握 3 件事**：

1. **AAA pattern**（Arrange-Act-Assert）— 每个 test 三段式：
   - Arrange：准备数据
   - Act：执行被测函数
   - Assert：检查结果

2. **fixtures vs factories** — 重复构造的对象，要么放 fixtures（常量），要么写 factory 函数（可参数化）

3. **测试不是测试代码本身，而是测试代码的"承诺"**
   - 烂测试：直接复制实现进 expect
   - 好测试：声明"输入 A 应该得到 B"，不关心实现细节

读完 `src/lib/__tests__/game-logic.test.ts` 就能看懂这 3 点的应用。
