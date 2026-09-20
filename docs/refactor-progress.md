# 工程优化进度报告（refactor/maintainability）

> 本文件记录 ruoli-presence 可维护性优化任务的阶段进度，方便新开对话后继续。
> 分支：refactor/maintainability（从 origin/main @ 0a90778 分出）。

## 0. 总原则

- 先测量再修改；不推倒重来；保留现有视觉/交互/数据含义/隐私边界/首屏性能
- 不引入 Redux/Zustand/React Query/Next/Astro/Tailwind/CSS-in-JS；暂不迁 TS
- 不把依赖大版本升级和本轮混在一起
- 不修改作者个人内容/文案/设备/照片/设计（除明显 bug 或 a11y）
- 每阶段必须能独立 build

## 1. Baseline（Phase A，改代码前）

| 指标 | 值 |
|---|---:|
| initial JS gzip | 72.0 kB（预算 120）|
| initial CSS gzip | 7.7 kB（预算 15）|
| 最大 lazy chunk | maplibre-gl 277.0 kB（lazy）|
| 其它 lazy | photo-album 34.3 kB / markdown 11.5 kB |
| src/main.jsx 行数 | 458 |
| Git | clean，main @ 0a90778 |

注意：.gitignore 原本忽略整个 test/（本地 XSS 脚手架）。已改为只忽略
test/__mock_ws.js 与 test/vite.config.test.mjs，使 test/**/*.test.js 可被跟踪。

## 2. 已完成阶段

### Phase B - 质量工具（commit f7d9c1a, 2b92fb4）
- 新增 ESLint 9(flat) / Prettier 3 / Vitest 2
  - eslint.config.js（React + hooks + prettier interop；JSX 变量计为已用）
  - .prettierrc.json / .prettierignore（CSS 刻意不格式化）
  - vitest.config.mjs（include test/**/*.test.{js,mjs}，环境 node）
- package.json scripts：dev/lint/lint:fix/format/format:check/test/test:watch/build/preview/check
  - check = lint && test && build
- 独立纯格式化 commit（2b92fb4）以保持可读 diff

### Phase C - 纯函数测试（commit 3ae200d）
- test/normalize.test.js、test/presence.test.js、test/lanyard-cache.test.js
- 抽出 mergeAppUsage 到 lib/normalize.js（原 Home 内 IIFE）并测试

### CI（commit 02723ad）
- 新增 .github/workflows/quality.yml：npm ci -> lint -> test -> build
- 删除重复的 performance-budget.yml（build 已含 bundle 预算）

### Phase D - 拆分 main.jsx（commit 9fe5d7b, 76e9774, 93dc2a7）
main.jsx 458 -> 13 行。目标结构：

    src/
      app/        App.jsx  Layout.jsx  Router.jsx
      pages/      HomePage  PhotoPage  BlogPage  BlogPostPage  UsesPage
      components/ Sidebar  VrcStatus  ThemeToggle  LangToggle  LangPicker  BrandMark
        cards/    CardHead  EmptyState  StatusCard  WeatherCard  MapCard
                  MusicCard  HomePhotoCard  FitnessCard  DevicesCard
                  SoftwareCard  KeyboardCard
      hooks/      useTheme  useResolvedTheme  useFastLanyard  useWeather
      data/       keyboardLayouts  mapStyle  devices
      lib/        normalize  presence  lanyard-cache  format  weather
      config.js  i18n.js  main.jsx

保留行为：Home keep-mounted（hasVisitedHome + hidden）；MapLibre lazy
（IntersectionObserver + requestIdleCallback + dynamic import）；photo-album / markdown lazy。

### Phase E - 正确性/健壮性（commit 1bc4587）
- 6) live Lanyard 统一 sanitize：useFastLanyard 对 live 走 sanitizePresence 再进 UI/缓存
- 5) buildGuard 跨平台：新增 scripts/build-artifacts.mjs（POSIX 归一化 + 纯函数 + 单测），
     vite.config.mjs 改用它（原来用 sep 在 Windows 上会误删 assets）
- 8) 天气：新增 lib/weather.js（normalizeWeather + 合理性边界）与 hooks/useWeather；
     WeatherCard 变纯展示；超时统一 WEATHER_REQUEST_TIMEOUT_MS = 8000，并同步 PERF.md
- 7) normalizeApps 加 app 名长度 cap（120）
- 9) 删除 normalize.js 里过时的 chart.js 注释

## 3. 进行中（Phase F - CSS 清理，未提交）

工作区改动：index.html、src/main.jsx、src/styles.css，已 git rm src/hotfix.css。

已完成（未提交）：
- hotfix.css 的净效果并入 styles.css：移除已被禁用的 view-in 动画；[hidden] 规则去掉了
  important 覆盖简化为 display:none；mobile content-visibility 并入
- tweaks.css 从 index.html 的 link 改为 main.jsx 里 import（统一 cascade 来源）

未完成：
- styles.css 里还有一句引用 hotfix.css 的注释需改写
- 尚未做视觉回归（dark/light x 多 viewport）与提交

## 4. 待办

### Phase G - Accessibility
- 语言弹窗 focus 管理（打开聚焦首项、Tab 不逸出、可选 Escape）
- 语言切换同步 document.documentElement.lang = zh ? zh-CN : en
- 社交链接加 aria-label（现只有 title）
- 头像 alt 语义（旁有姓名时可空 alt）
- 键盘 heatmap 容器 role=img
- 统一的 prefers-reduced-motion 策略

### Phase H - SEO 基础
- index.html：description / canonical / OG / Twitter card
- per-route document.title（首页 /blog /photo /uses /blog/:slug）
- robots.txt / sitemap.xml —— 注意同步更新 buildGuard 白名单，否则 build 时被删
- 16) 用真实 NotFoundPage 取代通配路由的 Navigate 回首页

### Phase I - Blog prerender（预计 defer）

## 5. 当前质量/性能

| 项 | 现状 |
|---|---|
| test | 74 passed / 5 files |
| lint | 0 error / 7 warning |
| build | 通过，within budget |
| initial JS gzip | 75.5 kB（baseline 72.0，+4.9%，预算内）|
| initial CSS gzip | 7.6 kB（baseline 7.7）|
| MapLibre | 仍 lazy（277 kB）|

## 6. 与任务书的差异（按第 0 节记录）

1. main.jsx 实际 458 行（任务书说约 429），以仓库为准
2. vite.config 确实用 sep（Windows bug 属实），已修
3. weather timeout：PERF.md 记录 3s、代码 8s，属实；因 open-meteo 实测约 6s，保留 8s 并更新 PERF.md
4. .gitignore 的 test/ 与新增单测冲突，已拆分

## 7. 已知风险

- Phase F 的 CSS 合并未做视觉回归：view-in 被移除（原已被禁用，理论无变化），仍需 dark/light x viewport 复核
- Phase H 的 robots/sitemap 必须同步改 buildGuard 白名单
- 依赖漏洞未处理（第 22 节）：esbuild(moderate)、vite(high,dev-only)、maplibre-gl(critical XSS sanitizer)；记 deferred
- 全程未 push、未合并 main；备份 tag 仍在

## 8. 恢复工作第一步

    cd ~/project/ruoli-presence
    git checkout refactor/maintainability
    git status        # 确认 Phase F 未提交改动
    npm run check
    # 继续：改 styles.css 注释 -> 视觉回归 -> commit Phase F -> Phase G -> Phase H

## 9. commit 一览（本分支相对 origin/main）

    1bc4587 fix: sanitize live presence, portable build guard, weather hardening
    93dc2a7 refactor: decompose main.jsx into app/pages/components/hooks/data/lib
    76e9774 refactor: extract theme/lanyard hooks, toggles and BrandMark
    9fe5d7b refactor: extract Home dashboard cards and shared UI into modules
    02723ad ci: replace budget-only workflow with a full quality gate
    3ae200d test: cover normalize, presence, lanyard-cache and app merge
    2b92fb4 style: apply Prettier formatting across the repo
    f7d9c1a chore(tooling): add ESLint, Prettier and Vitest
