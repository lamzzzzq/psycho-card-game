# 人格麻将教学系统 — 软件著作权申请信息
# Personalities Mahjong Card Game — Software Copyright Registration Information

> 本文档整理软件著作权（软著）登记所需的技术信息。标注【待填】的栏位需申请人自行确认后填写。
>
> This document compiles the technical information required for software copyright registration. Fields marked **[To be filled]** require confirmation by the applicant.

---

# 简体中文版

## 〇、软件基本信息

| 项目 | 内容 |
|------|------|
| 软件全称 | 人格麻将教学系统 |
| 软件简称 | 人格麻将（Personalities Mahjong） |
| 版本号 | V1.0 |
| 软件分类 | 应用软件 / Web 网页应用（在线卡牌游戏） |
| 开发方式 | 原始开发（独立完成，非改编、非合作、非委托） |
| 著作权人 | 许沛鸿（中国国籍） |
| 软件用途 | 教学与研究用途；基于人格测评（Big Five 五因素模型）的心理学卡牌对战游戏 |

### 软件主要功能
1. **人格测评**：用户完成问卷测评，系统计算五维人格得分（开放性、尽责性、外向性、宜人性、神经质），生成个人人格图谱。
2. **单机对战**：玩家与 AI 对手（三档难度）进行卡牌对战，通过抽牌、弃牌、碰牌、归档等操作完成五个人格维度的归档目标。
3. **联机对战**：支持 2–4 名真实玩家在线同桌对战，实时同步游戏状态。
4. **看牌难度机制**：提供明牌、半公开、隐藏三档难度，控制人格标签的可见程度。
5. **教学引导**：内置沙盒式教程，引导新玩家理解规则。
6. **双语支持**：中文与英文界面切换。
7. **数据采集**：面向教学研究的匿名测评数据收集与导出。

### 技术特点
- 前后端一体化的现代 Web 架构，跨平台（PC / 移动端）自适应响应式界面。
- 基于组件化与状态管理的可维护前端工程。
- 实时多人对战通过云数据库的发布/订阅机制实现状态同步。
- 完整的单元测试覆盖核心游戏逻辑（116 项测试用例）。

### 一、开发完成日期
**2026 年 7 月 11 日**（开发起始日期：2026 年 3 月 29 日；开发周期约 3.5 个月，累计 253 次版本提交。）

### 二、著作权人
**许沛鸿**（中国国籍；原始取得，享有全部著作权）。

### 三、开发时硬件环境
- 处理器：Apple Silicon 芯片（ARM 架构，64 位）
- 内存：16 GB 及以上
- 硬盘：256 GB 及以上固态硬盘（SSD）
- 计算机类型：Apple Mac 台式/笔记本电脑
> 通用说明：本软件为 Web 应用，对开发硬件无特殊要求，任意主流 64 位个人计算机（Intel/AMD/Apple Silicon，内存 8GB 以上）均可开发。

### 四、运行时硬件环境
**服务端（部署）：** 云服务器（Vercel 云平台），x86-64 架构服务器，无需自建物理服务器；数据库为云托管 PostgreSQL（Supabase）。
**客户端（用户）：** 任意可运行现代浏览器的设备——个人计算机（PC/Mac）、平板电脑、智能手机；内存 2 GB 及以上，具备网络连接。

### 五、软件开发环境 / 开发工具
- 集成开发环境（IDE）/ 代码编辑器：Visual Studio Code / Cursor
- 版本控制工具：Git
- 包管理与构建工具：npm、Next.js（Turbopack/Webpack 构建）
- 代码质量工具：ESLint 9、TypeScript 编译器（tsc）
- 单元测试框架：Vitest 4
- 运行时环境：Node.js v22.20.0

### 六、软件运行平台 / 操作系统
**跨平台 Web 应用，不限操作系统。** 通过浏览器运行，兼容：
- 桌面端：Windows 10/11、macOS、Linux
- 移动端：iOS、Android、iPadOS
- 支持的浏览器：Google Chrome、Safari、Microsoft Edge、Firefox 等现代主流浏览器

### 七、软件运行支撑环境 / 支持软件
**服务端：** Node.js 运行时（v22.x）；Next.js 应用框架（v16.2.1）；PostgreSQL 数据库（通过 Supabase 云服务）。
**客户端：** 支持 HTML5、CSS3、ECMAScript（ES2020+）的现代浏览器，需启用 JavaScript。

### 八、编程语言及版本号 / 源程序量

**编程语言：**

| 语言 | 版本 | 用途 |
|------|------|------|
| TypeScript | 5.9.3 | 主要开发语言（业务逻辑、界面组件） |
| JavaScript（ECMAScript） | ES2020+ | 编译目标 / 运行时 |
| CSS3（Tailwind CSS 4） | — | 界面样式 |
| HTML5 | — | 页面结构 |

**主要框架与库：** Next.js 16.2.1、React 19.2.4、Zustand 5.0.12、Framer Motion 12.38.0、Tailwind CSS 4.x、@supabase/supabase-js 2.101.1。

**源程序量：**

| 类型 | 文件数 | 行数 |
|------|--------|------|
| TypeScript / TSX 源代码 | 82 | 18,353 |
| CSS 样式 | 1 | 364 |
| **合计** | **83** | **约 18,717 行** |

> 软著登记通常要求提交源程序前 30 页 + 后 30 页（每页不少于 50 行）。本软件源代码总量约 18,700 行，满足要求。

---

# English Version

## 0. Software Overview

| Item | Content |
|------|---------|
| Full Name | Personalities Mahjong Educational System |
| Short Name | Personalities Mahjong |
| Version | V1.0 |
| Category | Application software / Web application (online card game) |
| Development Type | Original development (independently completed; not adapted, collaborative, or commissioned) |
| Copyright Owner | **Xu Peihong (Chinese nationality)** |
| Purpose | Educational and research use; a psychology-themed card battle game based on the Big Five personality assessment |

### Main Features
1. **Personality Assessment** — Users complete a questionnaire; the system computes five-dimension scores (Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism) and generates a personal personality profile.
2. **Single-player Mode** — Play against AI opponents (three difficulty levels) via drawing, discarding, claiming (pong), and archiving cards to complete archiving goals across five personality dimensions.
3. **Multiplayer Mode** — Supports 2–4 real players competing online at the same table with real-time state synchronization.
4. **Reveal Difficulty** — Three levels (Open / Half / Hidden) controlling the visibility of personality tags.
5. **Tutorial** — Built-in sandbox tutorial guiding new players through the rules.
6. **Bilingual** — Switchable Chinese and English interface.
7. **Data Collection** — Anonymous assessment data collection and export for educational research.

### Technical Highlights
- Modern full-stack web architecture with cross-platform (PC / mobile) responsive UI.
- Maintainable component-based front end with centralized state management.
- Real-time multiplayer via cloud-database publish/subscribe synchronization.
- Comprehensive unit-test coverage of core game logic (116 test cases).

### 1. Development Completion Date
**July 11, 2026** (Development started March 29, 2026; ~3.5 months, 253 version commits.)

### 2. Copyright Owner
**Xu Peihong** (Chinese nationality; original acquisition, holds all copyrights).

### 3. Development Hardware Environment
- CPU: Apple Silicon (ARM, 64-bit)
- RAM: 16 GB or above
- Storage: 256 GB SSD or above
- Machine: Apple Mac desktop/laptop
> General note: as a web application, no special development hardware is required. Any mainstream 64-bit personal computer (Intel/AMD/Apple Silicon, ≥8 GB RAM) suffices.

### 4. Runtime Hardware Environment
**Server (deployment):** Cloud server (Vercel platform), x86-64 architecture, no self-hosted physical server; database is cloud-hosted PostgreSQL (Supabase).
**Client (user):** Any device running a modern browser — PC/Mac, tablet, or smartphone; ≥2 GB RAM with network connectivity.

### 5. Development Environment / Tools
- IDE / Code Editor: Visual Studio Code / Cursor
- Version Control: Git
- Package Management & Build: npm, Next.js (Turbopack/Webpack)
- Code Quality: ESLint 9, TypeScript compiler (tsc)
- Unit Testing: Vitest 4
- Runtime: Node.js v22.20.0

### 6. Runtime Platform / Operating System
**Cross-platform web application, OS-agnostic.** Runs in a browser; compatible with:
- Desktop: Windows 10/11, macOS, Linux
- Mobile: iOS, Android, iPadOS
- Browsers: Google Chrome, Safari, Microsoft Edge, Firefox, and other modern mainstream browsers

### 7. Runtime Supporting Environment / Supporting Software
**Server:** Node.js runtime (v22.x); Next.js framework (v16.2.1); PostgreSQL database (via Supabase cloud service).
**Client:** Modern browser supporting HTML5, CSS3, ECMAScript (ES2020+), with JavaScript enabled.

### 8. Programming Languages & Versions / Source Code Volume

**Programming Languages:**

| Language | Version | Usage |
|----------|---------|-------|
| TypeScript | 5.9.3 | Primary development language (business logic, UI components) |
| JavaScript (ECMAScript) | ES2020+ | Compilation target / runtime |
| CSS3 (Tailwind CSS 4) | — | UI styling |
| HTML5 | — | Page structure |

**Main Frameworks & Libraries:** Next.js 16.2.1, React 19.2.4, Zustand 5.0.12, Framer Motion 12.38.0, Tailwind CSS 4.x, @supabase/supabase-js 2.101.1.

**Source Code Volume:**

| Type | Files | Lines |
|------|-------|-------|
| TypeScript / TSX source | 82 | 18,353 |
| CSS | 1 | 364 |
| **Total** | **83** | **~18,717 lines** |

> Copyright registration typically requires the first 30 + last 30 pages of source code (≥50 lines per page). With ~18,700 lines total, this software meets the requirement.

---

## 附 / Appendix：项目现有技术文档（可作佐证材料）/ Existing Project Documentation (supporting materials)

| 文档 / Document | 说明 / Description |
|------|------|
| `README.md` | 项目说明 / Project overview |
| `DESIGN.md` | 设计规范 / Design specification |
| `docs/SCORING_REFERENCE.md` | 人格计分规则 / Personality scoring rules |
| `docs/DECK_BALANCE.md` | 牌库平衡设计 / Deck balance design |
| `docs/PENALTY_EDGE_CASES.md` | 罚则边界情形 / Penalty edge cases |
| `docs/STUDENT_ID_IDENTITY.md` | 身份与隐私设计 / Identity & privacy design |
| `docs/DATA_COLLECTION.md` | 数据采集说明 / Data collection notes |
| `TESTING_PLAN.md` / `TESTING_LOG.md` | 测试计划与记录 / Test plan & log |
