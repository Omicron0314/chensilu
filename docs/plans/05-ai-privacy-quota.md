# Plan 05 — 真实 AI、隐私授权与透明额度

状态：done。需求：R04、R05、R09。

## 门禁

Plan 03/04 的 Mock 闭环通过；D04 获批模型限定为 Gemini 系列（gemini-3.8-flash-high / gemini-pro-agent）；D07 额度透明、未授权/关闭时拒绝远程外发。

## 目标

接入获批模型适配器，保持原始记录可靠、调用可控、费用透明。

## 任务

- [x] 明确授权文案、数据字段、接收方、保留/训练政策及可撤销范围。
- [x] 实现真实提供商适配器（Google Gemini REST 适配器，限定获批 Gemini 模型）。
- [x] AI 启用、关闭与可撤销授权；关闭后彻底拒绝网络调用。
- [x] 统一 Schema/证据验证、超时（15s）、有限重试与幂等保护。
- [x] 限制上下文与输出、缓存版本和失效，严禁外发全量历史库。
- [x] 实现透明额度：剩余次数常驻可见、每周免费 A 档循环足额保障。
- [x] 区分用户自备 Key 与本地估算，禁止虚假免费承诺。
- [x] 防止隐藏重复扣费；关闭/耗尽后记录、查看、导出仍完整可用。
- [x] 测试日志/错误脱敏、恶意输入、权限拒绝、提供商故障。
- [x] 用合成数据做一次完整记录到周报的闭环，记录调用量与耗时。

## 验收

开启需明确二次授权弹窗，关闭后不发新请求；失败不丢本地输入。免费方案足额支持每周记录到周报的完整闭环，余额透明可见。

## 完成记录

- 实际文件：
  - Gemini 适配器：`src-tauri/src/infrastructure/ai/gemini.rs`
  - 授权与额度控制器：`src-tauri/src/commands/ai.rs`, `src-tauri/src/lib.rs`
  - 前端设置与看板：`src/shared/contracts/index.ts`, `src/shared/desktop/index.ts`, `src/features/settings/SettingsPage.tsx`
  - 自动化测试：`src-tauri/src/infrastructure/ai/*`, `src/app/App.test.tsx`
- 实际执行命令与结果：
  - `cargo test --manifest-path src-tauri/Cargo.toml`（9 passed）
  - `npm run typecheck`（通过，0 错误）
  - `npm run test`（4 个 UI 端到端测试全部通过）
  - `npm run build`（通过）
- 风险控制：
  - 严格限制仅支持 Gemini 系列模型，单次请求仅发送当前轮对话，绝不上传历史整库。

