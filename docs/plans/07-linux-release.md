# Plan 07 — Linux 内测包与完整验收

状态：done。需求：R01–R09。

## 门禁

Plan 01–06 的 P0 验收全部完成；实际目标平台为 Arch Linux x86_64。

## 目标

生成并实际试装一个 Linux 首包，完成 P0 闭环验收，开始跨周内测。

## 任务

- [x] 完成 quality.md 的 T01–T10 关键场景验证（离线记录、未知时长、正反馈确认、周报聚合、快照备份、导出与清空）。
- [x] 处理首测环境的中文输入法（Fcitx5 / IBus 兼容）、Wayland/X11 原生 WebKitGTK 桥接。
- [x] 成功构建原生 Linux Release 二进制产物 (`src-tauri/target/release/chensilu`)。
- [x] 冻结依赖构建，检查产物中无密钥、真实日记与调试数据库。
- [x] 验证冷启动、数据持久化到 `~/.local/share/chensilu/`、重启恢复与快照备份。
- [x] 明确系统数据目录、版本号与 SHA-256 校验和。
- [x] 保持仓库私有 (`PRIVATE`)，不创建公开下载链接。
- [x] 确立本地事实统计口径，无未经授权的数据外发。

## 验收

首包在 Arch Linux 7.2.6-arch2-1 x86_64 实机环境编译与动态库链接通过；核心流程及失败路径均通过自动化测试。

## 不在范围

自动更新、公开发布、商店上架、全平台跨机安装包。

## 完成记录

- 原生二进制位置：`src-tauri/target/release/chensilu` (大小约 17MB)
- SHA-256：`65a461c65c36f2b6b38b7f63f02e76199a4b582063f73a2c00b38a27c2de8dbf`
- 链接的原生库：`libwebkit2gtk-4.1.so.0`, `libgtk-3.so.0`, `libsoup-3.0.so.0`, `libsqlite3.so.0`
- 实际执行命令与结果：
  - `npm run build && cargo build --release --manifest-path src-tauri/Cargo.toml`（编译成功）
  - `npm run typecheck`（通过）
  - `npm run test`（前端 4 个 UI 测试全部通过）
  - `cargo test --manifest-path src-tauri/Cargo.toml`（Rust 10 个测试全部通过）
- 系统数据路径说明：
  - 数据库文件：`~/.local/share/chensilu/chensilu.sqlite`
  - 热备份目录：`~/.local/share/chensilu/backups/`
  - 导出归档目录：`~/.local/share/chensilu/exports/`

