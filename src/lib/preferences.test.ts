import { describe, expect, it } from "vitest"
import { sanitizePreferences } from "@/lib/preferences"

describe("preferences", () => {
  it("normalizes persisted values and limits recent files", () => {
    const value = sanitizePreferences({
      theme: "dark",
      fontSize: 99,
      splitRatio: 0.1,
      recentFiles: Array.from({ length: 12 }, (_, index) => `${index}.md`),
    })
    expect(value).toEqual({
      theme: "dark",
      fontSize: 24,
      splitRatio: 0.3,
      recentFiles: Array.from({ length: 8 }, (_, index) => `${index}.md`),
      viewMode: "split",
      wordWrap: true,
      lineNumbers: true,
    })
  })

  it("falls back to safe defaults", () => {
    expect(sanitizePreferences(null)).toMatchObject({ theme: "light", fontSize: 15, splitRatio: 0.5 })
  })

  it("migrates old preferences and filters invalid numeric and duplicate paths", () => {
    expect(sanitizePreferences({ fontSize: NaN, splitRatio: Infinity, recentFiles: ["D:\\A.md", "d:/a.md", "D:/b.txt", "D:/b.md"] })).toEqual({
      theme: "light", fontSize: 15, splitRatio: 0.5, recentFiles: ["D:\\A.md", "D:/b.md"], viewMode: "split", wordWrap: true, lineNumbers: true,
    })
  })

  it("preserves new editing preferences", () => {
    expect(sanitizePreferences({ viewMode: "preview", wordWrap: false, lineNumbers: false })).toMatchObject({ viewMode: "preview", wordWrap: false, lineNumbers: false })
  })
})
