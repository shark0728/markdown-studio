import { describe, expect, it } from "vitest"
import { extractOutline } from "@/lib/markdown"

describe("markdown outline", () => {
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
