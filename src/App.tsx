import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { isTauri } from "@tauri-apps/api/core"
import { Code2, Eye, Columns2, Info, X, ListTree } from "lucide-react"
import { EditorView } from "@codemirror/view"
import { openSearchPanel } from "@codemirror/search"
import { undo, redo } from "@codemirror/commands"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/dialog"
import { MarkdownEditor } from "@/components/MarkdownEditor"
import { MarkdownPreview, type MarkdownPreviewHandle } from "@/components/MarkdownPreview"
import { Outline } from "@/components/Outline"
import { Toolbar } from "@/components/Toolbar"
import { FormattingToolbar } from "@/components/FormattingToolbar"
import { RecentFiles } from "@/components/RecentFiles"
import { UnsavedDialog } from "@/components/UnsavedDialog"
import { tauriFileService, type FileService } from "@/lib/file-service"
import { isMarkdownPath } from "@/lib/document"
import { extractOutline } from "@/lib/markdown"
import { scrollEditorToLine } from "@/lib/editor"
import { applyFormat, type FormatAction } from "@/lib/formatting"
import { closeWindow } from "@/lib/window"
import { preferencesStore, pathKey, type PreferencesStore } from "@/lib/preferences"
import { usePreferences } from "@/hooks/usePreferences"
import { useDocumentSession } from "@/hooks/useDocumentSession"
import type { EditorStatus, OutlineItem, ViewMode } from "@/types"

const modes = [
  { value: "editor" as const, label: "仅编辑", icon: Code2 },
  { value: "split" as const, label: "左右分栏", icon: Columns2 },
  { value: "preview" as const, label: "仅预览", icon: Eye },
]

export default function App({ fileService = tauriFileService, preferenceStorage = preferencesStore }: { fileService?: FileService; preferenceStorage?: PreferencesStore }) {
  const prefs = usePreferences(preferenceStorage)
  const { preferences, update: updatePreferences, ready, flush } = prefs
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [recentOpen, setRecentOpen] = useState(false)
  const [outlineCollapsed, setOutlineCollapsed] = useState(false)
  const [narrow, setNarrow] = useState(() => window.matchMedia?.("(max-width: 1023px)").matches ?? false)
  const [mobileOutline, setMobileOutline] = useState(false)
  const [dragRatio, setDragRatio] = useState<number | null>(null)
  const ratioRef = useRef(preferences.splitRatio)
  const splitRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<EditorView | null>(null)
  const previewRef = useRef<MarkdownPreviewHandle>(null)
  const windowRef = useRef(isTauri() ? getCurrentWindow() : null)
  const [status, setStatus] = useState<EditorStatus>({ line: 1, column: 1, selected: 0, canUndo: false, canRedo: false })

  const rememberPath = useCallback((path: string) => {
    updatePreferences((value) => ({ ...value, recentFiles: [path, ...value.recentFiles.filter((item) => pathKey(item) !== pathKey(path))].slice(0, 8) }))
  }, [updatePreferences])
  const close = useCallback(async () => { await flush(); await closeWindow(windowRef.current) }, [flush])
  const session = useDocumentSession(fileService, rememberPath, close)
  const { doc, revision, change, busy, pending, request, resolve, save } = session
  const effectiveMode: ViewMode = narrow && preferences.viewMode === "split" ? "editor" : preferences.viewMode
  const outline = useMemo(() => extractOutline(doc.content), [doc.content])
  const disabled = !ready || Boolean(busy || pending)
  const modalOpen = Boolean(settingsOpen || recentOpen || mobileOutline || pending)
  const error = session.error ?? prefs.error

  useEffect(() => {
    const query = window.matchMedia?.("(max-width: 1023px)")
    if (!query) return
    const changed = () => setNarrow(query.matches)
    query.addEventListener("change", changed)
    return () => query.removeEventListener("change", changed)
  }, [])
  useEffect(() => { document.documentElement.classList.toggle("dark", preferences.theme === "dark") }, [preferences.theme])
  useEffect(() => {
    const timer = window.setTimeout(session.dismissNotice, 2800)
    return () => window.clearTimeout(timer)
  }, [session.notice, session.dismissNotice])

  const focusEditor = useCallback((search = false) => {
    if (effectiveMode === "preview") updatePreferences({ viewMode: "editor" })
    requestAnimationFrame(() => {
      const view = editorRef.current
      if (!view) return
      view.requestMeasure()
      view.focus()
      if (search) openSearchPanel(view)
    })
  }, [effectiveMode, updatePreferences])
  const onViewReady = useCallback((view: EditorView) => { editorRef.current = view }, [])
  const onStatus = useCallback((value: EditorStatus) => {
    setStatus((previous) => Object.keys(value).every((key) => value[key as keyof EditorStatus] === previous[key as keyof EditorStatus]) ? previous : value)
  }, [])
  useEffect(() => { if (effectiveMode !== "preview") editorRef.current?.requestMeasure() }, [effectiveMode, outlineCollapsed, narrow])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.defaultPrevented || event.isComposing) return
      const key = event.key.toLowerCase()
      if (modalOpen || disabled) {
        if (["n", "o", "s", "f", "h", "enter"].includes(key)) event.preventDefault()
        return
      }
      if (key === "n") { event.preventDefault(); request({ kind: "new" }) }
      if (key === "o") { event.preventDefault(); request({ kind: "open" }) }
      if (key === "s") { event.preventDefault(); void save(event.shiftKey) }
      if (key === "f" || key === "h") { event.preventDefault(); focusEditor(true) }
      if (key === "enter") {
        event.preventDefault()
        if (editorRef.current?.hasFocus) {
          if (effectiveMode === "editor") updatePreferences({ viewMode: "preview" })
          requestAnimationFrame(() => previewRef.current?.focus())
        } else focusEditor()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [disabled, modalOpen, effectiveMode, request, save, focusEditor, updatePreferences])

  const nativeRequest = useRef(request)
  nativeRequest.current = request
  useEffect(() => {
    const appWindow = windowRef.current
    if (!appWindow) return
    const closing = appWindow.onCloseRequested((event) => {
      event.preventDefault()
      setSettingsOpen(false); setRecentOpen(false); setMobileOutline(false)
      nativeRequest.current({ kind: "close" })
    })
    const dropping = appWindow.onDragDropEvent((event) => {
      if (event.payload.type !== "drop") return
      const path = event.payload.paths.find(isMarkdownPath)
      if (path) {
        setSettingsOpen(false); setRecentOpen(false); setMobileOutline(false)
        nativeRequest.current({ kind: "open", path })
      }
    })
    return () => { void closing.then((fn) => fn()); void dropping.then((fn) => fn()) }
  }, [])
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (doc.isDirty || busy) { event.preventDefault(); event.returnValue = "" }
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [doc.isDirty, busy])

  const selectHeading = (item: OutlineItem) => {
    setMobileOutline(false)
    requestAnimationFrame(() => {
      scrollEditorToLine(editorRef.current, item.line, effectiveMode !== "preview")
      previewRef.current?.scrollToHeading(item.id)
      if (effectiveMode === "preview") previewRef.current?.focus()
    })
  }
  const format = (action: FormatAction) => {
    if (!disabled && editorRef.current) applyFormat(editorRef.current, action)
  }
  const setRatio = (ratio: number) => updatePreferences({ splitRatio: Math.max(0.3, Math.min(0.7, ratio)) })
  const lineCount = doc.content.split("\n").length
  return (
    <div className="app-shell flex h-screen min-h-0 flex-col bg-canvas text-ink">
      <Toolbar title={doc.title} isDirty={doc.isDirty} theme={preferences.theme} disabled={disabled}
        onNew={() => request({ kind: "new" })} onOpen={() => request({ kind: "open" })}
        onSave={() => void save()} onSaveAs={() => void save(true)} onRecent={() => setRecentOpen(true)}
        onToggleTheme={() => updatePreferences({ theme: preferences.theme === "light" ? "dark" : "light" })}
        onSettings={() => setSettingsOpen(true)} onSearch={() => focusEditor(true)} />
      <div className="flex min-h-0 flex-1">
        {!narrow && <Outline items={outline} collapsed={outlineCollapsed} onToggle={() => setOutlineCollapsed((value) => !value)} onSelect={selectHeading} />}
        <main className="flex min-h-0 min-w-0 flex-1 flex-col" aria-label="Markdown 编辑区域">
          <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-border bg-surface px-3">
            <div className="flex min-w-0 items-center gap-2">
              {narrow && <Button size="icon" variant="ghost" onClick={() => setMobileOutline(true)} title="文档大纲" aria-label="文档大纲"><ListTree size={16} /></Button>}
              <span className="truncate text-xs text-muted">{effectiveMode === "split" ? "源码 / 实时预览" : effectiveMode === "editor" ? "Markdown" : "预览"}</span>
            </div>
            <div className="flex shrink-0 items-center gap-0.5 rounded-md bg-ink/5 p-0.5" role="radiogroup" aria-label="视图模式">
              {modes.filter((mode) => !narrow || mode.value !== "split").map(({ value, label, icon: Icon }) => (
                <label key={value} title={label} className="relative cursor-pointer">
                  <input className="peer absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0" type="radio" name="view-mode" value={value} aria-label={label} checked={effectiveMode === value} onChange={() => updatePreferences({ viewMode: value })} disabled={!ready} />
                  <span className="grid h-8 w-9 place-items-center rounded-md text-muted peer-checked:bg-surface peer-checked:text-accent peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-accent"><Icon size={16} aria-hidden="true" /></span>
                </label>
              ))}
            </div>
          </div>
          {effectiveMode !== "preview" && <FormattingToolbar onFormat={format} status={status} disabled={disabled}
            onUndo={() => { if (editorRef.current) { undo(editorRef.current); editorRef.current.focus() } }}
            onRedo={() => { if (editorRef.current) { redo(editorRef.current); editorRef.current.focus() } }} />}
          <div ref={splitRef} className="flex min-h-0 flex-1">
            <section hidden={effectiveMode === "preview"} className="h-full min-h-0 min-w-0 shrink-0" style={{ width: effectiveMode === "split" ? (dragRatio ?? preferences.splitRatio) * 100 + "%" : "100%" }} aria-label="Markdown 源码编辑器">
              <MarkdownEditor key={revision} value={doc.content} onChange={change} theme={preferences.theme} fontSize={preferences.fontSize}
                wordWrap={preferences.wordWrap} lineNumbers={preferences.lineNumbers} readOnly={!ready || busy === "opening" || busy === "closing"}
                onViewReady={onViewReady} onStatus={onStatus} />
            </section>
            {effectiveMode === "split" && <div className="split-divider shrink-0" role="separator" tabIndex={0} aria-label="调整编辑器和预览比例"
              aria-orientation="vertical" aria-valuemin={30} aria-valuemax={70} aria-valuenow={Math.round((dragRatio ?? preferences.splitRatio) * 100)}
              onPointerDown={(event) => { ratioRef.current = preferences.splitRatio; event.currentTarget.setPointerCapture(event.pointerId) }}
              onPointerMove={(event) => {
                if (!event.currentTarget.hasPointerCapture(event.pointerId)) return
                const bounds = splitRef.current?.getBoundingClientRect()
                if (!bounds) return
                ratioRef.current = Math.min(0.7, Math.max(0.3, (event.clientX - bounds.left) / bounds.width))
                setDragRatio(ratioRef.current)
              }}
              onPointerUp={(event) => { event.currentTarget.releasePointerCapture(event.pointerId); setRatio(ratioRef.current); setDragRatio(null) }}
              onPointerCancel={() => setDragRatio(null)} onDoubleClick={() => setRatio(0.5)}
              onKeyDown={(event) => {
                const delta = event.key === "ArrowLeft" ? -0.05 : event.key === "ArrowRight" ? 0.05 : null
                if (delta !== null || event.key === "Home" || event.key === "End") {
                  event.preventDefault()
                  setRatio(event.key === "Home" ? 0.3 : event.key === "End" ? 0.7 : preferences.splitRatio + (delta ?? 0))
                }
              }}><span className="split-grip" /></div>}
            <section hidden={effectiveMode === "editor"} className="h-full min-h-0 min-w-0 flex-1" aria-label="Markdown 实时预览">
              <MarkdownPreview ref={previewRef} content={doc.content} fontSize={preferences.fontSize} outline={outline} documentRevision={revision} />
            </section>
          </div>
        </main>
      </div>
      <footer className="flex min-h-8 shrink-0 items-center justify-between gap-3 border-t border-border bg-surface px-3 py-1 text-xs text-muted">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1">
          <span className="shrink-0">{lineCount} 行</span><span className="shrink-0">{doc.content.length} 字符</span>
          <span className="shrink-0" aria-label="光标位置">行 {status.line}，列 {status.column}</span>
          {status.selected > 0 && <span className="shrink-0">选中 {status.selected} 字符</span>}
          <span className="hidden shrink-0 sm:inline">UTF-8 · {doc.lineEnding.toUpperCase()}</span>
          <span className="hidden min-w-0 flex-1 truncate lg:inline" title={doc.path ?? ""}>{doc.path ?? "未命名文档"}</span>
        </div>
        <span className="shrink-0">{!ready ? "加载设置…" : busy ? busy === "saving" ? "保存中…" : "处理中…" : doc.isDirty ? "待保存" : "就绪"}</span>
      </footer>
      <Modal open={settingsOpen} title="编辑器设置" onClose={() => setSettingsOpen(false)}>
        <label className="mb-2 block text-sm" htmlFor="font-size">字号：{preferences.fontSize}px</label>
        <input id="font-size" className="mb-5 w-full accent-accent" type="range" min="12" max="24" value={preferences.fontSize} onChange={(event) => updatePreferences({ fontSize: Number(event.target.value) })} />
        <label className="mb-4 flex items-center justify-between text-sm">自动换行<input type="checkbox" className="h-4 w-4 accent-accent" checked={preferences.wordWrap} onChange={(event) => updatePreferences({ wordWrap: event.target.checked })} /></label>
        <label className="flex items-center justify-between text-sm">显示行号<input type="checkbox" className="h-4 w-4 accent-accent" checked={preferences.lineNumbers} onChange={(event) => updatePreferences({ lineNumbers: event.target.checked })} /></label>
      </Modal>
      <RecentFiles open={recentOpen} files={preferences.recentFiles} onClose={() => setRecentOpen(false)} onOpen={(path) => request({ kind: "open", path })}
        onRemove={(path) => updatePreferences((value) => ({ ...value, recentFiles: value.recentFiles.filter((item) => pathKey(item) !== pathKey(path)) }))}
        onClear={() => updatePreferences({ recentFiles: [] })} />
      <Modal open={mobileOutline} title="文档大纲" onClose={() => setMobileOutline(false)}>
        <nav aria-label="窄窗口文档大纲">{outline.map((item) => <button key={item.id} className="block w-full truncate rounded-md px-2 py-2 text-left text-sm hover:bg-accent/10" style={{ paddingLeft: (item.level - 1) * 12 + 8 }} onClick={() => selectHeading(item)}>{item.text}</button>)}{!outline.length && <p className="py-6 text-center text-sm text-muted">暂无标题</p>}</nav>
      </Modal>
      <UnsavedDialog open={Boolean(pending)} title={doc.title} busy={Boolean(busy)} error={error} onSave={() => void resolve("save")} onDiscard={() => void resolve("discard")} onCancel={() => void resolve("cancel")} />
      {error && !pending && <div className="error-toast fixed bottom-12 right-4 z-[60] flex max-w-md items-start gap-2 rounded-lg border border-red-500/20 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-soft dark:bg-red-950 dark:text-red-200" role="alert">
        <Info size={16} className="mt-0.5 shrink-0" /><span className="min-w-0 break-words">{error}</span><Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => { session.dismissError(); prefs.dismissError() }} aria-label="关闭错误提示"><X size={14} /></Button>
      </div>}
      {session.notice && <div className="pointer-events-none fixed bottom-12 left-1/2 z-30 max-w-[90vw] -translate-x-1/2 rounded-lg border border-emerald-500/20 bg-emerald-50 px-4 py-2 text-center text-xs text-emerald-700 shadow-soft dark:bg-emerald-950 dark:text-emerald-200" role="status">{session.notice}</div>}
    </div>
  )
}
