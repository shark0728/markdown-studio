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
- `src/hooks/`：文档操作状态机与偏好持久化；异步文件操作不得绕过操作锁和保存快照。
- `src/lib/formatting.ts`：CodeMirror 格式事务，选区/多光标/撤销必须保持一致。
- `tests/e2e/`：真实 CodeMirror、布局、焦点与持久化的 Playwright 回归测试。
- `scripts/prepare-release-assets.ps1`：准备无空格的 Windows 发布文件名。

## 运行与验证

```powershell
npm install
npm run dev
npm run tauri dev
npm run lint
npm run test
npm run test:e2e
npm run build
cargo test --manifest-path src-tauri/Cargo.toml
npm run tauri build
```

## 约束

- 文档默认按 UTF-8 读写，并保留原文件 LF/CRLF 换行格式。
- 预览不执行原始 HTML 或脚本，必须经过安全过滤。
- 修改前保留用户已有文件；当前项目为空目录时按模块拆分实现。
- 不把密码、令牌、私钥或本地敏感路径写入项目文档。
- 编辑区与预览区只能各保留一个实例；切换文件时重置历史，切换视图时保留当前编辑器状态。
- 保存完成后只能把写入磁盘的快照标记为已保存，不能把保存期间产生的新编辑误标为已保存。
- 最近文件的移除/清空仅修改偏好记录，不删除磁盘文件；文档内容不写入偏好 Store。
- 偏好读取完成前不得将默认值写回磁盘；启动期间到达的更新需要合并到加载结果，关闭前 flush 必须等待读取与写入。
- 预览只在文档 revision 改变时复位；内容变化、保存、字号与视图模式变化不应强制跳回顶部。
- 格式化测试需验证 Markdown AST 结果、空白与反引号边界、反向操作和多光标；处理大选区时避免将无界数组展开为函数参数。
- 大纲使用 remark AST 解析，预览根据同一行号映射生成标题 ID，避免重复实现 Markdown 语法。
- 新弹窗使用 Radix 对话框保证键盘焦点和 Esc；弹窗打开时不执行后台文档快捷键。
- 发布前同步 `package.json`、`package-lock.json`、Tauri 配置及 Cargo 清单/锁文件版本；不自动覆盖已安装软件或旧版 Release。
- Windows 发布文件名固定为 `markdown-studio-<version>.exe`、`markdown-studio-<version>-x64.msi`、`markdown-studio-<version>-x64-setup.exe`。
- `npm run test:e2e` 依赖已安装的 Microsoft Edge，测试使用端口 1425；测试产物不得提交。
- 可选 `npm run test:native` 使用已构建的 EXE 和 WebView2 调试端口；必须关闭已有应用窗口，且已有初始化的偏好 Store。测试仅改动临时文档，结束后恢复偏好文件；不绕过 Tauri 权限或改写只读接口。

## 验收重点

- 能打开、编辑、保存和另存为 Markdown 文件。
- GFM 表格、任务列表、删除线、代码块和标题大纲正确。
- 未保存内容在切换文件、新建和关闭窗口时有明确提示。
- 主题、字号、分栏比例和最近文件能跨重启保存。
- `npm run lint`、`npm run test`、`npm run build`、`cargo test` 通过。
