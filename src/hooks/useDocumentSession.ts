import { useCallback, useRef, useState } from "react"
import { createDocument, markDocumentSaved, toDiskContent, updateDocumentContent } from "@/lib/document"
import type { FileService } from "@/lib/file-service"
import type { DocumentState } from "@/types"

export type DocumentAction = { kind: "new" | "close" } | { kind: "open"; path?: string }

export function useDocumentSession(service: FileService, rememberPath: (path: string) => void, close: () => Promise<void>) {
  const [doc, setDoc] = useState(() => createDocument())
  const [revision, setRevision] = useState(0)
  const current = useRef(doc)
  const locked = useRef(false)
  const [busy, setBusy] = useState<"opening" | "saving" | "closing" | null>(null)
  const [pending, setPending] = useState<DocumentAction | null>(null)
  const pendingRef = useRef<DocumentAction | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const setCurrent = useCallback((value: DocumentState) => { current.current = value; setDoc(value) }, [])
  const setPendingAction = useCallback((value: DocumentAction | null) => { pendingRef.current = value; setPending(value) }, [])
  const change = useCallback((value: string) => { setCurrent(updateDocumentContent(current.current, value)) }, [setCurrent])

  const save = useCallback(async (saveAs = false) => {
    if (locked.current) return false
    locked.current = true
    setBusy("saving")
    setError(null)
    const snapshot = current.current
    try {
      const path = saveAs || !snapshot.path ? await service.chooseSaveFile(snapshot.path ?? "未命名文档.md") : snapshot.path
      if (!path) return false
      await service.write(path, toDiskContent(snapshot.content, snapshot.lineEnding))
      setCurrent(markDocumentSaved(current.current, path, snapshot.content))
      rememberPath(path)
      setNotice(current.current.isDirty ? "已保存，仍有后续修改待保存" : "已保存")
      return !current.current.isDirty
    } catch (cause) {
      setError(`无法保存文件：${cause instanceof Error ? cause.message : String(cause)}`)
      return false
    } finally { locked.current = false; setBusy(null) }
  }, [service, rememberPath, setCurrent])

  const execute = useCallback(async (action: DocumentAction) => {
    if (locked.current) return
    locked.current = true
    setError(null)
    setBusy(action.kind === "close" ? "closing" : "opening")
    try {
      if (action.kind === "new") {
        setCurrent(createDocument())
        setRevision((value) => value + 1)
        setNotice("已创建新文档")
      } else if (action.kind === "open") {
        const path = action.path ?? await service.chooseOpenFile()
        if (!path) return
        const content = await service.read(path)
        setCurrent(createDocument(content, path))
        setRevision((value) => value + 1)
        rememberPath(path)
        setNotice("已打开文档")
      } else {
        await close()
      }
    } catch (cause) {
      setError(`无法${action.kind === "close" ? "关闭窗口" : "打开文件"}：${cause instanceof Error ? cause.message : String(cause)}`)
    } finally { locked.current = false; setBusy(null) }
  }, [service, close, rememberPath, setCurrent])

  const request = useCallback((action: DocumentAction) => {
    if (locked.current || pendingRef.current) return
    setError(null)
    if (current.current.isDirty) setPendingAction(action)
    else void execute(action)
  }, [execute, setPendingAction])

  const resolve = useCallback(async (choice: "save" | "discard" | "cancel") => {
    if (locked.current) return
    const action = pendingRef.current
    if (!action) return
    if (choice === "cancel") { setPendingAction(null); return }
    if (choice === "save" && !await save()) return
    setPendingAction(null)
    await execute(action)
  }, [execute, save, setPendingAction])

  const dismissError = useCallback(() => setError(null), [])
  const dismissNotice = useCallback(() => setNotice(null), [])
  return { doc, revision, change, busy, pending, request, resolve, save, error, dismissError, notice, dismissNotice }
}
