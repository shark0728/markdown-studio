import { Bold, Italic, Strikethrough, Code, Heading1, Heading2, Heading3, Quote, List, ListOrdered, ListTodo, Link, SquareCode, Table2, Undo2, Redo2, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { FormatAction } from "@/lib/formatting"
import type { EditorStatus } from "@/types"

const items: { action: FormatAction; label: string; icon: LucideIcon }[] = [
  { action: "bold", label: "加粗 (Ctrl+B)", icon: Bold }, { action: "italic", label: "斜体 (Ctrl+I)", icon: Italic },
  { action: "strike", label: "删除线", icon: Strikethrough }, { action: "heading1", label: "一级标题", icon: Heading1 },
  { action: "heading2", label: "二级标题", icon: Heading2 }, { action: "heading3", label: "三级标题", icon: Heading3 },
  { action: "quote", label: "引用", icon: Quote }, { action: "bullet", label: "无序列表", icon: List },
  { action: "ordered", label: "有序列表", icon: ListOrdered }, { action: "task", label: "任务列表", icon: ListTodo },
  { action: "link", label: "插入链接 (Ctrl+K)", icon: Link }, { action: "inlineCode", label: "行内代码", icon: Code },
  { action: "codeBlock", label: "代码块", icon: SquareCode }, { action: "table", label: "插入表格", icon: Table2 },
]

export function FormattingToolbar({ onFormat, onUndo, onRedo, status, disabled }: { onFormat: (action: FormatAction) => void; onUndo: () => void; onRedo: () => void; status: EditorStatus; disabled: boolean }) {
  return <div className="formatting-toolbar flex shrink-0 items-center gap-0.5 overflow-x-auto border-b border-border bg-surface px-2 py-1" role="group" aria-label="Markdown 格式">
    <Button size="icon" variant="ghost" disabled={disabled || !status.canUndo} onClick={onUndo} title="撤销 (Ctrl+Z)" aria-label="撤销"><Undo2 size={16} aria-hidden="true" /></Button>
    <Button size="icon" variant="ghost" disabled={disabled || !status.canRedo} onClick={onRedo} title="重做 (Ctrl+Y)" aria-label="重做"><Redo2 size={16} aria-hidden="true" /></Button>
    <span className="mx-1 h-5 border-r border-border" />
    {items.map(({ action, label, icon: Icon }) => <Button key={action} size="icon" variant="ghost" disabled={disabled} onMouseDown={(event) => event.preventDefault()} onClick={() => onFormat(action)} title={label} aria-label={label}><Icon size={16} aria-hidden="true" /></Button>)}
  </div>
}
