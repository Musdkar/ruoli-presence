# 原 Mac 实测基线

检查日期：2026-11-02（UTC+8）。这是观测记录，不能当成目标 Intel Mac 已部署成功的证据。

| 项目            | 本机观测                                                                                                                           |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| 系统            | Apple Silicon arm64；macOS 27.0.1                                                                                                  |
| 仓库            | `/Users/kalieri/project/ruoli-presence`                                                                                            |
| 网站            | `https://kalieri.com`，Azure Static Web Apps；GitHub main 推送触发既有工作流                                                       |
| ActivityWatch   | `/Applications/ActivityWatch.app`，0.13.2                                                                                          |
| AW 配置         | `~/Library/Application Support/ActivityWatch/*/*.toml`，所见项目均为注释默认配置                                                   |
| AW 当前状态     | 5600 无监听、无 watcher 进程；读取 localhost 被拒绝。最近 bridge 日志只成功发布键盘；公开 Mac 软件日期停留 2026-10-12              |
| WhatPulse       | `/Applications/WhatPulse/WhatPulse.app`，6.3.2，进程运行                                                                           |
| WhatPulse DB    | `~/Library/Application Support/WhatPulse/whatpulse.db`；只读查表确认 day/hour/count/profile_id，以及频次表的 key；数据日期包含当天 |
| Python          | Homebrew 3.12.14；原任务用 `/opt/homebrew/opt/python@3.12/bin/python3.12`                                                          |
| Node            | `/opt/homebrew/bin/node`，v26.8.2                                                                                                  |
| 统计任务        | `~/Library/LaunchAgents/com.ruoli.whatpulsebridge.plist`；RunAtLoad + StartInterval=900，DEVICE=mac；loaded，上次 exit=0           |
| 音乐任务        | `~/Library/LaunchAgents/com.ruoli.musicbridge.plist`；RunAtLoad + KeepAlive；进程运行                                              |
| 音乐读取器      | `bridge/nowplaying/nowplaying-cli` 及 `build/mediaremote-mini/MediaRemoteMini.dylib` 均仅 arm64；未在 Intel 验证                   |
| 读取器现场测试  | `get-raw` 正常退出、返回空 JSON（当时无可读媒体会话）；不能据此声称播放成功                                                        |
| 网易云          | `/Applications/NeteaseMusic.app`，3.1.11 (3415)，bundle `com.netease.163music`                                                     |
| Apple Music     | `/System/Applications/Music.app`，1.7 (1.7.0)，bundle `com.apple.Music`                                                            |
| 上传            | HTTPS `/api/whatpulse` 与 `/api/music`；X-Ingest-Token；后端持有 Lanyard 凭据                                                      |
| 权限 / 离线模式 | 未读取或修改系统权限库；未确认 WhatPulse Work Offline 设置，目标端需按指南检查                                                     |

原机 bridge 源码提供软件名前台时长汇总、0–15 级按键热度与当天按键总数，**不会上传窗口标题、URL、按键顺序、逐小时桶或精确逐键次数**。数据库用 SQLite `mode=ro` + `query_only` 读取。

本任务没有修复原 Mac 上未启动的 ActivityWatch，没有复制其私人数据库或凭据，也没有修改原机两个 LaunchAgent。整合包的目的是让目标机正确复刻并验收，不是把故障状态一同复制过去。
