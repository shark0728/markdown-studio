import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { isTauri } from "@tauri-apps/api/core"
import { Code2, Eye, FileText, Info, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MarkdownEditor } from "@/components/MarkdownEditor"
import { MarkdownPreview, type MarkdownPreviewHandle } from "@/components/MarkdownPreview"
import { Outline } from "@/components/Outline"
import { Toolbar } from "@/components/Toolbar"
import { UnsavedDialog } from "@/components/UnsavedDialog"
import { createDocument, markDocumentSaved, updateDocumentContent, toDiskContent } from "@/lib/document"
import { tauriFileService, type FileService } from "@/lib/file-service"
import { isMarkdownPath } from "@/lib/document"
import { extractOutline } from "@/lib/markdown"
import { scrollEditorToLine } from "@/lib/editor"
import { closeWindow, shouldInterceptClose } from "@/lib/window"
import { preferencesStore as tauriPreferencesStore, type PreferencesStore } from "@/lib/preferences"
import { cn } from "@/lib/utils"
import { DEFAULT_PREFERENCES, type AppPreferences, type DocumentState, type OutlineItem, type Theme } from "@/types"
import type { EditorView } from "@codemirror/view"
import { openSearchPanel } from "@codemirror/search"

type PendingAction = "new" | "open" | "close"

type AppProps = {
  fileService?: FileService
  preferenceStorage?: PreferencesStore
}

export default function App({ fileService = tauriFileService, preferenceStorage = tauriPreferencesStore }: AppProps) {
  const [doc, setDocument] = useState<DocumentState>(() => createDocument())
  const [preferences, setPreferences] = useState<AppPreferences>(DEFAULT_PREFERENCES)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [outlineCollapsed, setOutlineCollapsed] = useState(false)
  const [viewMode, setViewMode] = useState<"editor" | "preview">("editor")
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [pendingOpenPath, setPendingOpenPath] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isReady, setIsReady] = useState(false)
  const editorViewRef = useRef<EditorView | null>(null)
  const previewRef = useRef<MarkdownPreviewHandle>(null)
  const appWindowRef = useRef(isTauri() ? getCurrentWindow() : null)
  const mainRef = useRef<HTMLDivElement>(null)
  const pendingCloseRef = useRef(false)
  const dirtyRef = useRef(doc.isDirty)
  const saveAsRef = useRef<() => Promise<boolean>>(async () => false)

  dirtyRef.current = doc.isDirty

  const outline = useMemo(() => extractOutline(doc.content), [doc.content])

  const persistPreferences = useCallback((next: AppPreferences) => {
    setPreferences(next)
    void preferenceStorage.write(next).catch(() => undefined)
  }, [preferenceStorage])

  useEffect(() => {
    if (!isTauri()) {
      setIsReady(true)
      return
    }
    let active = true
    void preferenceStorage.read().then((value) => {
      if (!active) return
      setPreferences(value)
      setIsReady(true)
    }).catch(() => {
      if (active) setIsReady(true)
    })
    return () => { active = false }
  }, [preferenceStorage])

  useEffect(() => {
    window.document.documentElement.classList.toggle("dark", preferences.theme === "dark")
  }, [preferences.theme])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return
      if (event.key.toLowerCase() === "n") { event.preventDefault(); requestAction("new") }
      if (event.key.toLowerCase() === "o") { event.preventDefault(); requestAction("open") }
      if (event.key.toLowerCase() === "s") { event.preventDefault(); if (event.shiftKey) void saveAs(); else void save() }
      if (event.key === "Enter") {
        event.preventDefault()
        const editing = event.target instanceof HTMLElement && Boolean(event.target.closest(".cm-editor"))
        if (editing) { setViewMode("preview"); previewRef.current?.focus() }
        else { setViewMode("editor"); editorViewRef.current?.focus() }
      }
      if (event.key.toLowerCase() === "f") { event.preventDefault(); if (editorViewRef.current) { setViewMode("editor"); editorViewRef.current.focus(); openSearchPanel(editorViewRef.current) } }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  })

  useEffect(() => {
    if (!isTauri()) return
    const appWindow = appWindowRef.current
    if (!appWindow) return
    const unlisten = appWindow.onCloseRequested((event) => {
      if (!shouldInterceptClose(dirtyRef.current, pendingCloseRef.current)) return
      event.preventDefault()
      setPendingAction("close")
    })
    return () => { void unlisten.then((cleanup) => cleanup()) }
  }, [])

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(null), 2800)
    return () => window.clearTimeout(timeout)
  }, [notice])

  const rememberPath = useCallback((path: string) => {
    const next = { ...preferences, recentFiles: [path, ...preferences.recentFiles.filter((item) => item !== path)].slice(0, 8) }
    persistPreferences(next)
  }, [persistPreferences, preferences])

  const openPath = useCallback(async (path: string) => {
    setError(null)
    try {
      const content = await fileService.read(path)
      setDocument(createDocument(content, path))
      rememberPath(path)
      setNotice("已打开文档")
    } catch (cause) {
      setError(`无法打开文件：${cause instanceof Error ? cause.message : String(cause)}`)
    }
  }, [fileService, rememberPath])

  useEffect(() => {
    if (!isTauri()) return
    const appWindow = appWindowRef.current
    if (!appWindow) return
    const unlisten = appWindow.onDragDropEvent((event) => {
      if (event.payload.type !== "drop") return
      const path = event.payload.paths.find(isMarkdownPath)
      if (!path) return
      if (doc.isDirty) {
        setPendingOpenPath(path)
        setPendingAction("open")
        return
      }
      void openPath(path)
    })
    return () => { void unlisten.then((cleanup) => cleanup()) }
  }, [doc.isDirty, openPath])

  const save = useCallback(async () => {
    setError(null)
    if (!doc.path) return saveAsRef.current()
    try {
      await fileService.write(doc.path, toDiskContent(doc.content, doc.lineEnding))
      setDocument((current) => markDocumentSaved(current))
      rememberPath(doc.path)
      setNotice("已保存")
      return true
    } catch (cause) {
      setError(`无法保存文件：${cause instanceof Error ? cause.message : String(cause)}`)
      return false
    }
  }, [doc, fileService, rememberPath])

  const saveAs = useCallback(async () => {
    setError(null)
    try {
      const path = await fileService.chooseSaveFile(doc.path ?? "未命名文档.md")
      if (!path) return false
      await fileService.write(path, toDiskContent(doc.content, doc.lineEnding))
      setDocument((current) => markDocumentSaved(current, path))
      rememberPath(path)
      setNotice("已另存为")
      return true
    } catch (cause) {
      setError(`无法另存文件：${cause instanceof Error ? cause.message : String(cause)}`)
      return false
    }
  }, [doc, fileService, rememberPath])
  saveAsRef.current = saveAs

  const openFromDialog = useCallback(async () => {
    const path = await fileService.chooseOpenFile()
    if (path) await openPath(path)
  }, [fileService, openPath])

  const executeAction = useCallback(async (action: PendingAction) => {
    if (action === "new") {
      setDocument(createDocument())
      setNotice("已创建新文档")
    } else if (action === "open") {
      const droppedPath = pendingOpenPath
      setPendingOpenPath(null)
      if (droppedPath) await openPath(droppedPath)
      else await openFromDialog()
    } else if (action === "close") {
      pendingCloseRef.current = true
      try {
        await closeWindow(appWindowRef.current)
      } catch (cause) {
        pendingCloseRef.current = false
        setError(`无法关闭窗口：${cause instanceof Error ? cause.message : String(cause)}`)
      }
    }
  }, [openFromDialog, openPath, pendingOpenPath])

  const requestAction = useCallback((action: PendingAction) => {
    if (action === "open") setPendingOpenPath(null)
    if (doc.isDirty) {
      setPendingAction(action)
      return
    }
    void executeAction(action)
  }, [doc.isDirty, executeAction])

  const handleSavePending = async () => {
    const saved = await save()
    if (!saved || !pendingAction) return
    const action = pendingAction
    setPendingAction(null)
    await executeAction(action)
  }

  const handleDiscardPending = async () => {
    if (!pendingAction) return
    const action = pendingAction
    setPendingAction(null)
    await executeAction(action)
  }

  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    const move = (moveEvent: PointerEvent) => {
      const bounds = mainRef.current?.getBoundingClientRect()
      if (!bounds) return
      const next = (moveEvent.clientX - bounds.left) / bounds.width
      persistPreferences({ ...preferences, splitRatio: Math.min(0.7, Math.max(0.3, next)) })
    }
    const stop = () => {
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerup", stop)
    }
    window.addEventListener("pointermove", move)
    window.addEventListener("pointerup", stop, { once: true })
  }

  const toggleTheme = () => {
    const theme: Theme = preferences.theme === "light" ? "dark" : "light"
    persistPreferences({ ...preferences, theme })
  }

  const editorCount = doc.content.length
  const lineCount = doc.content ? doc.content.split("\n").length : 1

  return (
    <div className="app-shell flex h-screen min-h-0 flex-col bg-canvas text-ink" ref={mainRef}>
      <Toolbar
        title={doc.title}
        isDirty={doc.isDirty}
        theme={preferences.theme}
        viewMode={viewMode}
        settingsOpen={settingsOpen}
        onNew={() => requestAction("new")}
        onOpen={() => requestAction("open")}
        onSave={() => void save()}
        onSaveAs={() => void saveAs()}
        onToggleTheme={toggleTheme}
        onToggleSettings={() => setSettingsOpen((value) => !value)}
        onSearch={() => editorViewRef.current?.focus()}
        onViewModeChange={setViewMode}
      />
      <div className="relative flex min-h-0 flex-1">
        <Outline items={outline} collapsed={outlineCollapsed} onToggle={() => setOutlineCollapsed((value) => !value)} onSelect={(item: OutlineItem) => { scrollEditorToLine(editorViewRef.current, item.line); previewRef.current?.scrollToHeading(item.id) }} />
        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col" aria-label="Markdown 编辑区域">
          <div className="flex h-11 shrink-0 items-center justify-between border-b border-border bg-surface px-4 lg:hidden">
            <div className="flex items-center gap-1 rounded-lg bg-ink/5 p-0.5 dark:bg-white/10" role="tablist" aria-label="移动视图模式">
              <Button size="sm" variant={viewMode === "editor" ? "outline" : "ghost"} onClick={() => setViewMode("editor")} role="tab" aria-selected={viewMode === "editor"}><Code2 size={14} />编辑</Button>
              <Button size="sm" variant={viewMode === "preview" ? "outline" : "ghost"} onClick={() => setViewMode("preview")} role="tab" aria-selected={viewMode === "preview"}><Eye size={14} />预览</Button>
            </div>
            <span className="text-xs text-muted">GFM · UTF-8</span>
          </div>
          <div className="flex min-h-0 flex-1">
            <section className={cn("h-full min-h-0 min-w-0", viewMode === "editor" ? "block" : "hidden lg:block")} style={{ width: `${preferences.splitRatio * 100}%` }} aria-label="Markdown 源码编辑器">
              <MarkdownEditor value={doc.content} onChange={(value) => setDocument((current) => updateDocumentContent(current, value))} theme={preferences.theme} fontSize={preferences.fontSize} onViewReady={(view) => { editorViewRef.current = view }} />
            </section>
            <div className="split-divider group hidden lg:grid" role="separator" aria-label="调整编辑器和预览比例" onPointerDown={handleResizeStart}><span className="split-grip" /></div>
            <section className={cn("h-full min-h-0 min-w-0 flex-1", viewMode === "preview" ? "block" : "hidden lg:block")} aria-label="Markdown 实时预览">
              <MarkdownPreview ref={previewRef} content={doc.content} fontSize={preferences.fontSize} />
            </section>
          </div>
        </main>
        {settingsOpen && (
          <div className="absolute right-3 top-3 z-20 w-64 rounded-xl border border-border bg-surface p-4 shadow-soft" role="dialog" aria-label="编辑器设置">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold">编辑器设置</h2><Button size="icon" variant="ghost" onClick={() => setSettingsOpen(false)} aria-label="关闭设置"><X size={15} /></Button></div>
            <label className="block text-xs font-medium text-muted" htmlFor="font-size">字号：{preferences.fontSize}px</label>
            <input id="font-size" className="mt-2 w-full accent-accent" type="range" min="12" max="24" value={preferences.fontSize} onChange={(event) => persistPreferences({ ...preferences, fontSize: Number(event.target.value) })} />
            <p className="mt-3 text-xs leading-5 text-muted">偏好设置仅保存在本机，不会上传文档内容。</p>
          </div>
        )}
      </div>
      <footer className="flex h-8 shrink-0 items-center justify-between border-t border-border bg-surface px-4 text-[11px] text-muted sm:px-5">
        <div className="flex items-center gap-3"><span>{lineCount} 行</span><span>{editorCount} 字符</span><span className="hidden truncate sm:inline">{doc.path ?? "尚未打开文件"}</span></div>
        <span className="flex items-center gap-1.5">{isReady ? <><span className={`h-1.5 w-1.5 rounded-full ${doc.isDirty ? "bg-amber-500" : "bg-emerald-500"}`} />{doc.isDirty ? "待保存" : "就绪"}</> : "加载设置…"}</span>
      </footer>
      {error && <div className="fixed bottom-12 right-4 z-30 flex max-w-md items-start gap-2 rounded-xl border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-soft dark:bg-red-950/70 dark:text-red-200" role="alert"><Info size={16} className="mt-0.5 shrink-0" /><span>{error}</span><Button size="icon" variant="ghost" className="-mr-2 -mt-1 h-6 w-6" onClick={() => setError(null)} aria-label="关闭错误提示"><X size={14} /></Button></div>}
      {notice && <div className="fixed bottom-12 left-1/2 z-30 -translate-x-1/2 rounded-full border border-emerald-500/20 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-700 shadow-soft dark:bg-emerald-950/70 dark:text-emerald-200" role="status">{notice}</div>}
      <UnsavedDialog open={Boolean(pendingAction)} title={doc.title} onSave={() => void handleSavePending()} onDiscard={() => void handleDiscardPending()} onCancel={() => { setPendingAction(null); setPendingOpenPath(null) }} />
      {!doc.path && !doc.content && (
        <div className="pointer-events-none absolute bottom-14 left-1/2 hidden -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-surface/90 px-3 py-1.5 text-[11px] text-muted shadow-soft sm:flex"><FileText size={13} />支持 .md 和 .markdown 文件</div>
      )}
    </div>
  )
}
