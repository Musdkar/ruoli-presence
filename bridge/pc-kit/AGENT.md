# 交给 PC 上 agent 的执行说明

目标：在这台 Windows / Intel 黑苹果双系统 PC 上复刻原 Mac 的网站统计与音乐同步。只配置这些功能；不要修改网站外观、其他服务或系统安全设置。先读本文，再读 `BASELINE.md` 和 `ACCEPTANCE.md`。

## 数据身份与整合规则

| 机器 / 系统            | DEVICE      | 数据槽                                              | 网页显示 |
| ---------------------- | ----------- | --------------------------------------------------- | -------- |
| 原 Apple Silicon Mac   | `mac`       | `apps_today_mac` / `keyboard_today_mac`             | MACBOOK  |
| PC 的 Windows          | `win`       | `apps_today_win` / `keyboard_today_win`             | PC       |
| 同一 PC 的 Intel macOS | `mac-intel` | `apps_today_mac-intel` / `keyboard_today_mac-intel` | PC       |

**黑苹果必须用 `mac-intel`，绝不能用默认的 `mac`，也不要与 Windows 共用 `win`。** 不需要建立 `pc` 上传槽。

网站保留三个来源的当天累计快照：Windows 和 Intel 的键盘总数相加，逐键热度取两者较高值；软件卡汇总三个来源的同名应用时长。0–15 级热度是粗略视觉值，不能还原为精确逐键次数。每次上传替换本来源的累计值，不是增量；因此重跑不会叠加。只读取 UTC+8 当天数据；两个 PC 系统请使用正确的 UTC+8 日期和时钟。不同程序名（如 Edge 与 msedge.exe）保持原名，不猜测合并。

不要把原 Mac 的 ActivityWatch / WhatPulse 数据库复制到新机器，也不要让 Windows 与 macOS 共享、同步或互相导入统计数据库，否则会重复统计。历史数据保留在各自系统本地；本站接口保存的是每日最新快照，不是长期历史仓库。

## 1. 先检查，避免重复服务

在黑苹果检查 `uname -m`、`sw_vers`、Python 和 Node 路径。预期 `x86_64`。检查已有 ActivityWatch、WhatPulse、`~/Library/LaunchAgents/com.ruoli.*` 及相关进程；已配置正确的服务优先复用。不要同时运行多个 watcher 或两个相同来源的上传任务。

安装原生 Intel 版本的 ActivityWatch 与 WhatPulse。原 Mac 实测版本分别是 0.13.2 / 6.3.2；安装时以官网当前仍支持目标 macOS 的正式版本为准，检查下列数据库字段兼容性，不要盲目升级或降级已有客户端。

- ActivityWatch：启动应用，开启它自己的开机登录启动；确认 `http://127.0.0.1:5600` 可访问，`aw-watcher-window` 正在记录。按应用提示授予“辅助功能”。保留本地绑定，不开放到局域网或公网。软件统计故意不与 AFK 求交集，阅读、思考、视频等前台时间继续计入。
- WhatPulse：按应用提示授予“辅助功能”和“输入监控”，退出后重新打开，启用它自己的登录启动。优先 Work Offline；网站不依赖 WhatPulse 云端 API。默认数据库是 `~/Library/Application Support/WhatPulse/whatpulse.db`，只读打开。
- Python：推荐 3.12；采集器仅依赖标准库。别把 Xcode 自带的旧 Python 路径当作原 Mac 的 Homebrew Python。Node.js 至少 20（网站 CI 使用 20），使用 Intel 原生版本与绝对路径。

可用 Homebrew 安装缺失的运行时：

```sh
brew install python@3.12 node
"$(brew --prefix python@3.12)/bin/python3.12" --version
command -v node
```

在包根目录执行只读诊断（不会上传）：

```sh
"$(brew --prefix python@3.12)/bin/python3.12" bridge/pc-kit/diagnose.py
```

诊断应看到 ActivityWatch window bucket、WhatPulse `keypresses(day,count)` 与 `keypress_frequency(day,key,count)`。缺少字段时先检查客户端模式/版本，不要写入或改造客户端数据库。

## 2. 网易云音乐与 Apple Music 同步

这里同步的是**歌曲名称、作者、专辑、封面、播放/暂停状态到个人网站**，不迁移歌单、会员、音乐文件或 Apple 账户。

原实现使用系统 Now Playing → `nowplaying-cli get-raw` → Node bridge → `https://kalieri.com/api/music`。两个播放器共享同一个 bridge，不要为两个音乐应用再各启动一份。它读取 macOS 当前媒体会话；同时打开多个播放器时，只能代表系统选中的会话。

包里不含原 Mac 的 arm64 二进制。**在目标 Intel Mac 上构建**，保留命令、动态库、Perl helper 三件套及相对路径。Xcode Command Line Tools 缺失时先用 `xcode-select --install`，待系统安装结束后再构建。

在包根目录执行（`/tmp/ruoli-nowplaying-v2.1.0` 已存在时先检查来源，不覆盖）：

```sh
git clone --depth 1 --branch v2.1.0 https://github.com/kirtan-shah/nowplaying-cli.git /tmp/ruoli-nowplaying-v2.1.0
git -C /tmp/ruoli-nowplaying-v2.1.0 rev-parse HEAD
make -C /tmp/ruoli-nowplaying-v2.1.0
mkdir -p bridge/nowplaying/build/mediaremote-mini bridge/nowplaying/scripts
cp /tmp/ruoli-nowplaying-v2.1.0/nowplaying-cli bridge/nowplaying/
cp /tmp/ruoli-nowplaying-v2.1.0/build/mediaremote-mini/MediaRemoteMini.dylib bridge/nowplaying/build/mediaremote-mini/
cp /tmp/ruoli-nowplaying-v2.1.0/scripts/mediaremote-mini.pl bridge/nowplaying/scripts/
file bridge/nowplaying/nowplaying-cli bridge/nowplaying/build/mediaremote-mini/MediaRemoteMini.dylib
```

v2.1.0 校验提交：`8c8c1fa4820681fd4bbd6a17ce0a5655e1f4ebe7`；不一致先停止检查。两件 Mach-O 文件必须含 `x86_64`，不能只有 `arm64`。也可使用官方 Homebrew 的 `nowplaying-cli`，但要验证它的输出和配套 helper；不要只搬走一个命令文件。

分别打开网易云客户端与 Apple Music 播放一首歌。检查 `bridge/nowplaying/nowplaying-cli get-raw` 输出是否为 JSON，且包含标题、作者、播放速率以及客户端 bundle ID：

- 网易云：`com.netease.163music`
- Apple Music：`com.apple.Music`

不要把包含完整封面 base64 的原始结果贴入聊天或日志。可以在本机解析后只报告字段存在与否。没有媒体会话时 `{}` 是正常的；播放中仍无数据时，不要假报成功。此工具使用私有 MediaRemote 接口，上游测试版本与黑苹果环境不等价；目标 macOS 必须实测。

音乐 bridge 默认每 8000ms 查询；播放或暂停时每 30000ms 刷新；连续三次未读到播放器后保留歌曲并改为 `last_played`。封面本地通过系统 `sips` 压成 JPEG（优先 384px，逐级缩小），上限 26000 字符。离线超过 90 秒，网页也会显示上次播放。

本次网站支持分来源音乐槽：Intel 上传到 `music_now_mac-intel`；原 Mac 的旧 bridge 不传 DEVICE 也会由新 API 视为 `mac`，同时保留 `music_now` 兼容键。网页优先新鲜的正在播放，再暂停，最后最近历史。Intel 任务必须等新网站/API 已部署后才开启；旧 API 只写一个共享槽。

此包现有音乐采集器只支持 macOS；不将它伪装为 Windows 音乐采集器。Windows 的已有软件/键盘上传继续正常运行，网易云和 Apple Music 的本方案在黑苹果系统内运行。

## 3. 配置私有凭据并先手动测试

在用户目录创建私有配置，不要把真实配置放进网站仓库、ZIP 或 `VITE_*` 变量：

```sh
mkdir -p "$HOME/.config/ruoli-presence"
cp bridge/pc-kit/config.example.json "$HOME/.config/ruoli-presence/bridge.json"
chmod 600 "$HOME/.config/ruoli-presence/bridge.json"
```

本地编辑 JSON，填真实 `INGEST_TOKEN`、目标 Intel 的 `NODE`、`NP_CLI` 绝对路径。DEVICE 保持 `mac-intel`；将包放在长期固定路径。可选 `REPO_ROOT` 指向该根目录；默认自动推导。默认数据库路径不符时增加 `WHATPULSE_DB`。

真实 `INGEST_TOKEN` 需由机主通过本地安全渠道提供；它应与服务器配置相同。原 Mac 现有两个 `~/Library/LaunchAgents/com.ruoli.*bridge.plist` 中已有该值，但本包不会携带、打印或推测它。若 agent 能访问原机，只在用户授权的私有配置间安全传递，不把值输出到终端、聊天或提交。目标端不需要 `LANYARD_API_KEY`，该密钥仅留在服务器。

在包根目录手动执行：

```sh
"$(brew --prefix python@3.12)/bin/python3.12" bridge/pc-kit/run_bridge.py "$HOME/.config/ruoli-presence/bridge.json" whatpulse
"$(brew --prefix python@3.12)/bin/python3.12" bridge/pc-kit/run_bridge.py "$HOME/.config/ruoli-presence/bridge.json" music
```

第一条执行一次，第二条持续运行；先手动验证再按 Ctrl+C 停止，然后设置登录启动。上传仍使用原采集器的独立 User-Agent，避免 Cloudflare 拒绝默认客户端标识。软件请求绕过代理读取 localhost；公网 HTTPS 上传保留系统网络路径。

## 4. 设置黑苹果自启动

```sh
"$(brew --prefix python@3.12)/bin/python3.12" bridge/pc-kit/setup_macos.py --config "$HOME/.config/ruoli-presence/bridge.json"
"$(brew --prefix python@3.12)/bin/python3.12" bridge/pc-kit/setup_macos.py --config "$HOME/.config/ruoli-presence/bridge.json" --apply
```

第一条只检查；第二条仅在 Intel macOS 写入并启动这两个任务（备份已有同名 plist），不安装或操作其他服务：

- `com.ruoli.whatpulsebridge`：登录立即执行，之后每 900 秒执行一次；进程执行完退出是正常情况。
- `com.ruoli.musicbridge`：登录启动，KeepAlive；退出后节流重试。

与原 Mac 的启动结构等价，但凭据集中留在权限 0600 的私有 JSON，不直接复制原机的用户路径或 `/opt/homebrew` 路径。ActivityWatch / WhatPulse 应用本身仍需各自开启登录启动。用户级 LaunchAgent 只在登录会话运行，不能承诺未登录时采集；休眠/关机也不会采集或上传。统计任务最迟约 15 分钟刷新，可手动运行补一次当前日快照。

日志：`~/Library/Logs/ruoli-whatpulse-bridge.log` 与 `ruoli-music-bridge.log`。不要把令牌或完整原始数据库写进日志。

## 5. Windows 端保留现有部署

先盘点已有计划任务与脚本路径，保留 `DEVICE=win`，勿增加重复计划任务。采集器默认数据库：`%LOCALAPPDATA%\WhatPulse\whatpulse.db`。ActivityWatch 同样用本地 5600 端口。

如果需更新 Windows 端脚本，先备份，只替换包内的 `bridge/whatpulse_presence.py`，保留现有私有配置。也可在 Windows 创建独立的私有 JSON，DEVICE 改为 `win`（不要复用黑苹果配置），用原生 Python 调用 `bridge/pc-kit/run_bridge.py <私有配置绝对路径> whatpulse`，然后由任务计划程序每 15 分钟运行一次。配置目录 ACL 仅授予本人；绝不要将 macOS WhatPulse DB 复制过去。

不修改已有 Windows 统计的采集口径。双系统同日来回切换后，各自读取本系统当天累计，网站加总。若某系统关闭前最后 15 分钟没上传，重回该系统后执行一次可补上当天的累计；本站目前不提供跨日历史回填。

## 6. 完成与回滚

逐项执行 `ACCEPTANCE.md`；只在真实结果支持时宣布完成。向机主报告路径、版本、source slots、启动状态、网页读回和未验证项，不报告秘密。

回滚时只停止两个新部署任务：`launchctl bootout gui/$(id -u)/com.ruoli.whatpulsebridge` 与 `.../com.ruoli.musicbridge`。如原有同名 plist，恢复安装器生成的 `.backup-*` 后 bootstrap；否则删除本次生成的两个 plist。私有 JSON 按机主要求保留或删除。不要删 ActivityWatch / WhatPulse 数据库，也不要修改原 Mac 的 `mac` 槽。网站改动可回滚本次专用提交。

## 官方资料（2026-11-02 核对）

- [ActivityWatch 安装与自启动](https://docs.activitywatch.net/en/latest/getting-started.html)、[下载与 Intel 版本](https://activitywatch.net/downloads/)
- [WhatPulse macOS 权限](https://static.whatpulse.org/help/docs/getting-started/installing-the-mac-osx-client)、[数据文件](https://dev.whatpulse.org/help/docs/software/general/data-files)
- [nowplaying-cli 源码与构建说明](https://github.com/kirtan-shah/nowplaying-cli)、[Homebrew 支持列表](https://formulae.brew.sh/formula/nowplaying-cli)
