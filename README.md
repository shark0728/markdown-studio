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
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri build
```

Windows 安装包会生成在：

- `src-tauri/target/release/bundle/msi/`
- `src-tauri/target/release/bundle/nsis/`

## 快捷键

| 快捷键 | 操作 |
| --- | --- |
| `Ctrl+N` | 新建文档 |
| `Ctrl+O` | 打开文档 |
| `Ctrl+S` | 保存 |
| `Ctrl+Shift+S` | 另存为 |
| `Ctrl+F` | 打开编辑器搜索 |
| `Ctrl+Enter` | 在编辑器与预览间切换焦点 |

## 文件与隐私

- 文档按 UTF-8 读写，并保留原文件的 LF/CRLF 换行格式。
- 应用只读写用户明确打开或保存的 Markdown 文件。
- 文档内容不会上传到云端；主题、字号、分栏比例和最近文件仅保存在本机。
- 预览默认不执行原始 HTML 或脚本。

## 项目状态

当前为 v1 核心版本，重点覆盖单文档编辑、实时预览和本地文件工作流。云同步、插件、版本历史和多标签页不在当前版本范围内。

## English summary

Markdown Studio is a local-first Windows Markdown viewer and editor built with Tauri 2, React, and TypeScript. It supports GFM live preview, CodeMirror editing, outline navigation, local file operations, unsaved-change protection, dark mode, and persisted local preferences.
