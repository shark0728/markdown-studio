import { forwardRef, memo, useImperativeHandle, useLayoutEffect, useMemo, useRef } from "react"
import type { Components } from "react-markdown"
import ReactMarkdown from "react-markdown"
import rehypeSanitize from "rehype-sanitize"
import remarkGfm from "remark-gfm"
import { FileText } from "lucide-react"
import { extractOutline } from "@/lib/markdown"
import type { OutlineItem } from "@/types"

export type MarkdownPreviewHandle = { focus: () => void; scrollToHeading: (id: string) => void }
type MarkdownPreviewProps = { content: string; fontSize: number; outline?: OutlineItem[]; documentRevision?: number }

export const MarkdownPreview = memo(forwardRef<MarkdownPreviewHandle, MarkdownPreviewProps>(({ content, fontSize, outline, documentRevision = 0 }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (!containerRef.current) return
    containerRef.current.scrollTop = 0
    containerRef.current.scrollLeft = 0
  }, [documentRevision])
  const headings = useMemo(() => outline ?? extractOutline(content), [content, outline])
  const scrollToHeading = (id: string) => {
    const target = Array.from(containerRef.current?.querySelectorAll<HTMLElement>("[id]") ?? []).find((element) => element.id === id)
    target?.scrollIntoView({ behavior: "auto", block: "center" })
  }
  useImperativeHandle(ref, () => ({ focus: () => containerRef.current?.focus(), scrollToHeading }), [])

  const components = useMemo<Components>(() => {
    const byLine = new Map(headings.map((item) => [item.line, item.id]))
    const result: Components = {
      a: ({ children, href, title }) => <a href={href} title={title} target={href?.startsWith("#") ? undefined : "_blank"} rel="noreferrer"
        onClick={(event) => {
          if (!href?.startsWith("#")) return
          event.preventDefault()
          try { scrollToHeading(decodeURIComponent(href.slice(1))) } catch { /* Ignore malformed URI escapes in document links. */ }
        }}>{children}</a>,
    }
    for (const Tag of ["h1", "h2", "h3", "h4", "h5", "h6"] as const) {
      result[Tag] = ({ node, children }) => <Tag id={byLine.get(node?.position?.start.line ?? 0)}>{children}</Tag>
    }
    return result
  }, [headings])

  return <div ref={containerRef} tabIndex={-1} aria-label="预览内容" className="markdown-preview h-full overflow-auto bg-canvas px-5 py-8 sm:px-8 lg:px-10" style={{ fontSize }}>
    <article className="mx-auto max-w-3xl">
      {content.trim() ? <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} components={components}>{content}</ReactMarkdown>
        : <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-muted"><FileText size={32} strokeWidth={1.25} aria-hidden="true" /><p className="text-sm">空白文档</p></div>}
    </article>
  </div>
}))
MarkdownPreview.displayName = "MarkdownPreview"
