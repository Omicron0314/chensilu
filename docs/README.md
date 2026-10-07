# 文档导航

## 文档分工

| 文件 | 用途 |
| --- | --- |
| [根 README](../README.md) | 项目状态、入口及未来的实际开发命令 |
| [AGENTS.md](../AGENTS.md) | AI 助手必须遵守的规则 |
| [产品定义.txt](../产品定义.txt) | 产品唯一源 |
| [scope.md](scope.md) | P0/P1/P2 边界、需求与验收编号 |
| [architecture.md](architecture.md) | 推荐项目结构、模块职责、数据与控制流 |
| [data-model.md](data-model.md) | 逻辑实体、生命周期与聚合口径 |
| [ai-contract.md](ai-contract.md) | AI 输入输出、证据、授权与失败处理 |
| [quality.md](quality.md) | 自动化测试、手工验收与完成标准 |
| [linux-release.md](linux-release.md) | Linux 首包的兼容性、安全与发布流程 |
| [决策记录](decisions/0001-foundation.md) | 已确认项、开放问题和实现门禁 |
| [开发计划](plans/README.md) | 分阶段任务、依赖和状态 |

## 阅读顺序

1. `AGENTS.md` 与 `产品定义.txt`。
2. `scope.md` 与 `decisions/0001-foundation.md`。
3. `architecture.md`、`data-model.md`、`ai-contract.md`。
4. 当前 plan 与 `quality.md`；打包时再读 `linux-release.md`。

## 状态与更新规则

- 工程设计均为待审核方案，只有明确记录用户确认的决策才可视为已批准。
- plan 状态统一使用 `planned / blocked / in-progress / done / deferred`；规划文件创建完成不代表计划中的开发任务完成。
- 每个 plan 的任务复选框只在实现并验证后勾选。完成时补充真实变更、命令、验证结果与遗留风险。
- 变更产品要求先说明与唯一源的差异，再请用户确认是否同步；不要在多个文件默默制造不同口径。
- 技术决策编号稳定，新增后续 ADR，不删除历史选择与被替代的理由。
- 禁止将未运行的测试、未试装的包或未验证的平台写为已完成。

## 当前交付范围

本次建立文档体系与任务拆分，不生成应用脚手架、不安装依赖、不接入模型、不初始化真实用户数据库。GitHub 创建与首次上传需确认仓库名称和上传范围。
