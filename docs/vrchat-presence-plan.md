# AFTER HOURS 的 VRChat 状态同步方案

核验日期：2026-10-10。用户说明 VPS 已保存 VRChat 登录 Cookie，并用于检测好友状态。本次没有检查该服务的登录有效性、实现或输出；尚未连接网站发布链路。

## 建议采用的路径

**针对你已有的 VPS：现有采集器 → 本人状态过滤模块 → Lanyard KV → 匿名只读 `/api/presence` → AFTER HOURS。**

先检查并复用现有采集器的会话、调度与已获取的本人状态，不再创建第二套登录或并行轮询。Cookie 继续仅由现有私有采集进程持有；新发布模块与网站只处理状态和观测时间，不能读取或复制 Cookie。若当前采集器只输出好友状态，要增加本人状态适配，并计入同一限频预算。

这是对现有服务的最小扩展建议，不是对云端访问官方合规性的保证。若会话频繁失效、遇到 IP 挑战，或希望采用更符合设备/IP 指引的来源，再切换到 Windows 本地 VRCX → HTTPS 接收器 → 同一发布链路。两种来源只能启用一个，避免相互覆盖。

1GB VPS 可以作为轻量发布模块的候选：优先在现有程序中增加一个小模块，保存单条最新记录，不需要在 VPS 上运行完整 VRCX 桌面程序或新增公网入口。若使用独立接收器，给它设置例如 128MB 的内存预算并测量实际占用；这不是对当前 VPS 剩余资源的保证，本次没有检查或修改你的服务器。

## API 能做什么，官方怎样看待

VRChat 的最新 Creator Guidelines 允许按规则开发 API 应用，但没有官方公共 API 文档或第三方支持，接口可能变化；目前没有 OAuth。规则要求限频、缓存、错误退避、随机化轮询及可识别的 User-Agent，并强调账户访问应来自用户自己的设备和 IP。因此，**选择本地采集、云端仅转发，是本方案对这些规则的设计判断**，不能把自有 VPS 当成自动获得许可的例外。[官方 Creator Guidelines](https://hello.vrchat.com/creator-guidelines)

服务条款也限制未经授权的数据提取与不符合个人正常使用的自动访问。第三方工具可以技术上工作，不等于获得官方兼容性或账号安全保证。[VRChat Terms of Service](https://hello.vrchat.com/legal)

社区维护文档显示：首次 `GET /auth/user` 可使用 Basic 认证建立会话，之后复用 `auth` Cookie；`GET /users/{userId}` 同样要求认证。不存在一个把“公开 key”放进网页就能匿名查询实时状态的接法。不要每次轮询都重新登录，也不要假定会话数量或有效期固定。[登录与会话](https://vrchat.community/reference/get-current-user)、[用户接口](https://vrchat.community/reference/get-user)

有 2FA 时，在本机由你完成验证码输入，再验证当前用户身份。TOTP 与邮箱验证码有不同的验证路径；采集器应处理真实响应，不能靠关闭 2FA 或自动保存 TOTP 种子解决无人值守登录。[TOTP 验证](https://vrchat.community/reference/verify2fa)、[邮箱验证码验证](https://vrchat.community/reference/verify2faemail-code)、[社区 Python SDK 示例](https://github.com/vrchatapi/vrchatapi-python)

## 三种方案比较

| 方案 | 适合的工作 | 主要问题 | 建议 |
| --- | --- | --- | --- |
| GitHub Actions + Secrets | 构建、部署、低频检查 | 定时最短 5 分钟，会延迟或丢弃任务；只在默认分支运行；临时运行器难以安全持续保存更新后的 Cookie，并从云端 IP 访问 VRChat | 不作为实时状态采集器 |
| VPS private daemon 直接访问 VRChat | 复用你已运行的采集器，电脑关闭后仍可观测服务端状态 | 服务器持有账户会话、异地 IP、登录挑战；与官方设备/IP 指引存在冲突，不能保证合规或稳定 | 本次先评估复用现有服务，不新增会话；只扩展最小发布模块 |
| Windows 本地 VRCX 同步 | PC 使用时，复用本机已有状态与本人登录流程 | 需要核验版本和可用接口；电脑关机时不能覆盖 Quest 独立使用 | 更贴近设备/IP 指引，作为替代来源；使用同一过期与兜底协议 |

GitHub 的调度限制见[官方 schedule 文档](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)。VRCX 是维护中的 VRChat 工具，但不能假定每个版本都提供现成的通用 HTTP 状态接口；实施前检查你安装的版本与实际数据入口。[VRCX 项目](https://github.com/vrcx-team/VRCX)

## 凭据分别放在哪里

**代码可以提交 GitHub；任何实际密码、Cookie、token、2FA 秘钥都不能提交，包括私有仓库。** 已泄露的凭据要撤销或轮换，仅删除文件无法清除历史。

| 内容 | 放置位置 | 用途 |
| --- | --- | --- |
| 已有 VRChat 登录会话 | 现有 VPS 采集器的私有 cookie jar；或替代方案中的本机 VRCX | 保持原持有者范围，不复制给 GitHub、网页或新接收器 |
| `VRCHAT_INGEST_TOKEN`（拟新增） | Windows 的凭据存储；接收器的私有配置 | 只允许向本站单一状态入口发布 |
| 现有 `LANYARD_API_KEY` | 接收器所在后端的环境配置 | 写入 Lanyard KV；不交给浏览器或 Windows bridge |
| GitHub Actions Secrets | GitHub 仓库或环境设置 | 只供需要的 CI 任务读取，例如部署凭据 |
| 非敏感的接口地址、字段约定 | 仓库配置 | 可公开、可审查 |

Secrets 是 GitHub 提供的加密配置机制，环境变量是程序运行时接收配置的途径；两者不是不同的登录凭据，也不会自动同步到 VPS 或 Vercel。普通 GitHub Variables 不用于秘密。日志遮蔽不是完整防泄露措施，不输出认证头，不上传 Cookie 到缓存或构建产物，限制可读取 Secrets 的工作流权限。[GitHub Secrets 文档](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets)

浏览器代码与 `VITE_*` 等前端构建变量会被访客读取，不能放以上任何发布或身份凭据。VPS 使用专用普通用户与权限 0600 的私有配置；Windows 使用仅本人可读取的 ACL / 系统凭据存储。

已有采集器或将来的自用本地采集器，应使用受保护、可持久化的 cookie jar 保存服务器实际发回的认证及 2FA 会话 Cookie，遵循域名和过期属性，原子写入更新。401 或新登录挑战时进入 `needs_login`、暂停发布，等待你在现有采集器的私有交互流程重新登录；不进行密码重试循环，不承诺固定刷新周期。若采用 VRCX 来源，让 VRCX 管理自身会话，而非从其数据库提取 Cookie。

## 对外数据与状态语义

沿用现有前端支持的最小记录，仅公开两个字段：

```json
{
  "status": "online",
  "observedAt": "<真实观测时刻的 UTC ISO 时间>"
}
```

上面是格式示例，不是已采集数据。公开 `status` 枚举沿用 `online / active / join me / ask me / busy / offline`；你可以只公开 `online`，减少社交偏好暴露。未知时不写 `offline`，而是停止更新、让记录过期。

VRChat 用户数据中的 `state` 与 `status` 是不同字段。社交偏好 `active` / `busy` 不能独立证明正在游戏；VRCX 正在运行、网页登录成功、VRChat 进程存在或 SQLite 中有历史记录，也不能独立证明当前会话在线。适配器必须在当前版本上验证实际游戏状态的映射，未识别的新值进入未知态。任何原始位置只在本地用于判定，之后立即丢弃。[用户响应字段](https://vrchat.community/reference/get-user)

不上传世界名、world/instance ID、访问密钥、好友列表、头像、邮箱、用户自定义状态文本或原始日志。不把关机等同于 VRChat 账号离线，因为可能正在 Quest 上玩。可靠地确认结束会话后才能发送 `offline`；只是断网、休眠或数据源失效时等待过期。

## 接收与发布协议

已有 VPS 方案可让过滤模块直接复用服务器端 Lanyard 发布方式，不必新增公网 POST。若为 Windows 来源增加专用 HTTPS `POST /api/vrchat` 接收器（尚未实现），采用以下协议；两条路径都必须执行过滤、观测时间校验和固定键发布：

1. 使用请求头中的专用 token 验证；比较采用恒定时间函数，不接受 URL query 中的凭据。token 只能发布固定键 `vrchat_presence`，不能操作任意 KV 或其他账户。
2. 限制 JSON 请求体 1KB，拒绝额外字段，校验枚举与 ISO 时间。拒绝超过服务器时钟 60 秒的未来时间、超过 180 秒的旧记录及乱序时间；建议每个发布者每 30 秒一次、允许短暂两次突发。校验时间范围同时避免重放旧状态。
3. 本地桥接器先过滤；服务器再做同样的白名单过滤。只保存一条最新记录。发布失败不能用服务器当前时间刷新旧观测时间。
4. 接收器用自身私有 `LANYARD_API_KEY` 向现有 Lanyard `/v1/users/{owner}/kv` 发 PATCH，仅更新 `vrchat_presence` 的 JSON 字符串。复用仓库 `api/music/index.js` 的发布方式。
5. 匿名 GET `/api/presence` 再执行原有 KV allowlist / sanitizer，仅返回 `{status, observedAt}`。公开读取不需要写入 token，也绝不能返回服务器凭据。

Lanyard 本身有公开读取接口，所以必须**在写入 KV 前**完成隐私最小化，不能只依靠本站的读取过滤遮住原始数据。[Lanyard KV 文档](https://github.com/Phineas/lanyard#key-value-kv-store)

VPS relay 使用现有 TLS 反向代理；接收服务只监听 localhost，关闭认证头和请求体日志，公开端点只暴露过滤后的结果。保留必要的成功/失败计数，不记录长期游戏轨迹。无需新增复杂数据库、公开 VRCX 管理界面或修改 Azure 安全组中的 SSH 设置。

## 频率、过期与失败兜底

- 优先使用本地已存在的新鲜状态事件，避免为了网页再次向 VRChat 请求。验证数据源持续有效后，状态改变时发布，并每 60–75 秒补一次心跳；每次心跳都必须对应一次有效的当前观测，不能给历史数据库行重新打时间戳。
- 若不得不用独立 API 轮询，建议从 60–90 秒随机间隔开始；这是保守设计值，不是官方承诺的配额。不要与 VRCX 同时重复查询。设置真实的 `applicationName/Version contactInfo` User-Agent。
- 429 尊重 `Retry-After`；无该头或连续网络/5xx 错误时，从至少 60 秒开始指数退避，最大 15 分钟并加入随机偏移。401 转入需要本人登录状态。请求超时建议 10 秒，一次只保留一个在途请求。
- 现有前端将独立记录的有效期设为 180 秒。超过期限后，依次使用实际 Discord VRChat 活动、`NO PUBLIC SIGNAL`。停止更新不能继续显示陈旧在线状态；新增独立计时器在读取失败、缓存返回或页面恢复前台时也执行过期检查。
- 页面仍使用现有匿名接口，每 10 秒在可见时读取；访客人数不能增加 VRChat API 查询次数。缓存复用已有策略，并在客户端依据原始 `observedAt` 判断新鲜度。

## 现在的代码与发布边界

本次核对了实际分支：

- `experiments/after-hours/main.js` 已能读取 `kv.vrchat_presence`，并按上述 180 秒规则优先显示，再退回 Discord 活动。
- feature 分支的 `api/lib/presence-sanitize.mjs` 已将该键加入 allowlist，且只保留两个字段。
- 但预览项目的 `vercel.json` 把 `/api/presence` 转发到 **原站 `kalieri.com/api/presence`**。当前 GitHub `main` 的 sanitizer 未包含该键。只更新实验站前端，不会让原站后端自动支持这个字段。
- 尚无 VRChat 专用接收器、本地适配器或真实发布记录。本次地图与首屏修改不会改变原站后端。

正式接入有两条发布路径：允许以后独立更新原站 API 的 allowlist；或者在保持 `main` 与原站不动的前提下，给**预览项目**部署独立的只读聚合 `/api/presence`：读取原站已有匿名状态，再从服务器端 Lanyard / relay 取最小记录并应用同一 sanitizer。后一条替换预览的 rewrite，浏览器仍请求同一路径。该聚合器只写入 `vrchat_presence`，不得透传未过滤的整个上游 KV，也不把 VRChat 请求放进匿名请求处理过程。

## 实施顺序与验收

1. 只读检查已有 VPS 采集器的代码、会话成功标记、脱敏错误类别与最新观测时间，不输出 Cookie 或好友数据。确认它能区分本人的游戏状态与网页登录状态；历史数据库和 `systemd active` 都不能证明当前在线。
2. 在现有采集器内增加本人状态过滤与发布模块，复用会话与限频，不复制凭据或启动重复采集进程。服务器配置 Lanyard 发布凭据，然后部署预览专属读链，避免修改 `main`。直接服务器发布路径无需给 Windows 发新 token。
3. 若改用 Windows 来源，核验 VRCX 版本与可用输出接口，再部署上述 HTTPS 接收器、专用 token 与普通用户启动任务；本人完成本地登录与 2FA。不假定通用 HTTP API，不同步数据库或 Cookie。两条路径都须先确认真实记录经过过滤后能从匿名接口读取。
4. 做一次真实游戏启动、退出、断网、源停止后的过期测试；同时检查伪造 token、超大请求、额外敏感字段、乱序数据、401/429 退避。测试数据只进入隔离环境，不用假在线记录装饰公开页面。
5. 匿名请求与浏览器都显示真实状态、数据过期能退回未知且凭据不外泄，才算接通。撤销入口 token 并停止任务即可暂停同步；将预览路由恢复原来的 rewrite 即可回退读链。

本方案已经把可复用代码、仍需部署的部分、本人登录和最终验收分开。当前只能确认设计与现有读适配器，不能声称 VRChat 实时同步已完成。
