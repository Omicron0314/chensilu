# Plan 04 — 周报聚合与 A 档流程

状态：done。需求：R04。

## 门禁

Plan 02 记录持久化完成；Plan 03 行动/正反馈/来源契约稳定；D06 聚合口径（代码确定性计算、状态不打分、正反馈严格按确认计入）获批执行。

## 目标

从字段直接算出一份可回查周报，尽早让用户跨过完整复盘周期。本阶段 AI 叙述仍为 Mock。

## 任务

- [x] 领域层实现明确区间与时区，支持过去 N 天、补做、空区间。
- [x] 按唯一行动聚合已知时长和次数，说明未知值与约数，不重复计时。
- [x] 按已确认事实聚合正反馈，包含未关联目标组。
- [x] 保存输入版本与来源快照，所有统计可点击回到记录/行动。
- [x] Mock 生成有出处的 A 档初稿，校验每条结论引用；无证据不生成泛泛评价。
- [x] 用户可编辑、确认、查看复盘历史；确认版与 AI 草稿分开。
- [x] 记录修改/删除后使相关摘要失效或标记复盘过期，不静默覆盖确认版。
- [x] 对时间边界、重复保存、多目标、未知时长、确认状态与引用失效建立测试。
- [x] 检查生成输入以字段/精炼摘要为主，不默认读取全部原始文本。

## 验收

使用合成日记：统计与手算一致、无需读七篇全文即可理解周报、每个数字与解释结论都有有效来源。补做不受周一等日历限制；无数据为明确空状态。

## 不在范围

月年复盘、B/C 模式、自动推送、复杂长期记忆、真实模型与付费套餐。

## 完成记录

- 实际文件：
  - 原生聚合领域：`src-tauri/src/domain/review.rs`, `src-tauri/src/domain/mod.rs`
  - 数据库迁移与操作：`src-tauri/src/infrastructure/database/mod.rs`（新增 reviews 表、日期范围查询、stale 标记）
  - 原生命令：`src-tauri/src/commands/review.rs`, `src-tauri/src/lib.rs`
  - 前端周复盘界面与契约：`src/shared/contracts/index.ts`, `src/shared/desktop/index.ts`, `src/features/reviews/ReviewsPage.tsx`
  - 自动化测试：`src-tauri/src/domain/review.rs`（确定性统计与引用链测试）, `src/app/App.test.tsx`（端到端复盘初稿生成与确认归档）
- 实际执行命令与结果：
  - `cargo test --manifest-path src-tauri/Cargo.toml`（9 passed，通过时长加总、未知时长隔离与正反馈确认过滤）
  - `npm run typecheck`（通过，0 错误）
  - `npm run test`（6 个 UI 测试全部通过）
  - `npm run build`（通过）
- 剩余风险与后续任务：进入 Plan 05 / Plan 06（真实 AI 接口接入、数据导出与生命周期清理）。

