# Markdown Studio

一个本地优先的 Windows Markdown 查看与编辑器，使用 Tauri 2 + React + TypeScript 构建。

Markdown Studio 提供左右分栏的源码编辑与实时预览，适合写作、阅读和快速检查 `.md` / `.markdown` 文档。

## 功能

- GFM 实时预览：表格、任务列表、删除线、自动链接和代码块
- CodeMirror 6 编辑器：语法高亮、行号、自动补全、搜索面板和自动换行
- 标题大纲：从一级到六级标题生成目录并跳转到对应行
- 本地文件：打开、保存、另存为和拖拽打开 Markdown 文件
- 安全预览：原始 HTML 经过过滤，不执行脚本内容
- 编辑保护：未保存修改在新建、打开和关闭时提示
- 偏好设置：主题、字号、分栏比例和最近文件保存在本机
- 响应式界面：窄窗口自动切换为编辑/预览标签模式

### v0.2.0 编辑效率更新

- 格式工具栏：加粗、斜体、删除线、一至三级标题、引用、列表、任务项、链接、行内代码、代码块和表格；支持选区与多光标。
- 撤销/重做：工具栏按钮与快捷键共用 CodeMirror 历史；打开其他文档后不会撤销到前一份文档。
- 最近文件：最多 8 项，可按名称/路径筛选、移除或清空记录；不会删除磁盘文件。
- 真正的仅编辑、左右分栏、仅预览模式；视图模式在重启后恢复。
- 搜索与替换：工具栏直接打开搜索面板，支持全词、大小写、正则表达式和全部替换。
- 编辑设置：自动换行、行号、字号、主题与分栏比例持久化；分栏支持拖拽、方向键和双击复位。
- 状态栏：当前行列、选区字符数、UTF-8 与 LF/CRLF 状态。
- 大纲解析：与预览共用标题位置信息，支持 Setext、嵌套标题、重复标题和代码围栏。
- 文件操作互斥，保存仅确认实际写入的内容快照；保存失败不会丢失内容，确认对话框支持焦点限制与 Esc 取消。

v0.2.1 修复了空白/多段落选区格式化、行内代码反引号与空格、超多反引号造成的异常、换文档后的预览位置，以及启动期间偏好覆盖问题。完整记录见 [更新日志](./CHANGELOG.md)。

## 技术栈

- Tauri 2
- React 18 + TypeScript + Vite
- CodeMirror 6
- `react-markdown` + `remark-gfm` + `rehype-sanitize`
- Tailwind CSS 风格设计系统

## 开发环境

- Windows 10/11
- Node.js 20+
- Rust stable + Cargo
- WebView2

## 快速开始

```powershell
npm install
npm run tauri dev
```

常用命令：

```powershell
npm run lint
npm run test
npm run test:e2e
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri build
```

端到端测试使用本机 Microsoft Edge，由 Playwright 在 `127.0.0.1:1425` 启动临时前端服务，覆盖真实 CodeMirror 与 375/900/1024/1440 像素布局。测试截图和跟踪文件写入被 Git 忽略的 `test-results/`。`npm run dev` 可查看浏览器前端，但系统文件读写与窗口关闭需在 Tauri 桌面版验证。

可选的 Windows 原生烟测：先构建桌面版、至少运行一次以初始化偏好 Store，然后关闭所有 Markdown Studio 窗口，运行 `npm run test:native`。脚本使用本次构建的 EXE 与本机 WebView2 调试接口，临时创建测试文档和最近文件记录，验证真实读写、CRLF 保留、取消关闭与保存后退出，并按字节恢复测试前的偏好设置。默认使用空闲端口 9222，可通过 `MD_QA_PORT` 指定其他端口；不模拟系统文件选择器点击。

Windows 安装包会生成在：

- `src-tauri/target/release/bundle/msi/`
- `src-tauri/target/release/bundle/nsis/`

发布到 GitHub Releases 前，先准备无空格的资产文件名：

```powershell
pwsh -File scripts/prepare-release-assets.ps1
```

脚本会把 Tauri 的构建输出复制到 `src-tauri/target/release/release-assets/`，并生成适合 Release 的文件名：

- `markdown-studio-<version>.exe`
- `markdown-studio-<version>-x64.msi`
- `markdown-studio-<version>-x64-setup.exe`

## 快捷键

| 快捷键 | 操作 |
| --- | --- |
| `Ctrl+N` | 新建文档 |
| `Ctrl+O` | 打开文档 |
| `Ctrl+S` | 保存 |
| `Ctrl+Shift+S` | 另存为 |
| `Ctrl+F` | 打开编辑器搜索 |
| `Ctrl+H` | 打开搜索与替换 |
| `Ctrl+B` / `Ctrl+I` | 加粗 / 斜体 |
| `Ctrl+K` | 插入链接 |
| `Ctrl+Z` / `Ctrl+Y` | 撤销 / 重做 |
| `Ctrl+Enter` | 在编辑器与预览间切换焦点 |

## 文件与隐私

- 文档按 UTF-8 读写，并保留原文件的 LF/CRLF 换行格式。
- 应用只读写用户明确打开或保存的 Markdown 文件。
- 文档内容不会上传到云端；主题、字号、分栏比例和最近文件仅保存在本机。
- 预览默认不执行原始 HTML 或脚本。
- 不自动保存或缓存文档正文；程序异常退出时，尚未手动保存的编辑内容不能恢复。
- 当前未提供外部文件修改冲突检测、事务式磁盘替换或版本历史。

## 项目状态

当前源码版本为 v0.2.1，重点覆盖单文档编辑、实时预览和本地文件工作流。云同步、插件、版本历史和多标签页不在当前版本范围内。线上安装包版本以 Releases 实际内容为准。

## 下载与发布

- [查看 GitHub Releases](https://github.com/shark0728/markdown-studio/releases)
- Windows 安装包提供 MSI 和 NSIS 两种格式，另附独立 EXE 运行文件。

## 许可证

本项目采用 [MIT License](./LICENSE)。

## English summary

Markdown Studio is a local-first Windows Markdown viewer and editor built with Tauri 2, React, and TypeScript. Version 0.2.0 adds selection-aware formatting, undo/redo, recent-file management, real editor/split/preview modes, search and replace, cursor statistics, and persisted wrapping/line-number settings. Unsaved documents stay local and are not automatically backed up.
