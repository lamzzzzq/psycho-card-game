# 课堂压测脚本

需求与通过标准见 [`docs/LOAD_TEST_PLAN.md`](../../docs/LOAD_TEST_PLAN.md)。
Node 20+，依赖走仓库自带的 `@supabase/supabase-js`，无需额外安装；在**仓库根目录**运行。
连接配置自动读 `.env.local`（`NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`），也可用 env 覆盖。

## ⚠️ 跑之前

1. **选无人上课的时段**——T1 会故意把免费版 200 并发额度占满，真实用户会被挤掉。
2. 若项目本周无流量，先随便访问一次唤醒（free tier 7 天无流量自动 pause）。
3. 压测数据全部用 `LT-` 前缀学号，跑完用 `cleanup.mjs` 清掉。

## 测试项

```bash
# T1 连接风暴：200 并发爬坡（10 join/s），保持 5 分钟
node scripts/load-test/t1-connections.mjs --clients 200 --ramp 10 --hold 300
# 瞬时全上版（模拟"大家现在扫码进房"）+ 有意越线档
node scripts/load-test/t1-connections.mjs --clients 200 --ramp 0 --hold 120
node scripts/load-test/t1-connections.mjs --clients 220 --ramp 10 --hold 120

# T2 开场写入尖峰：200 人 120 秒内完成 测评提交+建房+进房（纯 REST，不占 realtime 额度）
node scripts/load-test/t2-write-spike.mjs --clients 200 --window 120

# T3 对局消息风暴：50 房×4 人按真实协议打 10 分钟（占 200 realtime 连接）
node scripts/load-test/t3-message-storm.mjs --rooms 50 --room-size 4 --duration 600

# T4 断线重连风暴：T3 + 每 60s 断掉 20% 非 host 成员，5-30s 后重连并 state-request
node scripts/load-test/t3-message-storm.mjs --rooms 50 --duration 600 --churn 0.2 --churn-every 60

# 延迟诊断探针：T3 数字异常时先跑这个，区分脚本问题 vs Supabase/网络抖动
node scripts/load-test/probe.mjs

# 清理（需要 service_role key，默认 dry-run）
SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/load-test/cleanup.mjs        # 先看要删什么
SUPABASE_SERVICE_ROLE_KEY=xxx node scripts/load-test/cleanup.mjs --yes  # 真删
```

## 建议执行顺序（一次完整验证 ≈ 1 小时）

1. 小规模冒烟：`t1 --clients 20 --hold 60` → `t3 --rooms 5 --duration 120`，确认脚本与项目连通；
2. T2（不占 realtime 额度，先跑）；
3. T1 梯度：120 → 180 → 200 → 220，每档记下成功率与掉线行为；
4. T3 @ 50 房 10 分钟 → 若过，再跑 T4；
5. `cleanup.mjs --yes`；
6. 对照 Dashboard（Realtime connections 曲线 / DB 负载）+ `results/` 里的 summary，
   填 LOAD_TEST_PLAN.md §3 决策表。

## 输出

每次运行落盘 `scripts/load-test/results/<test>-<时间戳>.summary.json`（含 passCriteria 布尔判定）
和同名 `.csv`（逐事件明细：ts,event,latencyMs,ok,client,room,detail），results/ 不入 git。

## 已知局限

- 所有模拟端跑在一个 Node 进程：延迟统计无时钟偏移问题，但 200+ socket 时本机也可能成瓶颈——
  若 T1 高档位大量本地超时，先怀疑本机/本网，用两台机器各跑一半对照。
- 脚本压的是 Supabase 云端配额与协议层；**200 台设备挤同一个教室 AP 只能真机测**（见计划 T5）。
- Realtime Broadcast 本身无投递保证，T3 的丢包率是量化它，不是 bug。
