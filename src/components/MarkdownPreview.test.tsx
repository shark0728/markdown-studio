import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { MarkdownPreview } from "@/components/MarkdownPreview"

describe("MarkdownPreview", () => {
  it("renders GFM tables, task lists and safe headings", () => {
    render(<MarkdownPreview content={'# 标题\n\n- [x] 完成\n\n| A | B |\n| - | - |\n| 1 | 2 |'} fontSize={15} />)
    expect(screen.getByRole("heading", { name: "标题" })).toHaveAttribute("id", "标题")
    expect(screen.getByRole("checkbox")).toBeChecked()
    expect(screen.getByRole("table")).toBeInTheDocument()
  })

  it("does not render raw script HTML", () => {
    const { container } = render(<MarkdownPreview content={'<script>alert("x")</script>\n\n正文'} fontSize={15} />)
    expect(container.querySelector("script")).toBeNull()
    expect(screen.getByText("正文")).toBeInTheDocument()
  })
})
