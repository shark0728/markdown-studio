import { EditorView } from "@codemirror/view"

export function scrollEditorToLine(view: EditorView | null, lineNumber: number) {
  if (!view) return
  const line = view.state.doc.line(Math.min(Math.max(lineNumber, 1), view.state.doc.lines))
  view.dispatch({
    selection: { anchor: line.from },
    effects: EditorView.scrollIntoView(line.from, { y: "center" }),
  })
  view.focus()
}
