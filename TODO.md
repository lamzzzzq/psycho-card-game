# TODO

> 真相源：本文件。其他散落在 commit / memory 里的「待做」请往这里收。
> 优先级标记：🟢 confirmed ｜🟡 strong signal ｜🟠 inferred（讨论后再定）

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
