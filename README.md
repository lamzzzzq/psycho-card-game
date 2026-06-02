# 人格麻将 · PsychoCardGame

用 Big Five 五大人格测评驱动的麻将式卡牌对战。每位玩家先做测评得到 O/C/E/A/N 五维分数，游戏中要「用卡牌拼出自己的人格」——集齐全部五个维度者获胜。支持**单机**（1 人 + 3 AI）和**联机 PVP**（2–4 人，Supabase Realtime）。游戏内全部为**繁体中文**。

> ⚠️ 本项目用**魔改版 Next.js**。改代码前先读 `node_modules/next/dist/docs/` 对应章节，别凭训练数据写。详见 `AGENTS.md`。

线上：https://psycho-card-game.vercel.app （推 `main` 自动部署到 Vercel）

---

## 玩法速览

- **目标**：集齐 5 个人格维度。每个维度需要的牌数 = 你在该维度的分数（如外向 4 分 → 凑 4 张外向牌）。最先凑齐者「食胡」获胜。
- **每回合**：摸 1 张 → 出 1 张。
- **碰**：别人弃出的人格牌，若你手上同维度牌 + 这张刚好凑满该维度张数 → 碰下来归档并抢到出牌权。自己回合也能用手牌凑齐（自摸碰，每回合限 1 次）。**抢碰是「先点先得」**（first-come-first-served）。
- **食胡**：手牌能一次凑齐所有未归档维度 → 胡牌获胜。
- **失败惩罚（罚停）**：碰/胡失败 → 罚停约「一整轮 + 2 个自己的回合」，期间不能碰/胡/抢牌，且亮牌。详见 `docs/PENALTY_EDGE_CASES.md`。
- **知识牌（dummy）**：心理学小知识，不属于任何维度、出掉不触发抢牌（安全弃牌）。
- **胜负**：有人胡牌直接胜；打满约定轮数无人胡 → 按**已归档维度数**排名（多者胜），同数比**剩余手牌少**者胜。（分数不展示，纯排名。）

完整繁体中文规则见 `/rules` 页（A4 可打印 + QR 码）。

---

## 技术栈

- **Next.js（魔改版）** App Router + TypeScript
- **Tailwind** + Psy 设计系统（`DESIGN.md` / `globals.css` 令牌）
- **Zustand**（`useGameStore` 单机 / `usePvpStore` 联机 / `useAssessmentStore` / `usePlayerStore`，均 persist 到 localStorage）
- **Framer Motion** 动效
- **Supabase**（Postgres + Realtime Broadcast）：PVP 房间同步 + 课堂数据收集
- **qrcode.react** 规则页 QR

## 架构要点

- 纯函数游戏引擎 `src/lib/game-logic.ts`（draw/discard/pong/selfPong/hu/罚停/排名），单机与 PVP 共用。
- PVP 房主 = game master：本地跑完整 `rawGameState`，Supabase Realtime 按视角序列化广播（对手手牌隐藏，`pvp-serializer.ts`）。
- 牌库按人数缩放（见下）；发牌 `dealCardsVariable`（手牌 = 五维分数和 − 1，带护栏）。
- 身份：学号 + 测评分数存 localStorage（一人一台手机假设），未做服务端跨设备绑定。详见 memory `project_psychocardgame_identity_plan`。

### 牌库配置（`src/lib/card-engine.ts` · `docs/DECK_BALANCE.md`）

| 人数 | 人格牌 | dummy | 总牌库 |
|------|-------|-------|--------|
| 2–3 人 | 60 | 8 | 68 |
| 4 人 | 80 | 12 | 92 |

- dummy ~12%，保证「每回合手上 dummy 轮均 ≤ 1」。
- 4 人的 80 张里 20 张是**占位牌**（复用题面），待真实牌面文案替换 `generatePersonalityCards`。
- 发牌护栏：极端高分牌不够时削最大手牌、保抽牌堆预留，杜绝开局发光秒死。

### 数据收集（`docs/DATA_COLLECTION.md`）

PVP 对局自动写入 Supabase 3 张表：`game_sessions`（一局）/ `game_participants`（一人一局成绩，核心）/ `big_five_snapshots`（学号↔人格快照）。`/stats` 页查看 + 导出 CSV。中途退出存 `winner_player_id=null` 中断局。
> ⚠️ 上线前需在 Supabase SQL Editor 执行 `supabase/migrations/0001_game_records.sql` 建表。

---

## 本地开发

```bash
npm install
cp .env.example .env.local   # 填入 Supabase URL / anon key
npm run dev                  # 开发服务器
npm test                     # vitest（应 98/98 绿）
npm run build                # 生产构建
```

---

## 文档索引

| 文档 | 内容 |
|------|------|
| `AGENTS.md` | ⚠️ 魔改 Next.js 警告 |
| `DESIGN.md` | Psy 设计系统（色彩/字体/组件令牌） |
| `docs/DECK_BALANCE.md` | 牌库/dummy 平衡决策 + 模拟数据 |
| `docs/DATA_COLLECTION.md` | 课堂数据收集全流程 + 建表步骤 |
| `docs/PENALTY_EDGE_CASES.md` | 罚停手动测试清单（7 大类 30+ CASE） |
| `docs/EXIT_TAKEOVER_PLAN.md` | 玩家退出 + AI 接管设计 |
| `TODO.md` | 待办追踪（真相源） |
