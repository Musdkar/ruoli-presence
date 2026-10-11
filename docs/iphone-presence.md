# iPhone 状态：在线、勿扰、睡眠

网站已支持接收这三种状态。手机自动化和账号凭据尚未配置，不能把此版本理解为已经连上 iPhone。

## 状态含义

| iPhone 当前专注模式  | 上传值     | 网站显示       |
| -------------------- | ---------- | -------------- |
| 睡眠                 | `sleeping` | sleeping       |
| 勿扰模式             | `dnd`      | do not disturb |
| 其余模式或未开启专注 | `online`   | online         |

`online` 表示你的可用状态偏好，不代表手机已解锁或正在使用；`sleeping` 表示睡眠专注已开启，不是 Apple Health 的实际入睡检测。

## 链路

iPhone 快捷指令 → 本站 `/api/phone-presence` → 服务端写入 Lanyard 的 `phone_presence` KV → 现有 WebSocket → Home 和左侧身份栏。

手机不直接访问 `api.lanyard.rest`：该域名在部分网络环境（如中国大陆未代理时）不可达，会导致自动化静默失败。中转端点放在本站域名下，手机只要能访问本站即可同步；Lanyard API key 只保存在服务端环境变量中，不放进快捷指令。

只覆盖保存最新的 `status` 和 `updatedAt`，不上传通知、位置、App、屏幕使用记录或专注模式的其他配置。更新会公开在 Lanyard API 中。网站优先显示有效的手机状态；没有这个 KV 时继续显示 Discord 状态。超过 36 小时未更新或数据格式错误时显示 `not synced`，不会把过期的“睡眠”一直当成当前状态。

## 先配置 Lanyard

1. 加入 [Lanyard Discord server](https://discord.gg/lanyard)，让它开始跟踪你的 Discord ID。
2. 在网站的 Vercel 环境变量中设置 `VITE_DISCORD_ID` 为这个 ID，重新部署。
3. 按 [Lanyard 官方文档](https://github.com/Phineas/lanyard#kv)，向 Lanyard bot 获取个人 API key。把它设置为部署环境的 `LANYARD_API_KEY` 环境变量（与 `LANYARD_USER_ID`、`INGEST_TOKEN` 放在一起），不放进前端、快捷指令、GitHub、截图或聊天。

手机同步链路经过本站中转，不要求手机能访问 Lanyard，也不需要建立公开管理后台或额外的数据库。

## 建立一个“同步网站状态”快捷指令

1. 添加“获取当前专注模式”。取其名称，用你手机实际显示的名称判断：睡眠 → `sleeping`；勿扰 → `dnd`；其他或空值 → `online`。
2. 添加“获取 URL 内容”：
   - URL：`https://你的域名/api/phone-presence`
   - 方法：`POST`
   - 标头：`X-Ingest-Token` = 与服务端 `INGEST_TOKEN` 相同的值；`Content-Type` = `application/json`
   - 请求体：JSON，增加一个**文本类型**字段 `status`，值选择上一步的状态变量。

   ```json
   { "status": "online" }
   ```

   `updatedAt` 可以省略，服务端会用自己的时钟；也可以附带一个 ISO 8601 字符串，但超过 36 小时或超前服务端时钟 5 分钟以上的值会被拒绝。

3. 先手动运行一次。接口返回 `{"ok":true,...}` 后，在网站上确认状态和左栏同步变化。网络失败时不能假定网站已经更新；重新运行即可。

## 建立自动化

- 勿扰模式开启和关闭时运行同一个快捷指令。
- 睡眠专注开启和关闭时运行同一个快捷指令。
- 每天早晚各定时运行一次，刷新未发生变化的状态，避免超过 36 小时有效期。
- 自动化选择允许立即运行/无需询问的选项；具体名称以当前 iOS 为准。
- 在专注模式变化的自动化中，先等待约 2 秒，再运行快捷指令并重新读取**当前专注模式**。不要让“勿扰关闭”事件直接硬编码发送 online，否则从勿扰切换到睡眠时容易发送错误状态。

手机离线或自动化没有执行时，更新会延迟。这个方案无法保证系统级在线检测或零延迟。

## 验收与撤销

依次切换“无专注 → 勿扰 → 睡眠 → 无专注”，确认 Home 和身份栏都对应变化。保持网页打开，无需刷新。

撤销时，停用这些 iPhone 自动化，并按 Lanyard 文档删除 `phone_presence` KV；网站会恢复原有 Discord 状态显示。

参考：[Apple 专注模式触发器](https://support.apple.com/guide/shortcuts/apde31e9638b/ios)、[Apple 无需询问的自动化](https://support.apple.com/guide/shortcuts/apd602971e63/ios)、[快捷指令 HTTP 请求](https://support.apple.com/guide/shortcuts/request-your-first-api-apd58d46713f/ios)、[Lanyard KV API](https://github.com/Phineas/lanyard#kv)。
