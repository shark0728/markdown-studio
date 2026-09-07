import { EditorSelection, type EditorState, type TransactionSpec } from "@codemirror/state"
import type { EditorView } from "@codemirror/view"
import { visit } from "unist-util-visit"
import { parseMarkdown } from "@/lib/markdown"

export type FormatAction = "bold" | "italic" | "strike" | "inlineCode" | "heading1" | "heading2" | "heading3" | "quote" | "bullet" | "ordered" | "task" | "link" | "codeBlock" | "table"

const markers: Partial<Record<FormatAction, string>> = { bold: "**", italic: "*", strike: "~~" }
const lineFormats: Partial<Record<FormatAction, { prefix: string; pattern: RegExp }>> = {
  heading1: { prefix: "# ", pattern: /^# / }, heading2: { prefix: "## ", pattern: /^## / }, heading3: { prefix: "### ", pattern: /^### / },
  quote: { prefix: "> ", pattern: /^> / }, bullet: { prefix: "- ", pattern: /^[-+*] (?!\[[ xX]\] )/ },
  ordered: { prefix: "1. ", pattern: /^\d+[.)] / }, task: { prefix: "- [ ] ", pattern: /^[-+*] \[[ xX]\] / },
}

function backtickFence(text: string, minimum: number) {
  let length = minimum
  // Do not spread every run into Math.max: moderately large documents can
  // otherwise exceed V8's argument limit and throw from the toolbar action.
  for (const match of text.matchAll(/`+/g)) length = Math.max(length, match[0].length + 1)
  return "`".repeat(length)
}

function inlineCodeTransaction(state: EditorState): TransactionSpec {
  const source = state.doc.toString()
  const spans: { from: number; to: number; contentFrom: number; contentTo: number }[] = []
  visit(parseMarkdown(source), "inlineCode", (node) => {
    const from = node.position?.start.offset
    const to = node.position?.end.offset
    if (from === undefined || to === undefined) return
    const fenceLength = source.slice(from, to).match(/^`+/)?.[0].length ?? 1
    const inner = source.slice(from + fenceLength, to - fenceLength)
    const padding = inner.startsWith(" ") && inner.endsWith(" ") && /[^ ]/.test(inner) ? 1 : 0
    spans.push({ from, to, contentFrom: from + fenceLength + padding, contentTo: to - fenceLength - padding })
  })
  return {
    ...state.changeByRange((range) => {
      const span = spans.find((span) => (range.from === span.from && range.to === span.to) || (range.from === span.contentFrom && range.to === span.contentTo))
      if (span) {
        const text = source.slice(span.contentFrom, span.contentTo)
        return { changes: { from: span.from, to: span.to, insert: text }, range: EditorSelection.range(span.from, span.from + text.length) }
      }
      const text = source.slice(range.from, range.to) || "code"
      const fence = backtickFence(text, 1)
      const padding = text.startsWith("`") || text.endsWith("`") || (text.startsWith(" ") && text.endsWith(" ") && /[^ ]/.test(text)) ? " " : ""
      const offset = fence.length + padding.length
      return { changes: { from: range.from, to: range.to, insert: fence + padding + text + padding + fence }, range: EditorSelection.range(range.from + offset, range.from + offset + text.length) }
    }), scrollIntoView: true, userEvent: "input.format",
  }
}

function hasSelectedMarker(text: string, marker: string) {
  const italicSelected = marker !== "*" || ((text.match(/^\*+/)?.[0].length ?? 0) % 2 === 1 && (text.match(/\*+$/)?.[0].length ?? 0) % 2 === 1)
  return italicSelected && text.startsWith(marker) && text.endsWith(marker) && text.length >= marker.length * 2
}

export function formatTransaction(state: EditorState, action: FormatAction): TransactionSpec {
  if (action === "inlineCode") return inlineCodeTransaction(state)
  const marker = markers[action]
  if (marker) return {
    ...state.changeByRange((range) => {
      const raw = state.sliceDoc(range.from, range.to)
      if (!range.empty && !raw.trim()) return { range }
      if (/\n[ \t]*\n/.test(raw)) {
        const parts = raw.split(/(\n[ \t]*\n(?:[ \t]*\n)*)/)
        const remove = parts.filter((part) => part.trim()).every((part) => hasSelectedMarker(part.trim(), marker))
        const insert = parts.map((part) => {
          if (!part.trim()) return part
          const text = part.trim()
          const formatted = remove ? text.slice(marker.length, -marker.length) : marker + text + marker
          return part.slice(0, part.length - part.trimStart().length) + formatted + part.slice(part.trimEnd().length)
        }).join("")
        return { changes: { from: range.from, to: range.to, insert }, range: EditorSelection.range(range.from, range.from + insert.length) }
      }
      const from = range.from + raw.length - raw.trimStart().length
      const to = range.to - (raw.length - raw.trimEnd().length)
      const selected = state.sliceDoc(from, to)
      const italicAround = marker !== "*" || ((state.sliceDoc(0, from).match(/\*+$/)?.[0].length ?? 0) % 2 === 1 && (state.sliceDoc(to).match(/^\*+/)?.[0].length ?? 0) % 2 === 1)
      const around = italicAround && from >= marker.length && state.sliceDoc(from - marker.length, from) === marker && state.sliceDoc(to, to + marker.length) === marker
      if (around) return {
        changes: [{ from: from - marker.length, to: from, insert: "" }, { from: to, to: to + marker.length, insert: "" }],
        range: EditorSelection.range(from - marker.length, to - marker.length),
      }
      if (hasSelectedMarker(selected, marker)) {
        const text = selected.slice(marker.length, -marker.length)
        return { changes: { from, to, insert: text }, range: EditorSelection.range(from, from + text.length) }
      }
      const text = selected || "文字"
      return { changes: { from, to, insert: `${marker}${text}${marker}` }, range: EditorSelection.range(from + marker.length, from + marker.length + text.length) }
    }), scrollIntoView: true, userEvent: "input.format",
  }

  if (action === "link" || action === "codeBlock" || action === "table") return {
    ...state.changeByRange((range) => {
      const selected = state.sliceDoc(range.from, range.to)
      let insert: string
      let offset: number
      let length: number
      if (action === "link") {
        const text = (selected || "链接文字").replace(/[[\]\\]/g, "\\$&")
        insert = `[${text}](https://example.com)`
        offset = text.length + 3
        length = "https://example.com".length
      } else {
        const before = range.from > 0 ? "\n\n" : ""
        const after = range.to < state.doc.length ? "\n\n" : "\n"
        if (action === "codeBlock") {
          const text = selected || "code"
          const fence = backtickFence(text, 3)
          insert = `${before}${fence}\n${text}\n${fence}${after}`
          offset = before.length + fence.length + 1
          length = text.length
        } else {
          const header = (selected || "列 1").replaceAll("|", "\\|").replaceAll("\n", " ")
          insert = `${before}| ${header} | 列 2 |\n| --- | --- |\n| 内容 | 内容 |${after}`
          offset = before.length + 2
          length = header.length
        }
      }
      return { changes: { from: range.from, to: range.to, insert }, range: EditorSelection.range(range.from + offset, range.from + offset + length) }
    }), scrollIntoView: true, userEvent: "input.format",
  }

  const format = lineFormats[action]
  if (!format) return {}
  const numbers = new Set<number>()
  for (const range of state.selection.ranges) {
    const first = state.doc.lineAt(range.from).number
    const last = state.doc.lineAt(range.empty ? range.to : Math.max(range.from, range.to - 1)).number
    for (let number = first; number <= last; number++) numbers.add(number)
  }
  const lines = [...numbers].sort((a, b) => a - b).map((number) => state.doc.line(number))
  const remove = lines.every((line) => format.pattern.test(line.text))
  const changes = state.changes(lines.map((line, index) => {
    const oldPrefix = remove ? line.text.match(format.pattern)?.[0] ?? "" : line.text.match(action.startsWith("heading") ? /^#{1,6} / : /^(?:[-+*] \[[ xX]\] |[-+*] |\d+[.)] |>[ ]?)/)?.[0] ?? ""
    return { from: line.from, to: line.from + oldPrefix.length, insert: remove ? "" : action === "ordered" ? `${index + 1}. ` : format.prefix }
  }))
  return { changes, selection: state.selection.map(changes), scrollIntoView: true, userEvent: "input.format" }
}

export function applyFormat(view: EditorView, action: FormatAction) {
  if (view.state.readOnly) return false
  view.dispatch(formatTransaction(view.state, action))
  view.focus()
  return true
}
