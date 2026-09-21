# 决策请求：kalieri.com 实时数据对部分访客不可用 —— 架构取舍

> 背景：这是一份交给决策方评估的技术材料。所有事实均为实测，非推测。
> 项目：ruoli-presence（个人网站），仓库 github.com/Musdkar/ruoli-presence

---

## 一、现象

访客打开 https://kalieri.com/ 时，**除天气外的所有实时卡片都显示 "not linked / 未链接"**：

| 卡片                    | 数据来源               | 故障时表现                    |
| ----------------------- | ---------------------- | ----------------------------- |
| Status（Discord/Focus） | Lanyard                | not linked                    |
| Music Status            | Lanyard KV             | Music not linked yet          |
| Software / today        | Lanyard KV             | 空状态                        |
| Keyboard（Mac/Win）     | Lanyard KV             | Keyboard aggregate not linked |
| Fitness                 | Lanyard KV             | not synced                    |
| Devices                 | 静态 config            | 正常（不受影响）              |
| Weather                 | Open-Meteo             | **正常**                      |
| Map                     | MapLibre + OpenFreeMap | 正常                          |

注意：**天气正常，说明前端本身工作正常**，问题只出在 Lanyard 这一条数据链路上。

---

## 二、已确认的根因

### 2.1 直接原因

访客浏览器**连不上 `api.lanyard.rest`**（TCP 443 超时）。

实测（复现于本机 iPhone 个人热点网络，网段 172.20.10.x，网关 172.20.10.1）：

    curl https://api.lanyard.rest/v1/users/<id>   -> 000（超时）
    curl https://api.github.com                    -> 200（对照，正常）
    curl https://api.open-meteo.com                -> 200（对照，正常）

即**不是全网络断开，而是到 Lanyard 所在主机（69.46.46.46，Railway 托管）的路由不通**。

### 2.2 数据本身完好（关键）

经可用网络读取 Lanyard KV，数据**完整且实时**：

    success: true
    KV keys: 11
      apps_today        -> {"date":"2026-09-21","apps":[{"name":"Animeko",...}]}
      apps_today_mac    -> {"date":"2026-09-21",...}
      apps_today_win    -> {"date":"2026-09-21",...}
      health_today      -> {"steps":2507,...}
      keyboard_today_mac-> {"v":1,"date":"2026-09-21",...}
      keyboard_today_win-> {"v":1,"date":"2026-09-21",...}
      music_now         -> {"state":"playing","service":"netease",...}
      phone_presence    -> {"status":"online","updatedAt":"2026-09-21T07:00:02+08:00"}

**结论：数据没丢，是"取不到"。**

### 2.3 架构性原因

这是一个**纯静态 SPA**。数据流转：

    本机 bridge（每 15 分钟）
      └─ POST kalieri.com/api/whatpulse  (Azure Function)
           └─ 写入 Lanyard KV          ← 数据存在这里（服务端）
                └─ 访客浏览器 ──fetch/WS──> api.lanyard.rest  ← 每个访客各自去取
                     └─ 渲染卡片

**关键点：服务端只负责"写"，每个访客的浏览器必须自己"读" Lanyard。**
站点自己没有中转层，所以访客的网络可达性 = 数据可见性。

---

## 三、现有技术栈与约束

| 项           | 现状                                                                                                                    |
| ------------ | ----------------------------------------------------------------------------------------------------------------------- |
| 前端         | React 18 + Vite 5，纯客户端渲染 SPA                                                                                     |
| 托管         | Azure Static Web Apps（含 Azure Functions，目录 `api/`）                                                                |
| CDN/防护     | Cloudflare（橙云，已开启）                                                                                              |
| 数据源       | Lanyard（Discord presence + KV 存储），托管在 Railway                                                                   |
| 已有函数     | `/api/whatpulse`（POST，token 校验）、`/api/music`（POST）、`/api/health`（POST）                                       |
| 前端取数 1   | `use-lanyard@2.0.0` 的 `useLanyard()` → **WebSocket**（`wss://api.lanyard.rest/socket`）                                |
| 前端取数 2   | 自研 `fetchLanyardPresence()` → **REST**（`https://api.lanyard.rest/v1/users/:id`），作为兜底 + 30 分钟 last-good cache |
| 服务端密钥   | `LANYARD_USER_ID`、`LANYARD_API_KEY`（仅函数用，不入前端）                                                              |
| 前端公开变量 | `VITE_DISCORD_ID`（discordId 被内联进 JS bundle）                                                                       |

### 3.1 关键约束：WebSocket 无法经 Azure Functions 中转

- Azure Functions 的 HTTP trigger **不支持 WebSocket**。
- `use-lanyard` 内部把 socket URL 写死为 `{wss|ws}://{hostname}/socket`（源码第 295-296 行），只暴露 `ApiConfig = { hostname, secure }`，**无法改路径**。
- 因此**无法**让 `useLanyard` 走自己的域名中转。若强行改 hostname，会得到 `wss://kalieri.com/socket`（不存在）。

### 3.2 REST 可以中转

`fetchLanyardPresence()` 是自有代码，URL 可改。

### 3.3 前端实际消费的数据极少

`sanitizePresence()` 只保留 4 个字段：

    { discord_status, activities, spotify, kv }

其中 `kv` 是主数据源（音乐/键盘/软件/健康/手机状态全在里面）。其余 UI 用到的就是这几个。

---

## 四、候选方案

### 方案 A：新增 `/api/presence` 中转函数（推荐讨论的主方案）

新增 Azure Function，由服务端去读 Lanyard 再返回给前端：

    浏览器 ──fetch /api/presence──> Azure Function ──REST──> api.lanyard.rest
      (走 kalieri.com，CF+Azure，可达性好)         (服务器侧单点)

**优点**

- 访客不再需要直连 Railway，只连你的域名 → 可达性显著改善
- 可顺带把 `VITE_DISCORD_ID` 从 bundle 移除（改用服务端 `LANYARD_USER_ID`）
- 服务端可加短缓存（如 5s），限制打向 Lanyard 的请求量
- 与现有 `/api/whatpulse` 等函数模式一致，架构不新增范式

**缺点 / 风险**

- 引入新的公开端点（需考虑滥用/缓存策略）
- 轮询取代 WebSocket 会降低实时性（若采用纯轮询）
- Azure 函数冷启动可能带来首屏延迟（需评估）
- 若 Lanyard 本身全局故障，中转也救不了（但会明确区分"连不上"与"无数据"）

**待决策的细节**

1. 纯轮询（移除 `use-lanyard`）？还是保留 WS 做优选、中转做兜底？
2. 轮询间隔（受 Lanyard 公开实例速率限制影响，文档记载约 3s/次）
3. 服务端缓存时长
4. 是否对 `/api/presence` 做来源限制（Origin 校验）或保持匿名公开

### 方案 B：保留 `use-lanyard` 作优选 + 中转作兜底

- 网络好时仍实时；连不上时 REST 兜底走自己的域名。
- 缺点：两条路径并存，逻辑复杂度上升。

### 方案 C：最小改动 —— 只把 REST 兜底的 URL 换成中转

- 改动最小（一行 URL + 一个函数）。
- WS 仍会尝试直连并在失败时静默，REST 兜底保证可用性。
- 缺点：WS 的失败路径仍存在（但不影响可用性）。

### 方案 D：其他数据源 / 自建

- 例如把 presence 也写入自己的存储（Azure Static Web Apps 无内置数据库；需引入 Azure Storage/Cosmos 等）。
- 成本与复杂度显著上升，超出个人站范围。

---

## 五、需要决策的问题（核心）

1. **是否接受用"服务端中转"这一新层？** 还是倾向于其他思路（例如更换数据源、放弃部分实时性）？
2. **实时性 vs 简单性**：WebSocket 实时（依赖访客能连 Railway）与轮询（走自己域名但非实时）如何取舍？
3. **端点安全模型**：`/api/presence` 做成公开匿名端点可接受吗？是否需要限流/缓存/Origin 校验？
4. **Azure Functions 的成本与配额**是否可承受预计的请求量（取决于轮询间隔与访客数）？
5. **是否需要顺带把 `VITE_DISCORD_ID` 移出前端 bundle**（当前它被内联在公开 JS 里）？
6. **是否考虑更换 Lanyard**（其托管在 Railway，跨境可达性不稳定）？

---

## 六、附：本次排查中排除的假设

| 假设                | 验证结果                                                               |
| ------------------- | ---------------------------------------------------------------------- |
| 网站本身故障        | ❌ 排除：站点 200，天气正常渲染                                        |
| 数据丢失            | ❌ 排除：KV 中 11 个 key 数据完整实时                                  |
| Azure 环境变量丢失  | ❌ 排除：线上 JS 中 `discordId:"860859306156490762"` 存在              |
| 本机 Clash 代理拦截 | ❌ 排除：Clash `tun.enable=false`、系统代理关闭，未接管流量            |
| Cloudflare 拦截     | ❌ 排除：站点本身经 CF 可正常访问；仅 Lanyard 主机不可达               |
| API 函数故障        | ❌ 排除：`/api/whatpulse` 等返回 401（正常，未带 token），说明函数存活 |

**最终定位：访客侧到 `api.lanyard.rest`（Railway，69.46.46.46）的网络不可达，且站点架构要求每个访客自行取数，因此该不可达直接导致全站实时卡片降级。**
