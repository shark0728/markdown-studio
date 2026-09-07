import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/dialog"

export function UnsavedDialog({ open, title, busy, error, onSave, onDiscard, onCancel }: {
  open: boolean; title: string; busy: boolean; error: string | null; onSave: () => void; onDiscard: () => void; onCancel: () => void
}) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  return <Modal open={open} title="有未保存的修改" description={"“" + title + "”中的修改尚未保存。要先保存吗？"} onClose={onCancel} initialFocus={cancelRef} busy={busy} alert>
    {error && <p className="mb-4 break-words text-sm text-red-700 dark:text-red-300" role="alert">{error}</p>}
    <div className="flex flex-wrap justify-end gap-2">
      <Button ref={cancelRef} variant="ghost" onClick={onCancel} disabled={busy}>取消</Button>
      <Button variant="subtle" onClick={onDiscard} disabled={busy}>不保存</Button>
      <Button onClick={onSave} disabled={busy}>{busy ? "处理中…" : "保存"}</Button>
    </div>
  </Modal>
}
