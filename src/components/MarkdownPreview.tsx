import { forwardRef, useImperativeHandle, useRef } from "react"
import type { Components } from "react-markdown"
import ReactMarkdown from "react-markdown"
import rehypeSanitize from "rehype-sanitize"
import remarkGfm from "remark-gfm"
import GithubSlugger from "github-slugger"
import { plainTextFromReactNode } from "@/lib/markdown"

export type MarkdownPreviewHandle = {
  focus: () => void
  scrollToHeading: (id: string) => void
}

type MarkdownPreviewProps = {
  content: string
  fontSize: number
}

export const MarkdownPreview = forwardRef<MarkdownPreviewHandle, MarkdownPreviewProps>(({ content, fontSize }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const slugger = new GithubSlugger()

  useImperativeHandle(ref, () => ({
    focus: () => containerRef.current?.focus(),
    scrollToHeading: (id) => {
      const target = containerRef.current?.querySelector<HTMLElement>(`#${CSS.escape(id)}`)
      target?.scrollIntoView({ behavior: "smooth", block: "center" })
    },
  }), [])

  const heading = (Tag: "h1" | "h2" | "h3" | "h4" | "h5" | "h6") => {
    const Heading = ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement> & { children?: React.ReactNode }) => {
      const id = slugger.slug(plainTextFromReactNode(children))
      return <Tag id={id} {...props}>{children}</Tag>
    }
    Heading.displayName = Tag
    return Heading
  }

  const components: Components = {
    h1: heading("h1"),
    h2: heading("h2"),
    h3: heading("h3"),
    h4: heading("h4"),
    h5: heading("h5"),
    h6: heading("h6"),
    a: ({ children, href, ...props }) => <a href={href} target="_blank" rel="noreferrer" {...props}>{children}</a>,
  }

  return (
    <div ref={containerRef} tabIndex={-1} className="markdown-preview h-full overflow-auto bg-canvas px-5 py-8 outline-none sm:px-8 lg:px-12" style={{ fontSize }}>
      <article className="mx-auto max-w-3xl">
        {content.trim() ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]} components={components}>
            {content}
          </ReactMarkdown>
        ) : (
          <div className="flex min-h-[60vh] flex-col items-center justify-center text-center text-muted">
            <div className="mb-4 rounded-2xl bg-accent/10 p-4 text-accent">
              <span className="text-3xl" aria-hidden="true">✦</span>
            </div>
            <p className="text-base font-medium text-ink">从一段 Markdown 开始</p>
            <p className="mt-2 max-w-sm text-sm leading-6">打开一个文件，或在左侧编辑器中输入内容，右侧会即时呈现排版结果。</p>
          </div>
        )}
      </article>
    </div>
  )
})
MarkdownPreview.displayName = "MarkdownPreview"
