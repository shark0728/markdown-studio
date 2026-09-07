import { FilePlus2, FolderOpen, Save, SaveAll, Sun, Moon, Settings2, Search, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Theme } from "@/types"
import appIcon from "../../src-tauri/icons/32x32.png"

type ToolbarProps = {
  title: string; isDirty: boolean; theme: Theme; disabled: boolean
  onNew: () => void; onOpen: () => void; onSave: () => void; onSaveAs: () => void
  onRecent: () => void; onToggleTheme: () => void; onSettings: () => void; onSearch: () => void
}

export function Toolbar({ title, isDirty, theme, disabled, onNew, onOpen, onSave, onSaveAs, onRecent, onToggleTheme, onSettings, onSearch }: ToolbarProps) {
  return <header className="app-toolbar flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-surface px-3 py-2">
    <div className="mr-1 flex shrink-0 items-center gap-2">
      <img src={appIcon} alt="" className="h-8 w-8" />
      <span className="hidden text-sm font-semibold xl:inline">Markdown Studio</span>
    </div>
    <div className="flex items-center gap-0.5">
      <Button size="icon" variant="ghost" disabled={disabled} onClick={onNew} title="新建 (Ctrl+N)" aria-label="新建文档"><FilePlus2 size={17} /></Button>
      <Button size="icon" variant="ghost" disabled={disabled} onClick={onOpen} title="打开 (Ctrl+O)" aria-label="打开文档"><FolderOpen size={17} /></Button>
      <Button size="icon" variant="ghost" disabled={disabled} onClick={onRecent} title="最近文件" aria-label="最近文件"><History size={17} /></Button>
      <Button size="icon" variant="ghost" disabled={disabled} onClick={onSave} title="保存 (Ctrl+S)" aria-label="保存文档"><Save size={17} /></Button>
      <Button size="icon" variant="ghost" disabled={disabled} onClick={onSaveAs} title="另存为 (Ctrl+Shift+S)" aria-label="另存为"><SaveAll size={17} /></Button>
    </div>
    <div className="document-title min-w-0 flex-1 truncate text-center text-sm font-medium" title={title}>
      {title}{isDirty && <span className="ml-1.5 text-accent" aria-label="有未保存修改">•</span>}
    </div>
    <div className="ml-auto flex shrink-0 items-center gap-0.5">
      <Button size="icon" variant="ghost" disabled={disabled} onClick={onSearch} title="搜索与替换 (Ctrl+F)" aria-label="搜索与替换"><Search size={17} /></Button>
      <Button size="icon" variant="ghost" disabled={disabled} onClick={onToggleTheme} title={theme === "light" ? "切换深色模式" : "切换浅色模式"} aria-label="切换主题">{theme === "light" ? <Moon size={17} /> : <Sun size={17} />}</Button>
      <Button size="icon" variant="ghost" disabled={disabled} onClick={onSettings} title="编辑器设置" aria-label="编辑器设置"><Settings2 size={17} /></Button>
    </div>
  </header>
}
