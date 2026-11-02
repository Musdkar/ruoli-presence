# 目标机验收清单

按结果勾选；未实际执行的项目必须保留未验证。先确保本次网站/API 改动已经发布，再启动 Intel 上传。

- [ ] `uname -m` 为 x86_64；Python >=3.10（推荐3.12），Node >=20；所有任务路径均属于目标机，不含原机 `/Users/kalieri`、`/opt/homebrew` 或 arm64-only helper。
- [ ] ActivityWatch 本地 5600 可用，`aw-watcher-window` 存在；切换前台应用后新事件时间推进。仅确认 bucket 存在不足以证明正在采集。
- [ ] WhatPulse 权限已授予；输入一段测试文字并等待落库后，当天总数增加；只读查询成功，原数据库没有被写入或迁移。
- [ ] `DEVICE=mac-intel`。一次统计上传返回 200，`updated.software` 与 `updated.keyboard` 都为 true。若刚安装且尚无数据，先产生正常活动再重试；仅 200 或只更新键盘不足以验收软件同步。
- [ ] 从 `https://kalieri.com/api/presence` 读回 `apps_today_mac-intel` / `keyboard_today_mac-intel`，日期为 UTC+8 当天；`mac`、`win` 各自旧快照保持独立。
- [ ] 网页键盘标签为 MACBOOK / PC；原 Mac 卡数据独立；PC 总数等于当天 `win.total + mac-intel.total`；逐键热度取 max，过期来源不参与。
- [ ] 同日 Windows → 黑苹果 → Windows 后，累计不会被重置或重复相加。重复上传不增加最终总数，只有实际新增输入会改变来源累计。
- [ ] 软件卡显示三个来源当天同名应用分钟数之和；旧日数据不混入今天；没有伪造数据填充。
- [ ] 网易云播放、暂停、切歌、退出均实测；歌曲与封面正确。随后 Apple Music 完整重复一遍。
- [ ] `music_now_mac-intel` 可从公开 presence 读回；原 Mac 播放与 Intel 暂停并存时，网页仍优先显示新鲜正在播放的来源。不能只检查本地 reader。
- [ ] 停止音乐 bridge 后 >90 秒，网页转为 LAST PLAYED，曲目/封面保留；重新播放后恢复 NOW PLAYING。
- [ ] 退出登录并重新登录后，AW/WhatPulse 应用及两个上传任务恢复；统计任务间歇退出属正常，音乐进程持续存在。
- [ ] ZIP、仓库、截图、聊天均无真实 token、WhatPulse 登录文件、数据库、窗口标题或原始封面长文本；配置权限 0600（Windows 用本人 ACL）。

## 常见故障

| 症状                            | 检查                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------- |
| 只有键盘有数据                  | AW 是否真正运行，5600 是否可达，window bucket 是否持续更新；原 Mac 就观测到过此故障               |
| 只有软件有数据                  | WhatPulse 是否采集、是否落库、日期与表结构是否正确，macOS 辅助功能/输入监控                       |
| API 401                         | token 是否正确、ASCII、与服务端一致；不要打印其值或拿 Lanyard key 代替                            |
| API 400/no_valid_whatpulse_data | 今日是否真有数据、客户端是否落库、schema 是否兼容；不要用空上传冒充成功                           |
| Cloudflare 403/1010             | 保留原 bridge 自定义 User-Agent，核对网络，不关闭网站保护                                         |
| 网络失败                        | 检查机主既有网络与代理；只有 AW 的 localhost 请求强制绕过代理                                     |
| Intel 显示在 Mac 中             | DEVICE 未正确设置，或启动了另一份默认 DEVICE=mac 的任务                                           |
| 黑苹果后 Windows 量变小         | 检查是否错误复用 win 槽，或 DB 被跨系统复制；不要用增量补丁掩盖                                   |
| 音乐 CLI 空 JSON                | 在目标机播放真实歌曲，检查系统媒体会话、bundle ID、helper 三件套/架构；不能承诺所有黑苹果系统兼容 |
| 音乐部署后仍覆盖                | 确认新 API 与前端均上线，Intel 参数确实含 device=mac-intel，读回分来源 key                        |
| 任务启动失败                    | 用目标机的 Python/Node/reader 绝对路径；检查路径空格和文件存在，先手动运行同一 wrapper            |

不要修改 AFK 口径、上传精确逐键计数、开放 AW 端口或换掉网站 UI 来“解决”这些问题。
