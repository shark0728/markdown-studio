import { useState } from "react"
import { FileText, X, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/dialog"
import { titleFromPath } from "@/lib/document"

export function RecentFiles({ open, files, onClose, onOpen, onRemove, onClear }: {
  open: boolean; files: string[]; onClose: () => void; onOpen: (path: string) => void; onRemove: (path: string) => void; onClear: () => void
}) {
  const [query, setQuery] = useState("")
  const filtered = files.filter((path) => path.toLowerCase().includes(query.toLowerCase()))
  return <Modal open={open} title="最近文件" onClose={onClose}>
    <input className="field mb-3 w-full" aria-label="筛选最近文件" placeholder="筛选文件名或路径" value={query} onChange={(event) => setQuery(event.target.value)} />
    <ul className="max-h-72 overflow-y-auto" aria-label="最近文件列表">
      {filtered.map((path) => <li key={path} className="flex min-w-0 items-center gap-1 border-b border-border py-1">
        <button className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-accent/10" title={path} onClick={() => { onClose(); onOpen(path) }}>
          <FileText size={18} className="shrink-0 text-accent" aria-hidden="true" />
          <span className="min-w-0"><span className="block truncate text-sm font-medium">{titleFromPath(path)}</span><span className="block truncate text-xs text-muted">{path}</span></span>
        </button>
        <Button size="icon" variant="ghost" aria-label={`移除记录 ${titleFromPath(path)}`} title="移除记录" onClick={() => onRemove(path)}><X size={15} aria-hidden="true" /></Button>
      </li>)}
    </ul>
    {!filtered.length && <p className="py-8 text-center text-sm text-muted">{files.length ? "没有匹配的文件" : "暂无最近文件"}</p>}
    <div className="mt-3 flex justify-end"><Button variant="ghost" disabled={!files.length} onClick={onClear}><Trash2 size={15} aria-hidden="true" />清空记录</Button></div>
  </Modal>
}
