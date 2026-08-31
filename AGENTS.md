# Markdown 编辑器项目说明

## 技术栈

- Tauri 2 + React + TypeScript + Vite
- Tailwind CSS + shadcn/ui 风格组件
- CodeMirror 6 编辑器
- react-markdown + remark-gfm + rehype-sanitize 预览

## 目录结构

- `src/`：React 前端、文档状态、Markdown 解析和界面组件
- `src-tauri/`：Tauri 原生壳、插件和权限配置
- `public/`：静态资源

## 运行与验证

```powershell
npm install
npm run dev
npm run tauri dev
npm run lint
npm run test
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri build
```

## 约束

- 文档默认按 UTF-8 读写，并保留原文件 LF/CRLF 换行格式。
- 预览不执行原始 HTML 或脚本，必须经过安全过滤。
- 修改前保留用户已有文件；当前项目为空目录时按模块拆分实现。
- 不把密码、令牌、私钥或本地敏感路径写入项目文档。

## 验收重点

- 能打开、编辑、保存和另存为 Markdown 文件。
- GFM 表格、任务列表、删除线、代码块和标题大纲正确。
- 未保存内容在切换文件、新建和关闭窗口时有明确提示。
- 主题、字号、分栏比例和最近文件能跨重启保存。
- `npm run lint`、`npm run test`、`npm run build`、`cargo test` 通过。
