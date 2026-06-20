# 课堂数据收集 · 全流程说明

真相源：`supabase/migrations/0001_game_records.sql`（表结构）、`src/lib/game-record.ts`（写入）、`src/app/stats/page.tsx`（查看 + 下载）。

> 本文管「**对局**数据」。学号身份、测评结果（`assessment_results`）、去重/覆盖/导出口径见 [STUDENT_ID_IDENTITY.md](STUDENT_ID_IDENTITY.md)。

---

## ⚠️ 上线前必做（否则一条数据都收不到）

1. **建表**：打开 Supabase → SQL Editor → 粘贴执行 `supabase/migrations/0001_game_records.sql`。
   它会建 3 张表：`big_five_snapshots` / `game_sessions` / `game_participants`。
   - ⚠️ 该脚本开头有 `DROP TABLE IF EXISTS`，**只在还没有真实数据时跑**；已有数据后重跑会清空。
2. **验证**：在 SQL Editor 跑 `select count(*) from game_participants;`，不报错 = 表建好了。
   或直接打开网站 `/stats` 页，不再弹"读取数据失败"提示即为成功。

> 现状：旧版 `/stats` 读的是老表 `game_results`，新版已改读上面 3 张新表。所以**必须先建表**。

---

## 1. 数据怎么收集（自动，无需手动）

- 玩家进游戏前在 `/assessment` 做 **60 题 Big Five 测评** → 得到 O/C/E/A/N 五维分数。
- 联机对局（PVP）**由房主（host）一端**负责写库。一局结束触发写入的时机：
  - **正常结束**：有人胡牌 / 打满轮数 / 最后一人留场 → `usePvpStore` 在出 winner 时调 `saveGameSession`。
  - **中途退出**：房主点「退出对局」→ 调 `persistInterruptedGame`，存成**中断局**（见 §4）。
- 单机练习局**不写库**（只有联机数据进 Supabase）。

写入内容（每局）：
- 1 行 `game_sessions`：模式、房间号、起止时间、轮数、赢家。
- 每个座位 1 行 `game_participants`：学号、五维分数快照、申报组数、剩余手牌、最终得分、名次、是否获胜、胡/碰成功失败次数。
- 每个真人 1 行 `big_five_snapshots`：学号 ↔ 这一局用的人格分数（永久快照，不被后续测评覆盖）。

容错：写库带 **5 秒超时 + localStorage 重试缓冲**——房主网络抖动不会丢数据，下次打开 PVP 大厅自动补传（`retryPendingSaves`）。

---

## 2. 收集完放哪（Supabase 3 张表）

| 表 | 一行代表 | 关键字段 |
|----|---------|---------|
| `game_sessions` | 一局 | mode, room_code, started_at, ended_at, rounds_played, **winner_player_id（null=中断/平局）** |
| `game_participants` | **一人一局**（核心查询表）| student_id, big_five_scores(JSONB), declared_count, remaining_cards, final_score, rank, is_winner, hu/pong 成功失败计数 |
| `big_five_snapshots` | 一次人格快照 | student_id, scores(JSONB), source, taken_at |

课堂分析基本只查 `game_participants`（按 `student_id` 聚合）。

---

## 3. 怎么下载

**方式一（推荐，最省事）**：打开网站 **`/stats` 页** → 右上角「**⬇ 导出 CSV**」按钮 → 下载所有真人对局记录。
- CSV 带 UTF-8 BOM，**Excel 直接打开中文不乱码**。
- 列：学号 / 房间 / 结束时间 / 模式 / 轮数 / O C E A N / 申报组数 / 剩余手牌 / 最终得分 / 名次 / 是否获胜 / 是否中断局 / 胡成功 / 胡失败 / 碰成功 / 碰失败。
- `/stats` 还有「汇总统计」（每个学号场次/胜场/均分/均申报/最佳名次）和「对局明细」（按局看每人结果）两个视图。

**方式二（Supabase 后台）**：SQL Editor 跑查询后点 Export → CSV。常用查询：
```sql
-- 每人每局一行（最常用）
select gp.student_id, gs.room_code, gs.ended_at, gs.rounds_played,
       gp.big_five_scores, gp.declared_count, gp.remaining_cards,
       gp.final_score, gp.rank, gp.is_winner,
       gp.hu_success_count, gp.hu_fail_count, gp.pong_success_count, gp.pong_fail_count
from game_participants gp
join game_sessions gs on gs.id = gp.session_id
where gp.is_ai = false
order by gs.ended_at desc;
```

---

## 4. 中途退出怎么处理

| 场景 | 是否存数据 | 怎么标记 |
|------|-----------|---------|
| 正常打完（胡/满轮/最后一人）| ✅ | `winner_player_id` = 赢家 |
| **房主点「退出对局」中途解散** | ✅（本次新增）| `winner_player_id = null` → 中断局 |
| 非房主玩家中途退 | ✅ | 该座位 `is_winner=false`、`hasLeft` 反映在最终手牌/名次；游戏继续或按最后一人结算 |
| **房主浏览器崩溃/永久关闭** | ❌ 救不了 | rawGameState 只在房主端，永久丢失 |

查询区分：
```sql
select * from game_sessions where winner_player_id is not null;          -- 完整局
select * from game_sessions where winner_player_id is null and ended_at is not null; -- 中断局
```
`/stats` 页和 CSV 都有「是否中断局」标记。

> 运维提示：告诉房主**别直接关浏览器**，要退就点「退出对局」——这样中断局也能存下。崩溃那条路救不了（要救得持续把 raw state 同步到客户端，工作量大，暂不做）。

---

## 5. 排版可读性

- `/stats` 汇总视图：按学号聚合，等宽数字对齐，胜场/胜率高亮。
- CSV：中文表头 + BOM，Excel/Numbers 直接打开；五维分数拆成 O/C/E/A/N 五列便于做统计。
- 中断局在明细和 CSV 里都明确标注，不会和正常局混淆。

---

## 已知限制 / 待办

- [ ] **建表**（§0）—— 上线前必须手动跑一次 migration。
- [ ] RLS 暂未开（沿用 anon-key 直读）。正式给学校前建议开 RLS + 匿名鉴权（migration 末尾有 TODO）。
- [ ] 房主崩溃局救不回（架构限制，已说明）。
- [ ] 单机局不入库（设计如此，课堂只看联机）。
