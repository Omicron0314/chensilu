# 沉思路 · AI 日记助手

面向 Linux、Windows、macOS 的桌面应用：以轻松对话完成当日记录，把目标、投入与用户确认的正反馈连接起来，再按需生成可回查的周期复盘。

**当前状态：P0 完整闭环（Plan 00 ~ Plan 07）已全部实现并完成 Arch Linux 实机验证。**

## 技术栈与设计原则

- **桌面底座**：Tauri 2 (Rust) + WebKitGTK (Linux)
- **前端框架**：React 18 + TypeScript + Vite
- **测试框架**：Vitest + Testing Library (前端) / Cargo Test (Rust)
- **本地持久化**：SQLite (WAL 事务引擎，系统数据目录隔离存储)
- **AI 引擎**：支持 Mock 离线启发式与 Google Gemini（限定 `gemini-3.8-flash-high` / `gemini-pro-agent`）
- **架构原则**：
  - **本地优先**：断网完整可用，数据存储于 `~/.local/share/chensilu/`。
  - **最小权限**：前端禁止直接执行任意 SQL/Shell/任意文件路径。
  - **不卡保存**：五栏结构中时长未知存 `null`（不强制填 0），正反馈区分已确认/跳过/明确没有，空字段不阻断记录。
  - **确定性聚合**：周报加总与次数计算由确定性 Rust 代码完成，严禁交由 LLM 捏造。
  - **隐私脱敏**：错误边界与日志不记录日记正文或敏感凭据，关闭 AI 后彻底杜绝远程调用。

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

# 2. 前端单元测试（UI 导航、对话引导、五栏抽取、复盘初稿与导出）
npm run test

# 3. 前端静态资源构建
npm run build

# 4. 原生后端单元测试（SQLite 仓储、未知时长保留、版本冲突、热备恢复、确定性周报聚合）
cargo test --manifest-path src-tauri/Cargo.toml

# 5. 原生桌面调试构建
cargo build --manifest-path src-tauri/Cargo.toml

# 6. 原生桌面 Release 发行版构建
cargo build --release --manifest-path src-tauri/Cargo.toml
# 产物位于: src-tauri/target/release/chensilu (约 17MB)
```

## P0 完整闭环功能验证清单

- [x] **对话引导记录**：先复述一句，再问一个具体单点问题；2-3 轮收尾；支持跳过与「今天不想写/休息」友好休止。
- [x] **五栏结构化草稿**：目标、状态、时间投入（未知时长存 null）、正反馈（确认/跳过/明确没有）、反思。
- [x] **即时事实反馈**：保存后一次点击内呈现本地计算的确定性行动数与已知分钟数。
- [x] **周复盘 A 档**：任意时间区间自由触发；确定性看板；AI 草稿生成与用户自由编辑确认；事实来源出处回链。
- [x] **真实 AI 与透明额度**：支持 Gemini 系列模型；明确隐私授权；常驻额度看板；关闭 AI 后零网络外发。
- [x] **数据所有权与安全**：全量 JSON / 可读 Markdown 原子安全导出；本地 SQLite 在线快照热备与恢复；彻底清空与 VACUUM 空间释放。

## 文档入口

- [AI 开发指南](AGENTS.md)
- [产品定义（唯一源）](产品定义.txt)
- [文档导航](docs/README.md)
- [项目结构与架构](docs/architecture.md)
- [任务路线图与依赖](docs/plans/README.md)
- [决策登记 (ADR)](docs/decisions/0001-foundation.md)

所有测试均使用合成数据；真实日记、密钥、本地数据库与备份已由 `.gitignore` 排除，绝不提交至版本库。
