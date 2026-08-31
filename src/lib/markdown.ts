import GithubSlugger from "github-slugger"
import type { OutlineItem } from "@/types"

function stripInlineMarkdown(value: string) {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[*_~]/g, "")
    .replace(/\s+#+\s*$/, "")
    .trim()
}

export function extractOutline(content: string): OutlineItem[] {
  const slugger = new GithubSlugger()
  const outline: OutlineItem[] = []
  let fenced = false
  let fenceMarker = ""

  for (const [index, rawLine] of content.split("\n").entries()) {
    const line = rawLine.replace(/\r$/, "")
    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/)
    if (fenceMatch) {
      const marker = fenceMatch[1][0]
      if (!fenced) {
        fenced = true
        fenceMarker = marker
      } else if (fenceMarker === marker) {
        fenced = false
      }
      continue
    }
    if (fenced) continue

    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*$/)
    if (!heading) continue
    const text = stripInlineMarkdown(heading[2])
    if (!text) continue
    outline.push({
      id: slugger.slug(text),
      level: heading[1].length,
      text,
      line: index + 1,
    })
  }

  return outline
}

export function plainTextFromReactNode(node: unknown): string {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(plainTextFromReactNode).join("")
  if (node && typeof node === "object" && "props" in node) {
    return plainTextFromReactNode((node as { props?: { children?: unknown } }).props?.children)
  }
  return ""
}
