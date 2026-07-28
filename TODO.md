# TODO

> 真相源：本文件。其他散落在 commit / memory 里的「待做」请往这里收。
> 优先级标记：🟢 confirmed ｜🟡 strong signal ｜🟠 inferred（讨论后再定）

---

## ✅ 已完成（2026-07-29 深度 review 修复批）

> 覆盖 07-22~29 那批改动的代码 / UX / 文案三层 review。commit：02b7d4c、85f3b72、13aa8ef、bb963a5

- ✅ **中断局扩展撤销**：老板确认保留「退到只剩 1 人 → 该玩家躺赢」原规则（与 `/rules`、`tutorial.ts` 四处文案一致）。`endedByLeave` 全部删除；**`winner_player_id IS NULL` 现在只对应「房主主动退出」一种**
- ✅ **登出→同浏览器重登，报告拉不回来**：`AssessmentSync`/`HexacoSync` 的 `syncedFor` 在 studentId 变 null 时清空
- ✅ **大五漏了半截答案的防串号**：判定对齐 HEXACO（`scores || answers 非空`）
- ✅ **BGM「记忆」静默失效**：autoplay 被拦时挂一次性 pointerdown/keydown 补播
- ✅ **局末小测**：答题态补「離開/Exit」入口；随机题目移出 `useMemo`（memo 重算会中途换整套题）
- ✅ **首页英文 intro 溢出**：`lg:whitespace-nowrap` 改为只给中文（英文 124 字符在 1024px 容器必溢出）
- ✅ **自定义光标无障碍回退**：`prefers-contrast: more` 时退回系统光标
- ✅ **assessment_results 写入可伪造他人学号**（migration `0025`，已在生产执行）：`WITH CHECK` 加 `student_id = 自己 profile 的学号`。执行前三项前置核查均 0 行
- ✅ **验证码加 purpose**（migration `0026` + 三个 function，已部署）：把「两流程靠 409 才不串」的隐式前提显式化
- ✅ **edge function 不再回传后端错误详情**（4 个 function 已重新部署）
- ✅ **死代码清理**：`PongPanel` 的倒计时分支恒不执行（唯一调用点传 `autoAdvance={false}`），已删。⚠️ **PongPanel 只被单机使用，PVP 判读窗口是自绘内联的**——别再把它当成联机代码去改（b87982a 就是这么误诊的）
- ✅ **陈旧注释/文案**：pvp 三处「30s」实为 60s；`rules.ts` 配图「幾秒判讀窗口」→「約 20 秒」
- ✅ **HEXACO 计分空维度**：补 warn（原静默回退 3.0 看起来像正常分数）
- ✅ **/stats 中断判定**加 `mode==='pvp'`（防未来单机接回存档时被误标；现网 `mode='single'` 为 0 行）

### 🚫 本轮明确决定不做（别再提）

- **局末小测保持全卡池随机**，不限本局出现过的卡（⚠️ 入口文案仍写「本局心理學知識複習」/「Post-Game Psychology Review」，与实现不符，老板知悉）
- **单机判读窗口保持无限等待**：玩家不点则一直停着，AI 也不会主动碰（AI 由玩家响应后的 `resolvePongWindow()` 驱动）
- **顶号即踢保持现状**：`SessionGuard` 60s 心跳发现被顶就登出跳转，对局中途也会踢
- **换绑找回邮箱不加密码验证**

---

## ✅ 已完成（2026-06-02 大批更新）

- ✅ **罚停死锁修复**：碰/自摸碰把整手牌打光但没胡 → 不再卡死，偷得回合直接结束让位。+ `docs/PENALTY_EDGE_CASES.md`（7 大类 30+ 手测 CASE）
- ✅ **牌库按人数缩放**：4 人 80 人格+12dummy(92) / 2-3 人 60 人格+8dummy(68)；发牌护栏防「开局发光秒死」；dummy ~12% 保证轮均 ≤1。`docs/DECK_BALANCE.md`
- ✅ **数据收集收口**：stats 页迁新表（game_sessions/participants/big_five_snapshots）+ CSV 导出 + 中途退出存 winner=null 中断局。`docs/DATA_COLLECTION.md`
- ✅ **繁中 A4 规则页 `/rules`** + QR 码 + tutorial「规则 Hardcopy」按钮
- ✅ **计分统一**：纯排名（归档多者胜，同数比剩牌少），分数不再展示
- ✅ **补传护栏 24h**：超期暂存存档丢弃不补传（防旧局污染）
- ✅ **抢碰 UX**：提交锁「已提交…」+「本轮已被抢」提示
- ✅ **房间 6h 过期**：僵尸房不再卡「已在房间内」+ 自动清理
- ✅ **全站繁体中文**（OpenCC s2t，38 文件，含卡牌内容/游戏内文本）
- ✅ **README 重写** + `.env.example`
- ✅ **PVP/引擎自动化测试**：98 条（penalty-freeze / pong-empty-hand / deck-scaling / ai-smoke 等），修了 ai-smoke flaky

---

## 🟡 需要拍板才能做（等决定）

- [ ] **房主抢碰延迟优势**：现在「比快」，房主本地瞬时占便宜。方案：收集窗口 / 顺位优先 / 胡优先。未定
- [ ] **胡是否优先于碰**：现在都比快，无胡优先
- [ ] **单机也加「已被抢」提示**：目前只 PVP 做了
- [ ] **罚停口味**（PENALTY_EDGE_CASES §7）：最后一轮食胡失败垫底、加重罚停跳 2 圈，要不要调轻

## 🟡 内容替换（等真实素材，不急）

- [ ] **4 人 80 张人格牌**：20 张是占位（复用题面），替换 `generatePersonalityCards`
- [ ] **dummy 文案** + **/rules 繁中规则文案**：目前准确占位版

## 🟡 工程基础（可选）

- [ ] **自定义域名**（可选）：现用 `.vercel.app`
- [ ] **开 RLS + 服务端校验**：上线给学校前（现 anon key 直读写）
- [ ] **AGENTS.md 警告执行**：魔改 Next.js 旧 API audit

## 🟠 下一阶段功能（讨论后再定）

- [ ] 观战 / 回放 / 对局历史
- [ ] 段位 / PVP 跨房间排行榜
- [ ] Big Five 短测版（10–20 题）降门槛
- [ ] 学号↔测评服务端绑定（跨设备 + 防篡改 L1 写一次 / L2 PIN，见 memory `project_psychocardgame_identity_plan`）
- [ ] i18n（如需简繁/英文切换）

---

## 设计系统（DESIGN.md §10）

- [ ] warning / info 语义色（按需）
- [ ] Toast / Banner 统一组件规范

---

## 🔴 测试前你要做的事

- [ ] 清测试数据：`delete from game_sessions; delete from big_five_snapshots;`（+ 旧房 `delete from game_results; delete from room_players; delete from rooms;`）
- [ ] 手测 `docs/PENALTY_EDGE_CASES.md` 的罚停 CASE
- [ ] 多设备手测 PVP 抢碰（验证「已被抢」+ 房主优势实际感受）
- [ ] Supabase 建表（若新环境）：跑 `supabase/migrations/0001_game_records.sql`
