import { FilePlus2, FolderOpen, Save, Sun, Moon, Settings2, Search, Columns2, Eye, Code2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Theme } from "@/types"

type ToolbarProps = {
  title: string
  isDirty: boolean
  theme: Theme
  viewMode: "editor" | "preview"
  settingsOpen: boolean
  onNew: () => void
  onOpen: () => void
  onSave: () => void
  onSaveAs: () => void
  onToggleTheme: () => void
  onToggleSettings: () => void
  onSearch: () => void
  onViewModeChange: (mode: "editor" | "preview") => void
}

export function Toolbar({ title, isDirty, theme, viewMode, settingsOpen, onNew, onOpen, onSave, onSaveAs, onToggleTheme, onToggleSettings, onSearch, onViewModeChange }: ToolbarProps) {
  return (
    <header className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-1">
        <div className="mr-2 flex items-center gap-2 border-r border-border pr-3 sm:mr-3 sm:pr-4">
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-accent text-sm font-bold text-accent-foreground shadow-sm">M</div>
          <span className="hidden text-sm font-semibold tracking-tight text-ink sm:inline">Markdown Studio</span>
        </div>
        <Button size="icon" variant="ghost" onClick={onNew} title="新建 (Ctrl+N)" aria-label="新建文档"><FilePlus2 size={17} /></Button>
        <Button size="icon" variant="ghost" onClick={onOpen} title="打开 (Ctrl+O)" aria-label="打开文档"><FolderOpen size={17} /></Button>
        <Button size="icon" variant="ghost" onClick={onSave} title="保存 (Ctrl+S)" aria-label="保存文档"><Save size={17} /></Button>
        <button className="hidden rounded-md px-2 py-1 text-xs text-muted transition hover:bg-ink/5 hover:text-ink sm:inline" onClick={onSaveAs}>另存为</button>
      </div>
      <div className="min-w-0 flex-1 text-center">
        <div className="truncate text-sm font-medium text-ink">{title}{isDirty && <span className="ml-1.5 text-accent" aria-label="有未保存修改">•</span>}</div>
        <div className="hidden text-[10px] uppercase tracking-[0.18em] text-muted sm:block">{isDirty ? "未保存修改" : "已保存"}</div>
      </div>
      <div className="flex items-center gap-1">
        <div className="hidden items-center rounded-lg bg-ink/5 p-0.5 dark:bg-white/10 md:flex" role="tablist" aria-label="视图模式">
          <Button size="sm" variant={viewMode === "editor" ? "outline" : "ghost"} onClick={() => onViewModeChange("editor")} role="tab" aria-selected={viewMode === "editor"} title="编辑器"><Code2 size={14} /></Button>
          <Button size="sm" variant={viewMode === "preview" ? "outline" : "ghost"} onClick={() => onViewModeChange("preview")} role="tab" aria-selected={viewMode === "preview"} title="预览"><Eye size={14} /></Button>
          <Button size="sm" variant="ghost" onClick={() => onViewModeChange("editor")} title="左右分栏"><Columns2 size={14} /></Button>
        </div>
        <Button size="icon" variant="ghost" onClick={onSearch} title="搜索 (Ctrl+F)" aria-label="搜索"><Search size={17} /></Button>
        <Button size="icon" variant="ghost" onClick={onToggleTheme} title={theme === "light" ? "切换深色模式" : "切换浅色模式"} aria-label="切换主题">{theme === "light" ? <Moon size={17} /> : <Sun size={17} />}</Button>
        <div className="relative">
          <Button size="icon" variant={settingsOpen ? "subtle" : "ghost"} onClick={onToggleSettings} title="编辑器设置" aria-label="编辑器设置" aria-expanded={settingsOpen}><Settings2 size={17} /></Button>
        </div>
      </div>
    </header>
  )
}
