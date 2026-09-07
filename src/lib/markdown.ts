import GithubSlugger from "github-slugger"
import { unified } from "unified"
import remarkParse from "remark-parse"
import remarkGfm from "remark-gfm"
import { toString } from "mdast-util-to-string"
import { visit } from "unist-util-visit"
import type { OutlineItem } from "@/types"

const parser = unified().use(remarkParse).use(remarkGfm)

export function parseMarkdown(content: string) {
  return parser.parse(content)
}

export function extractOutline(content: string): OutlineItem[] {
  const slugger = new GithubSlugger()
  const outline: OutlineItem[] = []
  visit(parseMarkdown(content), "heading", (node) => {
    const text = toString(node).trim()
    if (!text) return
    outline.push({ id: slugger.slug(text), level: node.depth, text, line: node.position?.start.line ?? 1 })
  })
  return outline
}
