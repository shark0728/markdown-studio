import { useEffect, useRef } from "react"
import { AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

type UnsavedDialogProps = {
  open: boolean
  title: string
  onSave: () => void
  onDiscard: () => void
  onCancel: () => void
}

export function UnsavedDialog({ open, title, onSave, onDiscard, onCancel }: UnsavedDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (open) cancelRef.current?.focus()
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm" role="presentation">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-soft" role="alertdialog" aria-modal="true" aria-labelledby="unsaved-title">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full bg-amber-500/15 p-2 text-amber-600 dark:text-amber-300">
            <AlertCircle size={18} aria-hidden="true" />
          </div>
          <div>
            <h2 id="unsaved-title" className="text-base font-semibold text-ink">有未保存的修改</h2>
            <p className="mt-1 text-sm leading-6 text-muted">“{title}”中的修改尚未保存。要先保存吗？</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button ref={cancelRef} variant="ghost" onClick={onCancel}>取消</Button>
          <Button variant="subtle" onClick={onDiscard}>不保存</Button>
          <Button onClick={onSave}>保存</Button>
        </div>
      </div>
    </div>
  )
}
