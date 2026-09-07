import * as Dialog from "@radix-ui/react-dialog"
import { useId, useRef, type ReactNode, type RefObject } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Modal({ open, title, children, onClose, description, initialFocus, busy = false, alert = false }: {
  open: boolean; title: string; children: ReactNode; onClose: () => void; description?: string; initialFocus?: RefObject<HTMLElement>; busy?: boolean; alert?: boolean
}) {
  const descriptionId = useId()
  const restoreFocus = useRef<HTMLElement | null>(null)
  return <Dialog.Root open={open} onOpenChange={(value) => { if (!value && !busy) onClose() }}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 bg-black/35" />
      <Dialog.Content role={alert ? "alertdialog" : "dialog"} aria-describedby={description ? descriptionId : undefined}
        className="modal-content fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-auto rounded-lg border border-border bg-surface p-5 text-ink shadow-soft"
        onOpenAutoFocus={(event) => {
          restoreFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
          if (initialFocus?.current) { event.preventDefault(); initialFocus.current.focus() }
        }}
        onCloseAutoFocus={(event) => { event.preventDefault(); restoreFocus.current?.focus() }}
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => { if (busy) event.preventDefault() }}>
        <div className="mb-4 flex items-center justify-between gap-4">
          <Dialog.Title className="text-base font-semibold">{title}</Dialog.Title>
          <Button size="icon" variant="ghost" onClick={onClose} disabled={busy} aria-label={`关闭${title}`}><X size={16} aria-hidden="true" /></Button>
        </div>
        {description && <Dialog.Description id={descriptionId} className="mb-4 break-words text-sm leading-6 text-muted">{description}</Dialog.Description>}
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
