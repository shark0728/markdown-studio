import { describe, expect, it } from "vitest"
import { createDocument, detectLineEnding, markDocumentSaved, toDiskContent, updateDocumentContent } from "@/lib/document"

describe("document helpers", () => {
  it("detects and preserves CRLF content", () => {
    const source = "# 标题\r\n\r\n正文"
    const document = createDocument(source, "C:\\notes\\demo.md")
    expect(document.lineEnding).toBe("crlf")
    expect(document.content).toBe("# 标题\n\n正文")
    expect(toDiskContent(document.content, document.lineEnding)).toBe(source)
  })

  it("tracks dirty and saved states", () => {
    const initial = createDocument("hello")
    const edited = updateDocumentContent(initial, "hello world")
    expect(edited.isDirty).toBe(true)
    expect(markDocumentSaved(edited).isDirty).toBe(false)
    expect(markDocumentSaved(edited).savedContent).toBe("hello world")
  })

  it("defaults to LF", () => {
    expect(detectLineEnding("one\ntwo")).toBe("lf")
  })
})
