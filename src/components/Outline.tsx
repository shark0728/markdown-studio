import { ListTree } from "lucide-react"
import type { OutlineItem } from "@/types"

type OutlineProps = {
  items: OutlineItem[]
  collapsed: boolean
  onToggle: () => void
  onSelect: (item: OutlineItem) => void
}

export function Outline({ items, collapsed, onToggle, onSelect }: OutlineProps) {
  return (
    <aside className={`outline-panel flex min-h-0 flex-col border-r border-border bg-surface transition-[width] duration-200 ${collapsed ? "w-12" : "w-60"}`}>
      <div className="flex h-12 shrink-0 items-center border-b border-border px-3">
        <button className="flex items-center gap-2 rounded-lg p-1.5 text-muted transition hover:bg-ink/5 hover:text-ink" onClick={onToggle} aria-label={collapsed ? "展开大纲" : "折叠大纲"} title={collapsed ? "展开大纲" : "折叠大纲"}>
          <ListTree size={17} aria-hidden="true" />
          {!collapsed && <span className="text-xs font-semibold uppercase tracking-[0.18em]">大纲</span>}
        </button>
      </div>
      {!collapsed && (
        <nav className="min-h-0 flex-1 overflow-auto p-2" aria-label="文档大纲">
          {items.length ? items.map((item) => (
            <button
              key={`${item.id}-${item.line}`}
              className="mb-0.5 block w-full truncate rounded-md px-2 py-1.5 text-left text-sm text-muted transition hover:bg-accent/10 hover:text-accent"
              style={{ paddingLeft: `${8 + (item.level - 1) * 12}px` }}
              onClick={() => onSelect(item)}
              title={`跳转到第 ${item.line} 行`}
            >
              {item.text}
            </button>
          )) : <p className="px-2 py-4 text-xs leading-5 text-muted">输入标题后，这里会显示文档结构。</p>}
        </nav>
      )}
    </aside>
  )
}
