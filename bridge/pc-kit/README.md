# PC / Intel macOS 整合包源文件

请从 [AGENT.md](AGENT.md) 开始。此目录是复刻包的可维护源文件；发给另一台电脑的 ZIP 还包含两个现有采集器、网站专用补丁、测试与校验清单。ZIP 不含私有凭据、数据库或原机 arm64 二进制。

`setup_macos.py` 默认只验证，`--apply` 才在 Intel macOS 安装两个用户级任务。`run_bridge.py` 从本人可读的 JSON 加载凭据。`diagnose.py` 只做本地只读检查，不上传。
