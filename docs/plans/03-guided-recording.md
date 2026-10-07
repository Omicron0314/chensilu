# Plan 03 — 对话、五栏与即时事实反馈

状态：done。需求：R01、R02、R03。

## 门禁

Plan 02 已通过；D05 保存规则、D06 状态与目标引用口径已确认。使用 Mock AI；不外发用户真实内容。

## 目标

把一句对话变成可编辑、可聚合的记录，而非逼用户每日填表。

## 任务

- [x] 定义引导/抽取契约、Mock 提供商与合成响应。
- [x] 引导先复述再单点提问；默认一次一问；用户可跳过、结束、今天不想写。
- [x] 口吻温和/直接；跳过后转自由写，不重复逼问。
- [x] 展示并编辑五栏，原始对话与整理稿分别可读。
- [x] 抽取约数时长，保留未知值；用户不用计算，AI 不猜测未提供分钟数。
- [x] 正反馈作为事实候选由用户确认；支持今天没有，不自动判定进展。
- [x] 反思仅提供可忽略的引子，不设进度与提醒。
- [x] 确定性计算保存后事实反馈与引用，无目标时提供有依据的关联或诚实空状态。
- [x] 校验非法输出/来源/过期版本，取消与失败保留输入。
- [x] 覆盖中文输入法、长文本、未填字段、关闭 AI、Mock 故障与跳过行为。

## 验收

用户可在 2–3 轮或直接自由写后结束、编辑确认保存；一次点击内见事实反馈。草稿可空、可修改；真实统计不依赖 LLM，Mock 结果明确标识。

## 与周报的衔接

行动与正反馈契约稳定，立即开展 Plan 04 周报聚合。

## 完成记录

- 实际文件：
  - 原生领域与 AI 适配：`src-tauri/src/domain/ai.rs`, `src-tauri/src/infrastructure/ai/mock.rs`, `src-tauri/src/commands/ai.rs`, `src-tauri/src/lib.rs`
  - 前端对话与五栏交互：`src/shared/contracts/index.ts`, `src/shared/desktop/index.ts`, `src/features/recording/RecordingPage.tsx`
  - 测试套件：`src-tauri/src/infrastructure/ai/mock.rs` (4 个引导与抽取测试), `src/app/App.test.tsx` (端到端对话、不想写休止、五栏抽取与入库事实反馈)
- 实际执行命令与结果：
  - `cargo test --manifest-path src-tauri/Cargo.toml`（8 passed，涵盖先复述再提问、休息日停止逼问、未知时长保留 None、约数标记识别）
  - `npm run typecheck`（通过，0 错误）
  - `npm run test`（5 个 UI 测试全部通过）
  - `npm run build`（通过）
- 剩余风险与后续任务：进入 Plan 04（基于确定性行动与正反馈数据的跨周期周报聚合与 A 档流程）。

