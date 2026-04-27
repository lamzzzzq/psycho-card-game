# TODO

> 真相源：本文件 + `DESIGN.md §10`。其他散落在 commit / memory 里的「待做」请往这里收。
> 优先级标记：🟢 confirmed（项目内有清单）｜🟡 strong signal（缺失或 commit 暗示）｜🟠 inferred（讨论后再定）

---

## 🟢 A. 设计系统（DESIGN.md §10）

- [ ] **warning / info 语义色** — 标注「尚未需要」，按需补
- [ ] **Toast / Banner 规范** — 当前没有统一组件
- [x] ~~focus 视觉规范~~（§8）
- [x] ~~success / danger 语义色~~（§2.4）
- [x] ~~未主题化页面迁移~~（pvp/page.tsx、pvp/room、stats）

---

## 🟡 B. 工程基础与体验打磨

### B1. 上线相关
- [x] ~~部署到 Vercel~~ — 已部署，production = https://psycho-card-game.vercel.app（推 main 自动 deploy；最近 deploy 7 天前）
- [ ] **README 重写** — 现在还是 `create-next-app` 默认模板，缺项目介绍 / 玩法说明 / 截图 / 部署指引
- [ ] **环境变量文档** — `.env.local` 里有 Supabase URL/key，需要 `.env.example` 让协作者上手
- [ ] **自定义域名**（可选）— 现在用 `.vercel.app`，要不要绑个真域名

### B2. 健壮性
- [ ] **PVP 自动化测试** — 0 个测试文件；状态机 + 多人逻辑没测试很危险。优先覆盖：
  - `pvp-game-logic.ts` 的 `applyPvpAction` 各 action 路径
  - `pvp-serializer.ts` 的视角序列化（对手手牌确实隐藏）
  - claim-window / pong threshold / penalty reveal 等近期反复修过的边角
- [ ] **AGENTS.md 警告执行** — 项目用魔改版 Next.js，做一遍代码 audit 看有没有不符合新 API 的旧代码

### B3. PVP 体验打磨（最近 5 commit 还在这一块）
- [ ] 移动端 hand scroll 完善（`fix(game): unified opponent layout, mobile hand scroll, pong UX`）
- [ ] 对手布局统一收尾
- [ ] pong UX 持续迭代
- [ ] 「8-item game polish batch」之后是否还有第二批？需要梳理

---

## 🟠 C. 下一阶段功能（讨论后再定）

- [ ] **观战 / 回放 / 对局历史** — `stats` 页已有但功能完整度未知
- [ ] **段位 / 排行榜深化** — 单机有段位；PVP 跨房间排行是否要做
- [ ] **Big Five 短测版**（10–20 题）— 60 题首次体验门槛高，做快测降低流失
- [ ] **卡牌组织 / 标签系统** — commit 出现过 `card tag/organize`、`two-step discard + tag picker`，可能没完
- [ ] **i18n** — OfferKit 走过 next-intl cookie-based 路线，可参考；想出海就做

---

## ❓ 待用户确认

- [ ] **「aron」是什么** — 26 天前提过这词，旧 memory 没解决就被清掉了。如有意义请补充
- [ ] **优先级取向**：先 ship（A1 + B1 + 关键 B2）还是继续打磨（B3 + A）？这决定 C 的开工顺序

---

## 已完成（参考，不要重复）
- ✅ Phase 1：Big Five 60 题测评 + 单机 1 人 + 3 AI
- ✅ Phase 2：PVP 联机端到端跑通（房间 / Realtime 广播 / 房主 game-master / 序列化隔离）
- ✅ Supabase 4 张表 + realtime 已建（project msyrowizejzgxedmnjne）
- ✅ Psy 设计系统（DESIGN.md + globals.css 令牌 + PsyOverlayPanel）
- ✅ 3D 卡牌交互（mouse-tracked tilt + hover + fly-to-declared-area）
- ✅ Phase A 反馈动效（shake / pops / turn-switch bounce）
- ✅ Phase B 动效（card hover + fly to declared area）
- ✅ 麻将式 Hu / Pong 改造（替代 DECLARE）
