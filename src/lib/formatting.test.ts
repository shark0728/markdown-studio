import { describe, expect, it } from "vitest"
import { EditorSelection, EditorState } from "@codemirror/state"
import { formatTransaction, type FormatAction } from "@/lib/formatting"
import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkGfm from "remark-gfm"
import { visit } from "unist-util-visit"

function format(text: string, action: FormatAction, from = 0, to = text.length) {
  const state = EditorState.create({ doc: text, selection: { anchor: from, head: to } })
  return state.update(formatTransaction(state, action)).state
}

describe("formatting commands", () => {
  it.each([["bold", "strong"], ["italic", "emphasis"], ["strike", "delete"]] as const)("formats %s selections without putting whitespace inside delimiters", (action, type) => {
    const result = format("  word \n", action)
    const tree = unified().use(remarkParse).use(remarkGfm).parse(result.doc.toString())
    let matches = 0
    visit(tree, type, () => { matches++ })
    expect(matches).toBe(1)
    expect(result.doc.toString()).toMatch(/^ {2}/)
    expect(result.doc.toString()).toMatch(/ \n$/)
  })

  it.each(["a`b", "`literal", "literal`", "  value  "])("preserves inline code text %j", (text) => {
    const result = format(text, "inlineCode")
    const values: string[] = []
    visit(unified().use(remarkParse).parse(result.doc.toString()), "inlineCode", (node) => { values.push(node.value) })
    expect(values).toEqual([text])
    expect(result.update(formatTransaction(result, "inlineCode")).state.doc.toString()).toBe(text)
  })

  it("formats separate paragraphs without crossing blank-line boundaries", () => {
    const source = "first\n\n second \n\nthird"
    const result = format(source, "bold")
    let matches = 0
    visit(unified().use(remarkParse).parse(result.doc.toString()), "strong", () => { matches++ })
    expect(matches).toBe(3)
    expect(result.update(formatTransaction(result, "bold")).state.doc.toString()).toBe(source)
  })

  it("does not replace an all-whitespace selection with invalid emphasis", () => {
    expect(format("  \n", "bold").doc.toString()).toBe("  \n")
  })

  it("handles code selections with many backtick runs without overflowing arguments", () => {
    const source = "a`".repeat(150000)
    expect(() => format(source, "codeBlock")).not.toThrow()
  })

  it.each([["bold", "**文字**"], ["italic", "*文字*"], ["strike", "~~文字~~"], ["inlineCode", "`文字`"]] as const)("wraps and toggles %s", (action, expected) => {
    const state = format("文字", action)
    expect(state.doc.toString()).toBe(expected)
    expect(state.update(formatTransaction(state, action)).state.doc.toString()).toBe("文字")
  })

  it("inserts and selects a placeholder at the cursor", () => {
    const state = format("", "bold")
    expect(state.doc.toString()).toBe("**文字**")
    expect(state.sliceDoc(state.selection.main.from, state.selection.main.to)).toBe("文字")
  })

  it("formats multiple independent selections in one transaction", () => {
    const state = EditorState.create({ doc: "one two", selection: EditorSelection.create([EditorSelection.range(0, 3), EditorSelection.range(4, 7)]), extensions: [EditorState.allowMultipleSelections.of(true)] })
    const next = state.update(formatTransaction(state, "bold")).state
    expect(next.doc.toString()).toBe("**one** **two**")
    expect(next.selection.ranges).toHaveLength(2)
  })

  it("applies numbered lists and excludes the unselected next line", () => {
    expect(format("one\ntwo\nthree", "ordered", 0, 8).doc.toString()).toBe("1. one\n2. two\nthree")
  })

  it("converts headings instead of stacking prefixes", () => {
    const state = format("# title", "heading2")
    expect(state.doc.toString()).toBe("## title")
    expect(state.update(formatTransaction(state, "heading2")).state.doc.toString()).toBe("title")
  })

  it("toggles task lists without leaving checkbox markers", () => {
    expect(format("- [x] done\n- [ ] todo", "task").doc.toString()).toBe("done\ntodo")
    expect(format("- item", "task").doc.toString()).toBe("- [ ] item")
  })

  it("creates a link with the URL selected", () => {
    const state = format("site", "link")
    expect(state.doc.toString()).toBe("[site](https://example.com)")
    expect(state.sliceDoc(state.selection.main.from, state.selection.main.to)).toBe("https://example.com")
  })

  it("uses a longer fence when selected code contains backticks", () => {
    expect(format("```\ncode", "codeBlock").doc.toString()).toBe("````\n```\ncode\n````\n")
  })

  it("adds italic inside bold instead of removing part of the bold marker", () => {
    expect(format("**text**", "italic", 2, 6).doc.toString()).toBe("***text***")
    expect(format("**text**", "italic").doc.toString()).toBe("***text***")
    expect(format("***text***", "italic", 3, 7).doc.toString()).toBe("**text**")
  })

  it("inserts a valid GFM table", () => {
    expect(format("", "table").doc.toString()).toContain("| 列 1 | 列 2 |\n| --- | --- |")
  })
})
