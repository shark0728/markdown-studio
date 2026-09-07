import { describe, expect, it } from "vitest"
import { extractOutline } from "@/lib/markdown"

describe("markdown outline", () => {
  it("handles setext headings, entities, nested headings and longer fences", () => {
    expect(extractOutline("Setext &amp; Title\n===\n\n> ## quoted\n\n````md\n```\n# hidden\n````\n\n# ![logo](image.png) `code`\n")).toEqual([
      { id: "setext--title", level: 1, text: "Setext & Title", line: 1 },
      { id: "quoted", level: 2, text: "quoted", line: 4 },
      { id: "logo-code", level: 1, text: "logo code", line: 11 },
    ])
  })
  it("extracts headings, duplicate slugs and line numbers", () => {
    const outline = extractOutline("# Hello\n\n## Hello\n\n```md\n# hidden\n```")
    expect(outline).toEqual([
      { id: "hello", level: 1, text: "Hello", line: 1 },
      { id: "hello-1", level: 2, text: "Hello", line: 3 },
    ])
  })

  it("ignores empty headings and strips inline syntax", () => {
    const outline = extractOutline("# **Bold** [link](https://example.com) ##\n#\n")
    expect(outline[0].text).toBe("Bold link")
    expect(outline[0].id).toBe("bold-link")
    expect(outline).toHaveLength(1)
  })
})
