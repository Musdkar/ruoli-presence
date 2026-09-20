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

## 3. 已完成阶段（续）

### Phase F - CSS 清理（commit 9446f85）
- 删除 src/hotfix.css：其规则只是在抵消更早的 view-in 动画，动画源头已移除
- 移动端 content-visibility 规则并入 styles.css
- visited-Home 的 [hidden] 行为显式保留
- tweaks.css 改由 JS entry 引入，所有 CSS 共用单一 cascade 来源

### Phase G - i18n 重构 + Accessibility（commit d4b05c2）
i18n：
- 用单一 LangProvider（context 携带 { lang, setLang }）替换
  模块级 current/subscribers/Proxy 三套并存的状态机制
- useLang / useT / useSetLang 全部读同一 context；保留英文 fallback
- 同步 <html lang>（en / zh-CN）
- 新增 i18n 单测（key parity + fallback）
a11y：
- LangPicker：打开聚焦首项 + Tab 限制在 dialog 内
- 社交链接 aria-label（原仅 title）；装饰 glyph aria-hidden
- 头像 decorative alt=""（旁边 h1 已有姓名）
- 键盘 heatmap role="img"
- 统一的 prefers-reduced-motion 策略
清理：
- DevicesCard 改用已存在的 data/devices.js（原为组件内重复硬编码）
- 删除未使用的 themeIcon 与 unused catch bindings

### Phase H - SEO 基础 + 质量门禁（commit 5f67762）
- index.html：静态 description / canonical / Open Graph / Twitter card
- lib/seo.js：纯函数 metadataFor() + applyMetadata()；Layout 按路由应用
  title / description / canonical / og:url
- public/robots.txt、public/sitemap.xml（并已加入 buildGuard 白名单）
- build-artifacts allowlist 扩展 + 测试
- 通配路由改为真正的 NotFoundPage（不再静默 redirect 回首页）
- README 修正漂移（自托管图标而非 Simple Icons CDN、去掉 `\n` 字面量），
  新增 Development 与源码结构章节
- PERF.md 刷新实测数字并说明完整 CI gate
- CI 增加 format:check

### Phase I - Blog prerender：评估后 defer
在当前 Vite + BrowserRouter + 纯客户端渲染下实现 prerender 需要 SSR 化的
渲染树（10+ 模块直接使用 window/document/localStorage）、独立构建步骤、
hydration 以及路由 guard，属于架构级改动，不满足任务书"低复杂度"条件。

## 5. 当前质量/性能

| 项 | 现状 |
|---|---|
| unit test | 110 passed / 8 files |
| dist test | 8 passed / 1 file（`npm run test:dist`，build 之后运行）|
| lint | 0 error / 0 warning（`--max-warnings=0`）|
| format:check | clean |
| build | 通过，within budget |
| initial JS gzip | 73.4 kB（baseline 72.0，+1.9%，预算 120）|
| initial CSS gzip | 7.6 kB（baseline 7.7，预算 15）|
| MapLibre | 仍 lazy（277.0 kB gzip，不在首屏）|
| photo-album / markdown | 仍 lazy（34.3 / 11.5 kB）|

### 验证状态（重要：区分本地与 CI）

- **本地验证**：以上数字全部本地跑通（`npm ci → lint → format:check → test →
  build → test:dist`）。运行时路由行为用 headless Chrome 逐路由核对。
- **GitHub CI 验证**：截至本文件更新时 **尚未运行**。分支
  `refactor/maintainability` 已存在于远端，但还没有正式 PR，因此 GitHub
  Actions 尚未对该分支执行。CI workflow 已配置为 lint → format:check → test →
  build → test:dist；需在 PR 创建并 Actions green 后才可声明“CI 通过”。

## 5.1 安全审计（第 21 节）

api/ 与 bridge/ 审计通过：
- 所有 ingest endpoint 均 POST-only、常量时间 token 比较、token 为空时 fail-closed
- JSON shape 校验、数量级边界（apps<=8、keys<=100、heat<=15 等）
- 无 window title / URL / 键序 / 精确每键计数离开本机
- bridge 以 SQLite mode=ro + PRAGMA query_only 只读打开
- dist 中无 LANYARD_API_KEY / INGEST_TOKEN / 服务器变量；前端仅用 VITE_*
- .env.example 严格区分公开 VITE_* 与 server secrets

## 5.2 依赖审计（第 22 节，仅报告）

npm audit：7 项（2 critical / 1 high / 4 moderate）。
- maplibre-gl critical（DOM.sanitize XSS），影响 <=6.4.0，暂无修复；
  本项目地图 interactive:false、无 marker/popup/用户 HTML，攻击面不可达 -> deferred
- vite / vitest / esbuild 均在 dev 依赖链 -> dev-only
- 未执行 audit fix --force；依赖现代化留作独立任务

## 6. 与任务书的差异（按第 0 节记录）

1. main.jsx 实际 458 行（任务书说约 429），以仓库为准
2. vite.config 确实用 sep（Windows bug 属实），已修
3. weather timeout：PERF.md 记录 3s、代码 8s，属实；因 open-meteo 实测约 6s，保留 8s 并更新 PERF.md
4. .gitignore 的 test/ 与新增单测冲突，已拆分

## 7. 已知风险 / deferred

- Blog HTTP 层 soft-404：不存在或草稿的 /blog/:slug 在 Vercel 仍返回 index.html
  （HTTP 200），仅 UI 层显示 not-found。要彻底解决需 prerender -> deferred
- 客户端 metadata != 真正 SSR/SSG：社交爬虫不执行 JS，仍只看静态 index.html
- maplibre-gl critical advisory（<=6.4.0，暂无修复）-> deferred，攻击面不可达
- vite/vitest/esbuild 漏洞均在 dev 依赖链
- 依赖大版本升级（React 18、Vite 5、React Router 7）留作独立任务
- 未合并 main（分支已推送到 origin/refactor/maintainability，等待 PR 与 review）

## 8. 验证方式

    npm ci
    npm run lint         # src api scripts test bridge/*.mjs + --max-warnings=0
    npm run format:check
    npm run test         # 110 unit tests
    npm run build        # 含 bundle 预算
    npm run test:dist    # 8 个 dist 断言，dist 不存在时 fail 而非 skip

或一次跑完：`npm run check`。

运行时行为已用 headless Chrome 逐路由核对（Home / blog / blog/:slug / photo /
uses / 未知路由）的 document.title、canonical 与渲染内容。

### 第二轮 pre-merge correction pass（P0/P1/P2）

- P0-1 生产域名：`ruoli.presence` -> `kalieri.com`，覆盖 seo.js / index.html /
  robots.txt / sitemap.xml 及相关测试；`SITE_URL === "https://kalieri.com"` 有断言
- P0-2 dist gate：`test:dist` 独立执行，dist 缺失时 **fail**（不再 skip）；
  CI 在 build 之后运行 `npm run test:dist`
- P1-1 lint 范围扩展到 api/test/bridge/*.mjs，并加 `--max-warnings=0`；
  删除 `api/whatpulse` 中未使用的 `MAX_DEVICES`，修正 KEY_RE 多余转义
- P1-2 KV 值大小边界：单个白名单 KV 值 > 32768 字符丢弃；字符串/对象统一处理，
  JSON 序列化失败（含循环引用）丢弃；正常 phone/apps/keyboard/music payload 不受影响
- P1-3 404 metadata：not-found 视图输出 `noindex,follow`，正常页面恢复
  `index,follow`；文档明确「客户端 noindex != 真正 HTTP 404 / SSR」
- P2-1 普通 404 文案改为 notFoundTitle/notFoundBody/backHome（en/zh）
- P2-2 `useT()` 已移除 Proxy，改为普通合并对象（实现与文档一致）
- P2-3 本文件状态更新为真实情况，并区分本地验证与 GitHub CI 验证

## 9. commit 一览（本分支相对 origin/main，第二轮修正提交在最上方）

    <pending> fix(pre-merge): kalieri.com domain, real dist gate, wider lint, KV size cap

    5f67762 feat(seo+quality): per-route metadata, robots/sitemap, real 404, format gate
    d4b05c2 refactor(i18n+a11y): single LangProvider, focus-safe picker, a11y fixes
    9446f85 refactor(css): fold hotfix layer into the canonical stylesheet
    1bc4587 fix: sanitize live presence, portable build guard, weather hardening
    93dc2a7 refactor: decompose main.jsx into app/pages/components/hooks/data/lib
    76e9774 refactor: extract theme/lanyard hooks, toggles and BrandMark
    9fe5d7b refactor: extract Home dashboard cards and shared UI into modules
    02723ad ci: replace budget-only workflow with a full quality gate
    3ae200d test: cover normalize, presence, lanyard-cache and app merge
    2b92fb4 style: apply Prettier formatting across the repo
    f7d9c1a chore(tooling): add ESLint, Prettier and Vitest