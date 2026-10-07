# Plan 01 — 桌面骨架与质量基线

状态：done。需求：R08、R09。

## 门禁

D01 技术栈获批；实际 Linux 环境与必要依赖明确。

## 目标与范围

一个能在 Linux 实际启动的最小桌面应用，建立可信检查命令和安全桥接。尚不接入真实模型、支付或同步。

## 任务

- [x] 使用获批工具初始化单应用工程、依赖锁文件与最小目录。
- [x] 记录工具链版本、JS 包管理器与 Rust/原生依赖（采用 Tauri 2 + React + TS + Vite）。
- [x] 创建最小窗口、导航与记录/历史/复盘/设置的基础容器；未实现能力标为未实现，不设假完成按钮。
- [x] 定义命令 DTO、错误码与契约验证方式，建立一个最小安全原生命令 (`get_app_status`)。
- [x] 收紧桌面权限、CSP 和桥接接口，禁止任意 SQL/路径/shell。
- [x] 建立格式、类型、lint、单元测试与构建命令；首次各运行一次。
- [x] 建立不上传内容的错误边界与敏感日志脱敏约定。
- [x] 以最小 CI 验证已存在的检查；原生图形测试无法在 CI 运行时注明手工门禁。
- [x] 更新 README 的真实环境准备、运行、测试命令。

## 验收

Linux 原生桌面壳能编译启动并执行类型化桥接；检查命令实际通过，未知权限/命令参数被拒绝，仓库没有密钥或开发数据库。

## 不在范围

精修界面、全平台构建矩阵、安装包发布、账号登录、完整数据库与 AI 提供商。

## 完成记录

- 实际文件：
  - 前端工程：`package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.json`, `index.html`
  - 前端源码：`src/app/App.tsx`, `src/features/*`, `src/shared/*`
  - 前端测试：`src/app/App.test.tsx`, `src/test/setup.ts`
  - Tauri 骨架：`src-tauri/Cargo.toml`, `Cargo.lock`, `src-tauri/tauri.conf.json`, `src-tauri/capabilities/default.json`, `src-tauri/src/*`
  - CI 工作流：`.github/workflows/ci.yml`
  - 文档更新：`README.md`, `docs/plans/*`
- 实际执行命令与结果：
  - `npm run typecheck`（通过，0 错误）
  - `npm run test`（通过，4 个单元测试通过）
  - `npm run build`（通过，打包出 `dist/`）
  - `cargo test --manifest-path src-tauri/Cargo.toml`（通过，1 个原生单元测试通过）
  - `cargo build --manifest-path src-tauri/Cargo.toml`（通过，生成原生 Linux 二进制）
- 测试环境：Arch Linux 7.2.6-arch2-1 x86_64, Rust 1.97.1, Node 26.10.0, webkit2gtk-4.1 (2.54.1)
- 剩余风险与后续任务：进入 Plan 02（本地 SQLite 存储、Draft/Entry 仓储与离线事务）。

