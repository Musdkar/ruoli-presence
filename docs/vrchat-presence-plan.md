# AFTER HOURS 的 VRChat 状态同步方案

核验日期：2026-10-10。现有 VPS 采集器的本人状态发布已启用，真实记录已经过 Lanyard、预览专属匿名接口和浏览器显示。采集器为 `/home/azureuser/vrcx-collector`，复用已核验的 kai 会话；Cookie 未离开原采集器，Lanyard key 仅保存于 VPS 私有配置。

## 建议采用的路径

**针对你已有的 VPS：现有采集器 → 本人状态过滤模块 → Lanyard KV → 匿名只读 `/api/presence` → AFTER HOURS。**

复用现有采集器的会话和串行调度，不创建第二套登录或并行进程。现有 keepalive 为 1800 秒，不能用于 180 秒的网页有效期；已启用的发布钩子在同一循环里每 60–90 秒查询固定本人一次。发布模块不自行读取 Cookie 文件，只通过原会话查询本人；发给 Lanyard 的独立会话没有 VRChat Cookie。

这是对现有服务的最小扩展建议，不是对云端访问官方合规性的保证。若会话频繁失效、遇到 IP 挑战，或希望采用更符合设备/IP 指引的来源，再切换到 Windows 本地 VRCX → HTTPS 接收器 → 同一发布链路。两种来源只能启用一个，避免相互覆盖。

1GB VPS 可以作为轻量发布模块的候选：在现有程序中增加小模块，保存单条最新记录，不需要在 VPS 上运行完整 VRCX 桌面程序或新增公网入口。若使用独立接收器，给它设置例如 128MB 的内存预算并测量实际占用；这不是对当前 VPS 剩余资源的保证。本次已备份原程序、安装并启用钩子，于 2026-10-10 04:48:39 UTC 重启服务，随后确认两个原有账户均登录成功、本人发布持续更新。模块无需新增依赖或公网端口。

## API 能做什么，官方怎样看待

VRChat 的最新 Creator Guidelines 允许按规则开发 API 应用，但没有官方公共 API 文档或第三方支持，接口可能变化；目前没有 OAuth。规则要求限频、缓存、错误退避、随机化轮询及可识别的 User-Agent，并强调账户访问应来自用户自己的设备和 IP。因此，**选择本地采集、云端仅转发，是本方案对这些规则的设计判断**，不能把自有 VPS 当成自动获得许可的例外。[官方 Creator Guidelines](https://hello.vrchat.com/creator-guidelines)

服务条款也限制未经授权的数据提取与不符合个人正常使用的自动访问。第三方工具可以技术上工作，不等于获得官方兼容性或账号安全保证。[VRChat Terms of Service](https://hello.vrchat.com/legal)

社区维护文档显示：首次 `GET /auth/user` 可使用 Basic 认证建立会话，之后复用 `auth` Cookie；`GET /users/{userId}` 同样要求认证。不存在一个把“公开 key”放进网页就能匿名查询实时状态的接法。不要每次轮询都重新登录，也不要假定会话数量或有效期固定。[登录与会话](https://vrchat.community/reference/get-current-user)、[用户接口](https://vrchat.community/reference/get-user)

有 2FA 时，在本机由你完成验证码输入，再验证当前用户身份。TOTP 与邮箱验证码有不同的验证路径；采集器应处理真实响应，不能靠关闭 2FA 或自动保存 TOTP 种子解决无人值守登录。[TOTP 验证](https://vrchat.community/reference/verify2fa)、[邮箱验证码验证](https://vrchat.community/reference/verify2faemail-code)、[社区 Python SDK 示例](https://github.com/vrchatapi/vrchatapi-python)

## 三种方案比较

| 方案 | 适合的工作 | 主要问题 | 建议 |
| --- | --- | --- | --- |
| GitHub Actions + Secrets | 构建、部署、低频检查 | 定时最短 5 分钟，会延迟或丢弃任务；只在默认分支运行；临时运行器难以安全持续保存更新后的 Cookie，并从云端 IP 访问 VRChat | 不作为实时状态采集器 |
| VPS private daemon 直接访问 VRChat | 复用你已运行的采集器，电脑关闭后仍可观测服务端状态 | 服务器持有账户会话、异地 IP、登录挑战；与官方设备/IP 指引存在冲突，不能保证合规或稳定 | 本次已复用现有服务，仅扩展最小发布模块 |
| Windows 本地 VRCX 同步 | PC 使用时，复用本机已有状态与本人登录流程 | 需要核验版本和可用接口；电脑关机时不能覆盖 Quest 独立使用 | 更贴近设备/IP 指引，作为替代来源；使用同一过期与兜底协议 |

GitHub 的调度限制见[官方 schedule 文档](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)。VRCX 是维护中的 VRChat 工具，但不能假定每个版本都提供现成的通用 HTTP 状态接口；实施前检查你安装的版本与实际数据入口。[VRCX 项目](https://github.com/vrcx-team/VRCX)

## 凭据分别放在哪里

**代码可以提交 GitHub；任何实际密码、Cookie、token、2FA 秘钥都不能提交，包括私有仓库。** 已泄露的凭据要撤销或轮换，仅删除文件无法清除历史。

| 内容 | 放置位置 | 用途 |
| --- | --- | --- |
| 已有 VRChat 登录会话 | 现有 VPS 采集器的私有 cookie jar；或替代方案中的本机 VRCX | 保持原持有者范围，不复制给 GitHub、网页或新接收器 |
| `VRCHAT_INGEST_TOKEN`（拟新增） | Windows 的凭据存储；接收器的私有配置 | 只允许向本站单一状态入口发布 |
| 现有 `LANYARD_API_KEY` | 本次为 VPS 权限 0600 的 `presence-private.json`；iPhone 原后端仍使用其环境配置 | 写入 Lanyard KV；不交给浏览器或 Windows bridge |
| GitHub Actions Secrets | GitHub 仓库或环境设置 | 只供需要的 CI 任务读取，例如部署凭据 |
| 非敏感的接口地址、字段约定 | 仓库配置 | 可公开、可审查 |

Secrets 是 GitHub 提供的加密配置机制，环境变量是程序运行时接收配置的途径；两者不是不同的登录凭据，也不会自动同步到 VPS 或 Vercel。普通 GitHub Variables 不用于秘密。日志遮蔽不是完整防泄露措施，不输出认证头，不上传 Cookie 到缓存或构建产物，限制可读取 Secrets 的工作流权限。[GitHub Secrets 文档](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)

浏览器代码与 `VITE_*` 等前端构建变量会被访客读取，不能放以上任何发布或身份凭据。VPS 使用专用普通用户与权限 0600 的私有配置；Windows 使用仅本人可读取的 ACL / 系统凭据存储。

已有采集器或将来的自用本地采集器，应使用受保护、可持久化的 cookie jar 保存服务器实际发回的认证及 2FA 会话 Cookie，遵循域名和过期属性，原子写入更新。401 或新登录挑战时进入 `needs_login`、暂停发布，等待你在现有采集器的私有交互流程重新登录；不进行密码重试循环，不承诺固定刷新周期。若采用 VRCX 来源，让 VRCX 管理自身会话，而非从其数据库提取 Cookie。

## 对外数据与状态语义

现有发布链路保留 `status` 和 `observedAt`。用户已批准公开本人名字、头像、社交状态，以及可见世界名、房间类型和世界缩略图。只有游戏连接为 `online` 时，才允许附带过滤后的 `location`：

```json
{
  "status": "online",
  "observedAt": "<真实观测时刻的 UTC ISO 时间>",
  "availability": "join me",
  "profile": {"displayName": "<本人账号显示名>", "avatarUrl": "<无凭据的官方头像地址>"},
  "location": {"kind": "world", "worldName": "<可公开的世界名>", "access": "public"}
}
```

这只是格式示例，不代表真实在游戏。`status` 严格取 `/users/{本人}` 的 `state: online / active / offline`；`active` 显示 `ACCOUNT ACTIVE`，不亮起游戏在线效果。社交偏好 `join me / ask me / busy` 不作为连接状态，`last_platform` 也不证明当前在游戏。仅挂着 VRCX、网页登录或历史 SQLite 行不能证明在世界内。[用户响应字段](https://vrchat.community/reference/get-user)

只有连接为 `online` 时，使用同一已认证会话读取 `/auth/user`，确认本人 ID，取其当前 `presence.world / presence.instance / instanceType`。不使用该接口的 `state` 判定游戏连接（社区规范说明它总是 offline），也不把旧的顶层 location 优先于当前 presence。世界元数据通过固定、验证过的 world ID 查询并在内存缓存，最多 32 条、有效期一小时；每次观测仍重新判定当前位置，缓存不会维持旧房间。[UserState 规范](https://github.com/vrchatapi/specification/blob/master/openapi/components/schemas/UserState.yaml)、[VRCX 当前用户处理](https://github.com/vrcx-team/VRCX/blob/01aaf037aa6f4af0ea6777879a1be3bd3c4ab393/src/stores/user.js)、[VRCX 位置解析](https://github.com/vrcx-team/VRCX/blob/01aaf037aa6f4af0ea6777879a1be3bd3c4ab393/src/shared/utils/locationParser.js)

- 可见且 `releaseStatus: public` 的世界：名称（去控制字符、最多 120 字符）、访问标签 `public / friends / friends+ / group public / group+`，以及通过地址校验的可选 `thumbnailUrl`。
- Invite、Invite+、群组 members、未公开世界、`ask me / busy` 或 API 隐藏位置：`location: {kind: private}`，页面显示 `PRIVATE`，不发布名称或世界图片。
- 切换世界：`location: {kind: traveling}`，页面显示 `TRAVELING`，不发布目的地。轮询可能错过很短的切换阶段。
- 未识别、矛盾的访问标记或缺少有效世界元数据：`location: {kind: unknown}`，不猜测房间名称或公开程度。
- `active / offline`：不携带 location，旧房间名立即清除。旧记录超过 180 秒也清除名称并回退到新鲜 Discord 活动或 `NO PUBLIC SIGNAL`。

`profile` 仅允许去控制字符、最多 80 字符的显示名和头像地址；`availability` 仅允许 `active / join me / ask me / busy`。状态灯参考 VRCX：Online 绿、Join Me 蓝、Ask Me 橙、Busy 红；account active 使用空心灯，与实际游戏在线区分。[VRCX 状态与头像处理](https://github.com/vrcx-team/VRCX/blob/01aaf037aa6f4af0ea6777879a1be3bd3c4ab393/src/shared/utils/user.js)

头像和世界图只接受 `api.vrchat.cloud` 上固定格式的 HTTPS file/image 地址，禁止 query、userinfo、fragment 和其他域名。加载图片无需向浏览器提供 Cookie。大传送门下方显示账号信息，头像仅在下方；中心默认保留原来的花背景图片及唱片式效果，进入可见世界且图片加载成功后才切换。私人、切换中、无图片、加载失败和记录过期时恢复花背景，旧世界图片与旧名称一同清除。

原始 world/instance ID、nonce、加入链接、好友、群组名称、邮箱、自定义状态文本、Cookie 和响应正文不进入公开 KV，也不记录长期游戏轨迹。不会把电脑关机等同于账号离线，因为可能正在 Quest 上玩。未知、断网、认证失效不会被改写成 offline；停止更新后自然过期。

## 接收与发布协议

已有 VPS 方案可让过滤模块直接复用服务器端 Lanyard 发布方式，不必新增公网 POST。若为 Windows 来源增加专用 HTTPS `POST /api/vrchat` 接收器（尚未实现），采用以下协议；两条路径都必须执行过滤、观测时间校验和固定键发布：

1. 使用请求头中的专用 token 验证；比较采用恒定时间函数，不接受 URL query 中的凭据。token 只能发布固定键 `vrchat_presence`，不能操作任意 KV 或其他账户。
2. 限制 JSON 请求体 1KB，拒绝额外字段，校验枚举与 ISO 时间。拒绝超过服务器时钟 60 秒的未来时间、超过 180 秒的旧记录及乱序时间；建议每个发布者每 30 秒一次、允许短暂两次突发。校验时间范围同时避免重放旧状态。
3. 本地桥接器先过滤；服务器再做同样的白名单过滤。只保存一条最新记录。发布失败不能用服务器当前时间刷新旧观测时间。
4. 接收器用自身私有 `LANYARD_API_KEY` 向现有 Lanyard `/v1/users/{owner}/kv` 发 PATCH，仅更新 `vrchat_presence` 的 JSON 字符串。复用仓库 `api/music/index.js` 的发布方式。
5. 匿名 GET `/api/presence` 再执行原有 KV allowlist / sanitizer，仅返回经过白名单过滤的 `{status, observedAt, availability?, profile?, location?}`。公开读取不需要写入 token，也绝不能返回服务器凭据。

Lanyard 本身有公开读取接口，所以必须**在写入 KV 前**完成隐私最小化，不能只依靠本站的读取过滤遮住原始数据。[Lanyard KV 文档](https://github.com/Phineas/lanyard#key-value-kv-store)

VPS relay 使用现有 TLS 反向代理；接收服务只监听 localhost，关闭认证头和请求体日志，公开端点只暴露过滤后的结果。保留必要的成功/失败计数，不记录长期游戏轨迹。无需新增复杂数据库、公开 VRCX 管理界面或修改 Azure 安全组中的 SSH 设置。

## 频率、过期与失败兜底

- 优先使用本地已存在的新鲜状态事件，避免为了网页再次向 VRChat 请求。验证数据源持续有效后，状态改变时发布，并每 60–75 秒补一次心跳；每次心跳都必须对应一次有效的当前观测，不能给历史数据库行重新打时间戳。
- 若不得不用独立 API 轮询，建议从 60–90 秒随机间隔开始；这是保守设计值，不是官方承诺的配额。不要与 VRCX 同时重复查询。设置真实的 `applicationName/Version contactInfo` User-Agent。
- 429 尊重 `Retry-After`；无该头或连续网络/5xx 错误时，从至少 60 秒开始指数退避，最大 15 分钟并加入随机偏移。401 转入需要本人登录状态。请求超时建议 10 秒，一次只保留一个在途请求。
- 现有前端将独立记录的有效期设为 180 秒。超过期限后，依次使用实际 Discord VRChat 活动、`NO PUBLIC SIGNAL`。停止更新不能继续显示陈旧在线状态；新增独立计时器在读取失败、缓存返回或页面恢复前台时也执行过期检查。
- 页面仍使用现有匿名接口，每 10 秒在可见时读取；访客人数不能增加 VRChat API 查询次数。缓存复用已有策略，并在客户端依据原始 `observedAt` 判断新鲜度。

## 已实施内容与当前边界

- iPhone 的 `phone_presence` 继续控制 01.01 与首屏；VRChat 的 `vrchat_presence` 只控制 01.07。两者互不改写。01.01 标签为 `iPhone`，沿用绿 / 红 / 紫状态灯。`active` 不亮游戏在线，显示 `ACCOUNT ACTIVE`；发布器取 API `state`，忽略历史 `last_platform`；社交偏好用于状态灯及隐藏位置。社区 SDK 的 UserState 规范明确 `/auth/user` 返回的 state 总是 offline，不能用它判定游戏状态；本模块使用 `/users/{id}`。目前尚未做本人实际启动/退出游戏的映射验收。[UserState 规范](https://github.com/vrchatapi/specification/blob/master/openapi/components/schemas/UserState.yaml)
- `bridge/vrchat/presence_publisher.py` 在已有采集器中串行复用 session，不读取 Cookie 文件，不创建登录，只有启用并匹配本人 ID 时才查询。单次请求超时 8 秒，间隔 60–90 秒随机；失败指数退避，429 尊重 Retry-After，401/2FA 停止更新并等待原采集器登录处理。Lanyard 写权限无效时关闭发布直到配置修正并重启。
- 写入使用独立 HTTP session，固定账户和固定 `vrchat_presence` 键；发布前丢弃整个原始对象，只输出 `{status: online|active|offline, observedAt, availability?, profile?, location?}`；各字段遵循上面的已批准规则。仅保留当前记录，失败不重新给历史记录打时间戳，也不伪造 offline。
- 预览专属 `experiments/after-hours/api/presence.js` 替换旧 rewrite，直接读取已核验的同一个公开 Lanyard 用户。该函数没有写 key 或 VRChat Cookie，不支持写请求，不允许访客指定上游。读取后使用原有 sanitizer / KV allowlist。实验目录中的 sanitizer 是指向原模块的符号链接，部署时上传原模块内容；没有第二份过滤规则。
- 独立过期检查在页面前台每 10 秒及恢复前台时执行，成功读取与否都不影响 180 秒有效期。旧 Discord 活动也会过期；没有新鲜证据时显示 `NO PUBLIC SIGNAL`。iPhone 保留原有 36 小时 Focus 更新规则。
- 原站与预览原代理曾因请求 User-Agent 返回 Cloudflare 403，带正常浏览器 UA 时现已验证 HTTP 200。新的预览读函数直接读取 Lanyard，不修改原站防护或原站 API。
- 已有原站 iPhone 记录与预览记录一致，发布前后状态和更新时间未被改写。首次接通时的真实 `vrchat_presence` 仅有 `status` 和 `observedAt`（当时为 account active）；首次成功观测时间为 2026-10-10 04:48:42.466 UTC，后续观测更新至 04:52:24.570 UTC。服务已连续发布四次，无发布警告或新的登录标记。
- 实际浏览器显示 `OWNER SYNC / ACCOUNT ACTIVE`，游戏在线效果未亮起。用户确认此时仅挂着 VRCX、没有进入任何世界；此场景与 `active` 对得上。不能由此推断游戏启动、进入世界或退出游戏的全部状态转换均已验收。
- 使用首条真实公开记录在本地页面回放一次成功读取，后续读取返回 503；等待实际观测时间满 180 秒后，页面回退为 `NO PUBLIC SIGNAL`，iPhone 仍显示 `Mostly online / iPhone / Focus`。没有停止真实 VPS 采集器，也没有向公开 Lanyard 写测试状态。

## 2026-10-10 世界展示扩展核验

VPS 发布模块已于 06:38:21 UTC 更新并备份；两个原有账户均恢复登录。06:38:24.865 UTC 的真实记录为 `active`，仅含 status 和 observedAt，没有世界或实例。Lanyard 与预览读链的观测时间一致；iPhone 的状态与更新时间也和原站一致。该场景沿用用户先前确认的“仅 VRCX 挂着、未进入世界”，不代表已验证游戏内转换。

发布器 16 项测试已在本机和 VPS 通过；网页完整检查包含 174 项测试、构建与 8 项产物检查，均通过。本地浏览器以样例验证公开世界、Friends+ 长名称、PRIVATE、TRAVELING 以及读取失败后 180 秒清除旧世界名；移动 390px 无横向溢出。没有向公开服务发送样例状态。用户暂时不方便进入世界，先完成部署；真实启动、进入、离开世界的转换仍需实际游戏会话验收。

## 2026-10-10 账号与世界图扩展核验

VPS 模块于 07:20:24 UTC 更新并重启，旧模块备份于 `after-hours-profile-backup-20261010T072023Z`。两账户均登录成功，无新的登录标记或发布警告。07:20:26.774 UTC 的真实记录为 account active，包含本人显示名、有效头像地址和 `availability: active`，不含世界；iPhone 的状态与更新时间未被改写。头像地址已用无 Cookie 请求验证 HTTP 200。

本机与 VPS 的发布器 20 项测试均通过；网页完整检查包含 178 项测试、构建与 8 项产物检查，均通过。本地浏览器验证世界图片加载、默认花背景、PRIVATE、TRAVELING、Busy 隐藏、图片加载失败、三色 iPhone 灯，以及实际等待 180 秒后旧世界名称与图片同时清除。390px 手机布局无横向溢出，保留大传送门及下方账号信息。图片切换用明确标注的本地样例检查，未向公开服务写入样例；实际游戏内进入/离开世界仍待后续验收。

## 私有配置与维护

私有配置已由用户填写并启用，权限与文件所有者已核验；不需要再次提供 key。需要更换 Lanyard key 时，在 VPS 的私有 SSH 会话中执行已有设置脚本：

```sh
python3 /home/azureuser/vrcx-collector/after-hours-hook-staging/configure_presence.py
```

输入用于 iPhone 同步的 Lanyard API key（输入不显示）。它写入权限 0600 的 `presence-private.json`，不写入 GitHub、不进入网页；不要提供 VRChat Cookie、账户密码或 2FA 秘钥。更换配置后重启 `vrcx-collector.service`，再检查真实时间戳是否继续更新。源认证失效时使用原采集器的私有登录流程；只有本人完成必要的 2FA 后才恢复有效观测。

回退：关闭私有配置的 enabled 或移走该配置即可在下一次重启时禁用发布。完整代码回退使用 VPS 安装时保存的 `after-hours-backup-<UTC timestamp>/collector.py`，然后重启原服务；模块可留在磁盘上但不再调用。预览读链回退可恢复旧 rewrite，原站与 main 全程不变。

## 验证边界

自动检查覆盖 iPhone online / VRChat offline、iPhone sleeping / VRChat online、网页 active、旧数据和未来时间、接口失败、任意上游参数、过滤敏感字段、源 401/429/500、Lanyard 401、无效私有配置、日志不记录状态历史，以及禁用时零请求。新增世界名、私人位置、切换世界、当前 presence 优先、缓存不能保留旧房间、矛盾访问标记和认证/世界查询失败的覆盖；发布器 16 项测试通过。前端和匿名过滤测试也覆盖新位置结构、敏感字段丢弃及独立 iPhone 状态。

初次接通已验证真实发布、持续更新时间、预览匿名读取和当前账号活跃状态。此次世界展示扩展在本地浏览器用样例验证公开、长 Friends+ 名称、PRIVATE、TRAVELING 及 180 秒后旧世界名清除；这些样例没有写入公开 Lanyard。本地浏览器以真实记录验证读取持续失败时的 180 秒过期回退；这没有模拟真实服务器停机。当前仅 VRCX 活跃且未入世界的场景获得用户确认，实际启动/进入/退出 VRChat 游戏的转换仍待验收。原站与 main 未修改；原站原 allowlist 不返回新 VRChat 键。
