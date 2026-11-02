# 2026-11-02：Intel 写入 502 修复与续接

部署报告确认本地采集、Intel 架构、凭据检查均通过；暂不安装上传任务的处理正确。现已定位原网站实现中的存储键名兼容错误：外部设备标识 `mac-intel` 不能直接用作 Lanyard 键名的一部分，因为上游只允许字母、数字和下划线。

修复仅发生在网站服务端适配及读取逻辑：

| 项目             | 保持 / 修正后                  |
| ---------------- | ------------------------------ |
| PC 配置 DEVICE   | **继续用 `mac-intel`，不要改** |
| 软件公开键       | `apps_today_mac_intel`         |
| 键盘公开键       | `keyboard_today_mac_intel`     |
| 音乐公开键       | `music_now_mac_intel`          |
| 原 Mac / Windows | 仍用 `mac` / `win`，不变       |

官网已发布修复后，原包内两个 collector 无需修改，私有 JSON 无需修改，客户端无需重装。原报告和原 ZIP 可以保留作为记录；新版包只更新网站补丁、说明和版本信息。

## 让 Intel 端 agent 继续

先确认 `https://kalieri.com/lib/computer-presence.mjs` 已使用 `keyboard_today_mac_intel` / `music_now_mac_intel`。在**Intel PC 的原包根目录**运行；不要在原 Mac 上以 Intel 身份上传：

```sh
python3 bridge/pc-kit/run_bridge.py "$HOME/.config/ruoli-presence/bridge.json" whatpulse
python3 bridge/pc-kit/run_bridge.py "$HOME/.config/ruoli-presence/bridge.json" music
```

第一条应返回 200 且 `updated.software` / `updated.keyboard` 均为 true；第二条须在目标机实际播放后，从 `/api/presence` 读回 `music_now_mac_intel`。上述三个公开键都已改为下划线后缀，不能继续检查带 `-` 的旧键名。

若仍然出现 502，请回传 HTTP 状态和响应 JSON（例如 `error`、上游 `status`），不要提供 token、请求头、私有配置或封面 base64。已确认的键名错误不等于能预先排除其他运行时故障；真实目标上传和读回仍须验证。

验证通过后，停止手动音乐进程，再按原 AGENT.md 安装两个同步 LaunchAgent，完成 Apple Music、网易云切歌/退出、90 秒降级、重复上传、双系统切换和重新登录验收。

依据：[Lanyard 官方限制](https://github.com/Phineas/lanyard#limits)与[实际 KV 校验源码](https://github.com/Phineas/lanyard/blob/main/lib/kv/interface.ex)。本次新增回归测试直接按上游键名/长度限制拒绝无效 PATCH，已先复现两条上传路径的 502，再验证修复。
