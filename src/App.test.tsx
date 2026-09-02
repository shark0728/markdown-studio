import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import App from "@/App"
import type { FileService } from "@/lib/file-service"
import type { PreferencesStore } from "@/lib/preferences"
import { DEFAULT_PREFERENCES } from "@/types"

vi.mock("@/components/MarkdownEditor", () => ({
  MarkdownEditor: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <textarea aria-label="Markdown 源码编辑器" value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}))

vi.mock("@tauri-apps/api/core", async (importOriginal) => {
  const original = await importOriginal<typeof import("@tauri-apps/api/core")>()
  return { ...original, isTauri: () => false }
})

const preferences: PreferencesStore = {
  read: vi.fn().mockResolvedValue(DEFAULT_PREFERENCES),
  write: vi.fn().mockResolvedValue(undefined),
}

function fileService(overrides: Partial<FileService> = {}): FileService {
  return {
    chooseOpenFile: vi.fn().mockResolvedValue(null),
    chooseSaveFile: vi.fn().mockResolvedValue(null),
    read: vi.fn().mockResolvedValue(""),
    write: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe("App integration", () => {
  beforeEach(() => vi.clearAllMocks())

  it("opens a file and updates preview while editing", async () => {
    const service = fileService({ chooseOpenFile: vi.fn().mockResolvedValue("D:\\note.md"), read: vi.fn().mockResolvedValue("# 原标题") })
    render(<App fileService={service} preferenceStorage={preferences} />)
    expect(screen.getAllByRole("textbox")).toHaveLength(1)
    await userEvent.click(screen.getByRole("button", { name: "打开文档" }))
    expect((await screen.findAllByRole("heading", { name: "原标题" })).length).toBeGreaterThan(0)
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "# 新标题" } })
    expect((await screen.findAllByRole("heading", { name: "新标题" })).length).toBeGreaterThan(0)
  })

  it("keeps content and reports file read failures", async () => {
    const service = fileService({ chooseOpenFile: vi.fn().mockResolvedValue("D:\\broken.md"), read: vi.fn().mockRejectedValue(new Error("拒绝访问")) })
    render(<App fileService={service} preferenceStorage={preferences} />)
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "保留的内容" } })
    await userEvent.click(screen.getByRole("button", { name: "打开文档" }))
    await userEvent.click(screen.getByRole("button", { name: "不保存" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("拒绝访问")
    expect(screen.getAllByRole("textbox")[0]).toHaveValue("保留的内容")
  })

  it("keeps unsaved content when writing fails", async () => {
    const service = fileService({
      chooseSaveFile: vi.fn().mockResolvedValue("D:\\failed.md"),
      write: vi.fn().mockRejectedValue(new Error("磁盘只读")),
    })
    render(<App fileService={service} preferenceStorage={preferences} />)
    fireEvent.change(screen.getAllByRole("textbox")[0], { target: { value: "不能丢失" } })
    await userEvent.click(screen.getByRole("button", { name: "保存文档" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("磁盘只读")
    expect(screen.getAllByRole("textbox")[0]).toHaveValue("不能丢失")
  })

  it("persists theme preference changes", async () => {
    render(<App fileService={fileService()} preferenceStorage={preferences} />)
    await userEvent.click(screen.getByRole("button", { name: "切换主题" }))
    await waitFor(() => expect(preferences.write).toHaveBeenCalledWith(expect.objectContaining({ theme: "dark" })))
  })
})
