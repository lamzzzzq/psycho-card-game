# 学号身份系统 · 设计与排障存档

> 2026-06-20 整理。学号(student ID) = 玩家身份 = 测评数据主键，是这套课堂工具的身份中枢。
> 本文记录：身份规则、三个客户端修复、数据语义（去重 / 覆盖 / 导出）、相关 migration、验证方法、权衡。
> 游戏对局数据见 [DATA_COLLECTION.md](DATA_COLLECTION.md)；本文专管「学号 + 测评结果」这条线。

---

## 0. 核心原则

- **学号 = 身份**：联机里 `myPlayerId` 就是学号；测评结果按学号写库。换了学号 = 换了人。
- **格式**：严格 **9 位**，大小写不敏感（`17094905g` → `17094905G`）。`normalizeStudentId`(去空白+大写) / `isValidStudentId`(len===9)，见 `src/lib/utils.ts`。
- **表 `assessment_results` 是 append-only**：anon 只能 INSERT，无 SELECT/UPDATE/DELETE（RLS）。同学号重测/手动重填各写一行，**不就地改**。

---

## 1. 客户端三个修复（2026-06-20，已上线）

### ① 旧非法学号强制重输（`src/app/pvp/page.tsx`）
- **问题**：9 位规则上线前可能存了 <9 位学号（如 `16`）。旧逻辑锁定/校验只判 `assessedStudentId` **有没有值**，导致非法值被锁定、且 `if(!assessedStudentId && …)` 一旦有值就**跳过 9 位校验** → 非法学号混进房间。
- **修**：引入 `validAssessedId = isValidStudentId(assessedStudentId)`。锁定、跳校验、`effectiveStudentId`、预填全部要求**合法**。非法旧值 → 自愈 `persistStudentId('')` 清空、强制重输；分数(`bigFiveScores`)保留。

### ② 换学号导致「房主似乎不在线」闪退
- **根因**：换学号后 `myPlayerId` 变了，旧房间的座位还挂在旧学号下 → 这客户端永远拉不到属于自己的 `gameState` → 4s 后 `slowLoad` 兜底误报「房主不在线」，且大厅 resume 横幅又把人弹回僵尸房 → 卡死。
- **修**：
  - `ensurePlayer()` 创建/加入新房前，若身份较上次变化 → `leaveAllRooms(旧id)` + `reset()`，解绑旧房关联。
  - 死局屏「僅返回大廳」补 `leaveAllRooms(player.id)`，彻底清座位，回大厅不再被弹回。

### ③ 「提交过就算有记录」（手动填分也入库）
- **问题**：PVP 大厅「手動輸入分數」原本只 `setManualScores`（本地 store），**完全不写库** → 查重查不到、研究数据也丢这批人。
- **修**：大厅手动确认时 `saveAssessmentResult(sid, {}, scores, 'manual')` 写库 + `checkStudentIdExists` 查重（已有记录→二次确认「覆盖/不提交不覆盖」）。测评页 gate 的 dupWarn 文案同步更新。

---

## 2. 数据语义：去重 / 覆盖 / 不覆盖

- **有记录 = 提交过**：不分来源——答满 50 题(`source='assessment'`) **或** 任何地方手动填分(`source='manual'`)都算。
- **再用同学号测评 → 必弹提示**：「此学号已有记录，完成即以这次为准（覆盖）；中途离开不覆盖」。
- **没完成不覆盖**：只在**完成**时才写新行（答完 50 题 / 手动确认）。半截退出不写 → 旧记录保留。
- **覆盖 = latest-wins**：表 append-only 无法就地改，所以「覆盖」靠**导出时取最新一行**实现；旧行保留作审计。
  - ⚠️ **权衡**：这与「取最早一行防冒用」是相反取向。选 latest = 别人若拿到你学号重测并完成，会覆盖你的官方结果。课堂场景接受；要更强需 PIN（暂缓）。

---

## 3. 相关 Migration（都需在 Supabase Dashboard → SQL Editor 手动跑）

| 文件 | 作用 |
|------|------|
| `0004_assessment_results_wide.sql` | 建宽表 `assessment_results`（一次测评一行：answers+scores JSON）；RLS：anon 只 INSERT |
| `0005_student_id_exists_rpc.sql` | 查重 RPC（SECURITY DEFINER 只回布尔）。**初版只数 `source='assessment'`** |
| `0009_student_id_exists_any_source.sql` | 查重去掉 source 过滤 → **assessment/manual 任一行都算「有记录」**（配合客户端③） |
| `0010_assessment_official_view.sql` | 导出视图 `assessment_results_official`：每学号取**最新一行**(=覆盖) + 覆盖历史标示；`security_invoker=true` + REVOKE anon |
| `0011_fix_official_view_privacy.sql` | 热修：0010 初版视图绕过 RLS 致 anon 可读全部明细 → 设 `security_invoker` + REVOKE（已应用 0010 的库跑这条） |

> 隐私教训：Postgres 视图默认按**属主**权限读底表，会绕过底表 RLS；Supabase 又默认给 anon 读权 → 视图必须 `security_invoker=true` 才会按调用者身份受 RLS 约束。

---

## 4. 导出怎么用（老师后台 / service_role）

```sql
-- 官方结果（每学号最新一行）+ 覆盖标示
select * from assessment_results_official order by has_overwrite_history desc, student_id;

-- 只看被覆盖过的学号（有覆盖历史）
select student_id, submission_count, overwritten_count, sources_history,
       first_submitted_at, latest_submitted_at
from assessment_results_official where has_overwrite_history;

-- 全量审计（含被覆盖的旧行）
select * from assessment_results order by student_id, submitted_at;
```

视图字段：`latest_*`(最新一行的 source/scores/answers/answered_count/submitted_at)、
`submission_count`、`has_overwrite_history`、`overwritten_count`、`first_submitted_at`、`sources_history`(按时间的来源序列)。

---

## 5. 验证 / 自检（只读）

```sql
-- 0009 是否真去掉 source 过滤（false = 已去掉、生效）
select pg_get_functiondef('public.student_id_exists(text)'::regprocedure)
       like '%source = ''assessment''%' as still_filters_source;
```

anon 侧（前端公开 key）应当：
- `assessment_results` 直读 → 0 行（RLS）。
- `assessment_results_official` 直读 → `42501 permission denied`（已 REVOKE）。
- `rpc('student_id_exists', {p_student_id})` → 布尔，正常。

（探测脚本思路：读 `.env.local` 的两个 `NEXT_PUBLIC_SUPABASE_*` 值，用 `@supabase/supabase-js` anon 客户端跑上述只读调用。**切勿**为验证而 INSERT 探测行——表 append-only、anon 删不掉，会污染研究数据。）

---

## 6. 已知权衡 / 待办

- [ ] **PIN / 强身份校验暂缓**：当前无法真正防冒用（任何人可输任意 9 位学号）。latest-wins 下他人可覆盖你的官方结果，靠 `has_overwrite_history` 事后发现。
- [ ] 查重是**软提示**（二次确认可强行继续），非硬拦——故意为之（允许本人重做）。
- [ ] `student_id_exists` 允许 anon 逐个枚举学号探知「谁提交过」（仅参与与否，非分数）。课堂可接受。
