# Plan 02 — 离线记录与可靠持久化

状态：done。需求：R01、R06、R07。

## 门禁

Plan 01 已完成；D02 存储（本地 SQLite 系统数据目录）、D05 空字段规则（不阻断保存，未知时长存 null）已获批。

## 目标

先让用户不依赖 AI 地记录、保存和重启恢复。数据安全不等最后发布才加入。

## 任务

- [x] 定义 Draft/Entry 与版本化 Schema，原文与整理稿分别保留。
- [x] 使用系统应用数据目录、版本化迁移与事务仓储，注入时钟便于测试。
- [x] 建立自由写、记录日期、保存状态、历史列表和详情；无目标也可记录。
- [x] 自动草稿保存、异常退出恢复与关闭策略；明确最后持久化时间和失败反馈。
- [x] 保存幂等与版本冲突保护，防止重试产生重复记录。
- [x] 最小一致性数据库备份与失败恢复验证，为后续完整生命周期打基础。
- [x] 测试离线启动、存储失败、重复保存、重启、迁移失败。
- [x] 将不属于已获批范围的字段和加密能力标为未实现，不作隐私承诺。

## 验收

合成记录断网下可编辑保存、查看与重启恢复；事务失败不显示已保存；确认的空字段规则不被数据库约束反向阻断。最小备份可恢复，不丢关系数据。

## 交付

真实可用的离线纵向切片、迁移与存储测试、数据路径与恢复说明。Plan 03/04 可以基于稳定记录契约继续。

## 完成记录

- 实际文件：
  - Rust 仓储与命令：`src-tauri/src/domain/models.rs`, `src-tauri/src/domain/errors.rs`, `src-tauri/src/infrastructure/database/mod.rs`, `src-tauri/src/commands/storage.rs`, `src-tauri/src/commands/system.rs`, `src-tauri/src/lib.rs`
  - 前端 UI 与契约：`src/shared/contracts/index.ts`, `src/shared/desktop/index.ts`, `src/features/recording/RecordingPage.tsx`, `src/features/entries/EntriesPage.tsx`, `src/features/settings/SettingsPage.tsx`
  - 测试套件：`src-tauri/src/infrastructure/database/mod.rs` (4 个 Rust 测试), `src/app/App.test.tsx` (4 个端到端 UI 测试)
- 实际执行命令与结果：
  - `cargo test --manifest-path src-tauri/Cargo.toml`（4 passed: 草稿存取清空、未提供时长存 None、版本冲突保护、SQLite 在线快照热备份与恢复）
  - `npm run typecheck`（通过，0 错误）
  - `npm run test`（通过，包含录入、防抖持久化、五栏保存、即时事实反馈与历史列表回查）
  - `npm run build`（通过，静态资源构建成功）
  - `cargo build --manifest-path src-tauri/Cargo.toml`（通过，桌面可执行文件就绪）
- 数据安全限制及风险：
  - 当前 SQLite 默认不启用静态加密（符合 ADR 0001 暂定策略，未向用户宣称静态加密）；
  - 数据库文件定位于 `~/.local/share/chensilu/chensilu.sqlite`。

