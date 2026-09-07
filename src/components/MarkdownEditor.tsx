import { useMemo } from "react"
import CodeMirror from "@uiw/react-codemirror"
import { markdown } from "@codemirror/lang-markdown"
import { oneDark } from "@codemirror/theme-one-dark"
import { EditorView, keymap } from "@codemirror/view"
import { EditorState } from "@codemirror/state"
import { undoDepth, redoDepth } from "@codemirror/commands"
import { applyFormat } from "@/lib/formatting"
import type { EditorStatus } from "@/types"

type MarkdownEditorProps = {
  value: string; onChange: (value: string) => void; theme: "light" | "dark"; fontSize: number
  wordWrap: boolean; lineNumbers: boolean; readOnly: boolean
  onViewReady: (view: EditorView) => void; onStatus: (value: EditorStatus) => void
}

const phrases = {
  "Find": "查找", "Replace": "替换", "next": "下一个", "previous": "上一个", "all": "全部选中",
  "match case": "区分大小写", "regexp": "正则表达式", "by word": "全词匹配",
  "replace": "替换", "replace all": "全部替换", "close": "关闭", "No matches": "没有匹配",
}

export function MarkdownEditor({ value, onChange, theme, fontSize, wordWrap, lineNumbers, readOnly, onViewReady, onStatus }: MarkdownEditorProps) {
  const extensions = useMemo(() => [
    markdown(),
    ...(wordWrap ? [EditorView.lineWrapping] : []),
    EditorState.phrases.of(phrases),
    keymap.of([
      { key: "Mod-b", run: (view) => applyFormat(view, "bold") },
      { key: "Mod-i", run: (view) => applyFormat(view, "italic") },
      { key: "Mod-k", run: (view) => applyFormat(view, "link") },
    ]),
    EditorView.contentAttributes.of({ "aria-label": "Markdown 源码" }),
  ], [wordWrap])
  const basicSetup = useMemo(() => ({
    lineNumbers, foldGutter: true, dropCursor: true, allowMultipleSelections: true,
    indentOnInput: true, syntaxHighlighting: true, bracketMatching: true,
    closeBrackets: true, autocompletion: true, rectangularSelection: true, highlightSelectionMatches: true,
  }), [lineNumbers])
  const report = (view: EditorView) => {
    const { state } = view
    const head = state.selection.main.head
    const line = state.doc.lineAt(head)
    onStatus({
      line: line.number, column: head - line.from + 1,
      selected: state.selection.ranges.reduce((sum, range) => sum + range.to - range.from, 0),
      canUndo: undoDepth(state) > 0, canRedo: redoDepth(state) > 0,
    })
  }
  return <div className="h-full min-h-0 overflow-hidden bg-surface" style={{ "--editor-font-size": fontSize + "px" } as React.CSSProperties}>
    <CodeMirror value={value} height="100%" theme={theme === "dark" ? oneDark : undefined} extensions={extensions}
      onChange={onChange} readOnly={readOnly} basicSetup={basicSetup} className="markdown-editor"
      onUpdate={(update) => { if (update.docChanged || update.selectionSet || update.transactions.length) report(update.view) }}
      onCreateEditor={(view) => { onViewReady(view); report(view) }} />
  </div>
}
