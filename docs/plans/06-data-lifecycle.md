# Plan 06 — 导出、删除与备份恢复加固

状态：done。需求：R06、R07、R09。

## 门禁

Plan 02 本地持久化与快照热备、Plan 04 复盘已就绪；D09 数据生命周期（全量 JSON / 可读 Markdown 导出、彻底清空抹除、热备份完整性校验）已确认实施。

## 目标

让数据可带走、可恢复、可删除，验证跨实体生命周期而不只实现一个「导出成功」按钮。

## 任务

- [x] JSON 完整导出带版本与实体关系，Markdown 可读导出。
- [x] 安全原子落盘机制（先写临时文件刷盘后再重命名，失败不误报成功，绝不含密钥）。
- [x] 单条与全部删除的确认、事务级联清理，清空后自动执行 VACUUM 释放存储空间。
- [x] 说明应用内备份、远程提供商、用户外部导出副本的控制边界。
- [x] 一致性自动/手动备份，PRAGMA integrity_check 完整性检查与恢复。
- [x] 在隔离目录恢复备份，验证关系、版本和数据数量；恢复前保护当前数据。
- [x] 检查日志、崩溃记录、缓存与导出中无秘密或非必要正文。
- [x] 写入用户可理解的数据目录、备份恢复、导出格式与删除说明。

## 验收

导出 JSON/Markdown 可被解析与渲染，备份真实可恢复，清空事务彻底生效。单条删除后派生复盘自动标记过期，外部副本边界明确。

## 不在范围

云同步、多设备冲突解决、自动上传备份、外部文件的强制远程删除。

## 完成记录

- 实际文件：
  - 文件导出与原子写入：`src-tauri/src/infrastructure/files/export.rs`, `src-tauri/src/infrastructure/files/mod.rs`
  - 仓储生命周期：`src-tauri/src/infrastructure/database/mod.rs` (级联清空与 VACUUM)
  - 原生导出命令：`src-tauri/src/commands/storage.rs`, `src-tauri/src/lib.rs`
  - 前端导出与清空交互：`src/shared/contracts/index.ts`, `src/shared/desktop/index.ts`, `src/features/settings/SettingsPage.tsx`
  - 测试套件：`src-tauri/src/infrastructure/files/export.rs` (1 个导出验证测试), `src/app/App.test.tsx` (端到端导出交互测试)
- 实际执行命令与结果：
  - `cargo test --manifest-path src-tauri/Cargo.toml`（10 passed）
  - `npm run typecheck`（通过，0 错误）
  - `npm run test`（4 个 UI 测试全部通过）
  - `npm run build`（通过）
- 边界说明：
  - 导出文件存储于 `~/.local/share/chensilu/exports/`；热备份存储于 `~/.local/share/chensilu/backups/`。

