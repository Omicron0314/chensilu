# 沉思路 · AI 日记助手

面向 Linux、Windows、macOS 的桌面应用：以轻松对话完成当日记录，把目标、投入与用户确认的正反馈连接起来，再按需生成可回查的周期复盘。

**当前状态：Plan 01 原生桌面骨架与质量基线已建立。**

## 技术栈与设计原则

- **桌面底座**：Tauri 2 (Rust) + WebKitGTK (Linux)
- **前端框架**：React 18 + TypeScript + Vite
- **测试框架**：Vitest + Testing Library (前端) / Cargo Test (Rust)
- **本地存储**：SQLite（Plan 02 接入）
- **架构原则**：
  - 本地优先：记录断网可用，数据保留在系统应用数据目录。
  - 最小权限：前端禁止直接执行任意 SQL/Shell/文件路径。
  - 隐私脱敏：错误边界与日志不记录日记正文或敏感凭据。

## 开发环境准备 (Linux / Arch Linux)

系统已具备以下原生依赖：
- `rustc` >= 1.78 (`rustc 1.97.1`)
- `node` >= 20 (`v26.10.0`)、`npm` (`12.2.0`)
- `webkit2gtk-4.1`、`gtk3`、`libsoup3`

在 Debian/Ubuntu 环境下对应的系统包：
```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl libssl-dev libgtk-3-dev
```

## 可用验证命令

以下命令均已在 Arch Linux 实机测试通过：

```bash
# 1. 前端类型检查
npm run typecheck

# 2. 前端单元测试（UI 导航、状态、错误边界脱敏）
npm run test

# 3. 前端静态资源构建
npm run build

# 4. 原生后端单元测试（包含 get_app_status 桌面桥接）
cargo test --manifest-path src-tauri/Cargo.toml

# 5. 原生桌面调试构建
cargo build --manifest-path src-tauri/Cargo.toml

# 6. 启动 Tauri 开发环境
npm run tauri dev
```

## 文档入口

- [AI 开发指南](AGENTS.md)
- [产品定义（唯一源）](产品定义.txt)
- [文档导航](docs/README.md)
- [项目结构与架构](docs/architecture.md)
- [任务路线图与依赖](docs/plans/README.md)
- [决策登记 (ADR)](docs/decisions/0001-foundation.md)

所有测试均使用合成数据；真实日记、密钥、本地数据库与备份已由 `.gitignore` 排除，绝不提交至版本库。
