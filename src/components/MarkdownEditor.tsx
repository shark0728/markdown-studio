import { useEffect, useRef } from "react"
import CodeMirror, { type ReactCodeMirrorRef } from "@uiw/react-codemirror"
import { markdown } from "@codemirror/lang-markdown"
import { oneDark } from "@codemirror/theme-one-dark"
import { EditorView } from "@codemirror/view"

type MarkdownEditorProps = {
  value: string
  onChange: (value: string) => void
  theme: "light" | "dark"
  fontSize: number
  onViewReady?: (view: EditorView) => void
  onFocus?: () => void
}

export function MarkdownEditor({ value, onChange, theme, fontSize, onViewReady, onFocus }: MarkdownEditorProps) {
  const editorRef = useRef<ReactCodeMirrorRef>(null)

  useEffect(() => {
    const view = editorRef.current?.view
    if (view) onViewReady?.(view)
  }, [onViewReady])

  return (
    <div className="h-full min-h-0 overflow-hidden bg-surface" style={{ "--editor-font-size": `${fontSize}px` } as React.CSSProperties}>
      <CodeMirror
        ref={editorRef}
        value={value}
        height="100%"
        theme={theme === "dark" ? oneDark : undefined}
        extensions={[markdown(), EditorView.lineWrapping]}
        onChange={onChange}
        onUpdate={(update) => {
          if (update.focusChanged && update.view.hasFocus) onFocus?.()
        }}
        onCreateEditor={(view) => onViewReady?.(view)}
        basicSetup={{
          foldGutter: true,
          dropCursor: true,
          allowMultipleSelections: true,
          indentOnInput: true,
          syntaxHighlighting: true,
          bracketMatching: true,
          closeBrackets: true,
          autocompletion: true,
          rectangularSelection: true,
          highlightSelectionMatches: true,
        }}
        className="markdown-editor"
      />
    </div>
  )
}
