# 课堂压测技术需求（200 学生同时上课场景）

> 状态：需求定义 v1（2026-07-05）。脚本未实现——本文档是实现脚本前的验收契约。
> 背景：一堂课约 200 名学生同时进入 PVP（约 50 个房间 × 4 人），需要在开课前验证
> Supabase（Postgres + Realtime）扛不扛得住，并给出「要不要升 Pro」的数据依据。

---

## 0. 架构前提（决定测什么）

- 联机是 **host-as-game-master**：房主本地跑完整逻辑，经 Supabase Realtime Broadcast
  按人分发序列化状态；非房主只发 `action-request`。**DB 不跑对局逻辑**，只存房间/测评/战绩。
- 因此瓶颈排序：**① Realtime 并发连接**（free tier 峰值 200，正好踩线）→
  **② 开场 2 分钟集中写入**（测评提交 + 建房/进房）→ **③ 对局广播消息量**。
  Vercel 只承担页面加载，不在压测范围。
- 每个学生 ≈ 1 条 Realtime websocket（supabase-js 单 client 多 channel 复用一条连接：
  `pvp-{code}` broadcast+presence，等待页另有 `room-status-{roomId}` postgres_changes）。
- 已知配额（以 Supabase Dashboard → Usage 实测为准）：free = 200 并发连接 / 2M 消息每月，
  Pro($25/mo) = 500 并发 / 5M 消息。另有 **channel joins/秒** 限速——开课瞬间 200 人
  同时订阅是典型触发点，必须纳入测试。
- Free tier 的「暂停」是 **7 天无流量自动 pause**，不是被压垮；若本周首次有流量，
  开课前 10 分钟手动访问一次唤醒项目。

## 1. 测试项定义

### T1 · 连接风暴（核心，回答「200 人能不能同时在线」）
- **做法**：Node 脚本起 N 个独立 supabase-js client（每个一条真实 websocket），
  各自订阅一个 `pvp-XXXX` 频道并 `presence.track()`。
- **梯度**：N = 50 → 120 → 180 → 200 → 220（有意越线，观察拒绝行为是报错还是静默掉线）。
- **爬坡曲线**：每档跑两种 join 速率——平滑（10 join/s）和瞬时（一次性全上，模拟
  老师说"大家现在扫码进房"）。
- **观测**：subscribe 成功率、到 `SUBSCRIBED` 的耗时分布、中途 `CHANNEL_ERROR`/`TIMED_OUT`
  次数、被挤掉后自动重连是否成功；同时人工盯 Dashboard 的 Realtime connections 曲线。
- **通过标准**：200 并发下订阅成功率 ≥ 99.5%，p95 subscribe < 3s，30 分钟保持期内
  非人为断连 < 1%。

### T2 · 开场写入尖峰（回答「锁表 append-only 顶不顶得住集中提交」）
- **做法**：模拟 200 个客户端在 120 秒窗口内（泊松到达，非匀速）执行真实开场序列：
  1. `players` insert（撞 23505 后 update，即 `upsertPlayer` 两步路径）；
  2. `assessment_results` insert（50 题 answers+scores JSONB，按真实 payload 尺寸构造）；
  3. 50 个 host `createRoom`（含撞码重试）+ 150 个 `joinRoom`——**每房 3 个 join 并发进**，
     刻意打 seat_index 23505 竞态重试循环。
- **观测**：每类请求 p50/p95/p99 延迟、HTTP 错误率（区分 23505 重试与真失败）、
  joinRoom 平均重试次数；Dashboard 盯 DB CPU / connections。
- **通过标准**：p95 < 1.5s，非预期错误率 < 0.5%，无请求因 PostgREST 连接池耗尽被拒。
- **注意**：这些表是 INSERT-only RLS（SELECT 被锁），脚本**不能用读回来验证写入**；
  验证用 Dashboard 行数或本地 service_role 脚本清点。

### T3 · 对局消息风暴（回答「50 桌同时打牌广播扛不扛」）
- **做法**：50 房 × 4 client，按真实协议跑脚本化对局：host client 收 `action-request`
  → 广播 4 条 per-player `game-state-update`；peers 轮流发 draw/discard/skip-pong，
  含 claim-window 三人响应（一次出牌 ≈ 1+4 条，一个 claim 窗 ≈ 3+12 条）。
  节奏按真实手速（每 action 间隔 2-5s 随机），持续 20 分钟。
- **观测**：
  - 端到端延迟：payload 内带发送时间戳 + 自增 seq，接收端算 send→receive 延迟分布；
  - **丢包率**：Broadcast 是 at-most-once、无投递保证——用 seq 空洞统计真实丢失率；
  - 是否触发项目级 messages/秒 限速（报错码/静默丢弃都要记录）。
- **通过标准**：p95 端到端 < 800ms；丢失率 < 1% 且每次丢失后 `state-request` 重同步
  能在 3s 内恢复一致（顺带验证现有 resync 机制在压力下真的工作）。
- **消息量核算输出**：跑完给出「一堂课总消息数」外推值，对照 2M/月 判断长期够不够。

### T4 · 断线重连风暴（可选加测，验证现有兜底在压力下的表现）
- 在 T3 稳态中随机 kill 20% client 的 socket，5–30s 后重连：验证 presence leave/join
  风暴、3 分钟宽限逻辑、`state-request` 补状态在并发下不雪崩（200 人里 40 人同时重连
  → 各 host 同时收到多个 state-request）。
- 通过标准：重连后 5s 内拿回正确个人视角状态，成功率 ≥ 99%。

### T5 · 课室 WiFi 现场清单（脚本测不了的部分，人工流程）
- **明确局限**：headless 脚本（哪怕在教室里跑）只能压 Supabase 云端配额与协议层；
  **200 台设备对一个 AP 的无线关联数、信道竞争，只能真机测**。这是朋友直觉里
  「係個間房 wifi test」的真正含义，也是最常见的现场故障点，且不是代码能修的。
- 现场流程（开课前一周彩排）：
  1. 讲台机在教室 WiFi 下跑 T1@200 + T3@10 房（测 AP 上行 + 云端叠加）；
  2. 找 10–20 台真机（同学手机）连同一 AP 跑一局，记录订阅耗时与卡顿；
  3. 向 IT 确认该教室 AP 的并发关联上限与是否有 captive portal / UDP 限制；
  4. 兜底预案书面化：现有 refresh-recovery/auto-rejoin 为第一道；WiFi 崩了切
     手机流量为第二道；单机模式（1人+3AI）为最终 fallback。

## 2. 脚本工程需求

- **位置**：`scripts/load-test/`，Node 20+，依赖仅 `@supabase/supabase-js@2`；
  不引入压测框架（k6/artillery 模拟不了 supabase realtime 协议，自写最直接）。
- **一个 client = 一个 `createClient` 实例**（独立 websocket）。200 socket 单机可跑；
  脚本需支持 `--offset/--count` 分片，必要时两台机器各跑一半排除本机瓶颈。
- **配置走 env**：`SUPABASE_URL`、`SUPABASE_ANON_KEY`（正常流量一律 anon key + 现行 RLS，
  和真实学生一致）；清理脚本单独用本地 `SERVICE_ROLE_KEY`，**key 不写死、不入 git**。
- **CLI 参数**：`--test t1|t2|t3|t4`、`--clients`、`--rooms`、`--ramp`、`--duration`。
- **输出**：stdout 实时进度 + 结束时 JSON 摘要（各指标分位数）+ CSV 明细
  （`ts,client,event,latency_ms,error`），存 `scripts/load-test/results/`（gitignore）。
- **数据隔离与清理**：测试学号统一前缀 `LT-`（如 `LT-0042`），分析课堂数据时按前缀过滤；
  跑完用 service_role 清理脚本删 `LT-` 数据与测试房间。**禁止**在正式课堂数据入库后
  的同一天跑 T2（避免污染分析窗口）。
- **不改产品代码**；协议 payload 结构从 `src/types/pvp.ts` 引用/复制，字段对齐真实客户端。

## 3. 决策输出（跑完必须能回答）

| 问题 | 依据 |
|---|---|
| free tier 200 并发到底稳不稳 | T1 在 180/200/220 的成功率与掉线行为 |
| 要不要升 Supabase Pro（$25/mo，500 并发 + 5M 消息） | T1 越线行为 + T3 消息外推；**预判：要升**，free 正好踩天花板没有余量 |
| 要不要升 Vercel | 不用（对局流量不经 Vercel），除非页面加载本身出问题 |
| 消息延迟课堂上可感知吗 | T3 的 p95/p99 + 丢包补偿耗时 |
| 开课日 runbook | 提前唤醒项目、升级窗口（只升当月）、WiFi 兜底三道防线 |

## 4. 风险与注意

- **不要在别人上课时压生产项目**：Supabase 项目是单一共享实例，压测选无人使用时段。
- T1 故意超到 220 时可能把并发额度占满，若此时有真实用户会被挤掉——压测前广播周知。
- Realtime Broadcast 无投递保证是**架构事实**，压测只量化它；丢包恢复依赖
  host `state-request` 补发，这条路径本身要在 T4 里被覆盖。
- 指标阈值（800ms/1.5s 等）是课堂体验的工程预设，第一轮跑完可以校准，但**先定死
  再测**，避免"测完再定标准"的自我安慰。
