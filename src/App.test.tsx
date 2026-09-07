import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
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

  it("shows only the selected view and persists the mode", async () => {
    render(<App fileService={fileService()} preferenceStorage={preferences} />)
    await userEvent.click(screen.getByRole("radio", { name: "仅预览" }))
    expect(screen.getByLabelText("Markdown 源码编辑器", { selector: "section" })).not.toBeVisible()
    await userEvent.click(screen.getByRole("radio", { name: "仅编辑" }))
    expect(screen.getByLabelText("Markdown 实时预览", { selector: "section" })).not.toBeVisible()
    await userEvent.click(screen.getByRole("radio", { name: "左右分栏" }))
    expect(screen.getAllByRole("textbox")).toHaveLength(1)
    await waitFor(() => expect(preferences.write).toHaveBeenCalledWith(expect.objectContaining({ viewMode: "split" })))
  })

  it("does not lose edits made while a save is in flight", async () => {
    let finish!: () => void
    const service = fileService({
      chooseSaveFile: vi.fn().mockResolvedValue("D:\\note.md"),
      write: vi.fn().mockImplementation(() => new Promise<void>((resolve) => { finish = resolve })),
    })
    render(<App fileService={service} preferenceStorage={preferences} />)
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "snapshot" } })
    await userEvent.click(screen.getByRole("button", { name: "保存文档" }))
    await waitFor(() => expect(service.write).toHaveBeenCalled())
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "later edit" } })
    await act(async () => finish())
    expect(screen.getByRole("textbox")).toHaveValue("later edit")
    expect(screen.getByLabelText("有未保存修改")).toBeInTheDocument()
  })

  it("reports file picker errors without replacing the document", async () => {
    const service = fileService({ chooseOpenFile: vi.fn().mockRejectedValue(new Error("选择器失败")) })
    render(<App fileService={service} preferenceStorage={preferences} />)
    await userEvent.click(screen.getByRole("button", { name: "打开文档" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("选择器失败")
  })

  it("opens recent files, removes records without touching files and clears the list", async () => {
    const store = { read: vi.fn().mockResolvedValue({ ...DEFAULT_PREFERENCES, recentFiles: ["D:/recent.md", "D:/other.md"] }), write: vi.fn().mockResolvedValue(undefined) }
    const service = fileService({ read: vi.fn().mockResolvedValue("# Recent") })
    render(<App fileService={service} preferenceStorage={store} />)
    await waitFor(() => expect(screen.getByRole("button", { name: "最近文件" })).toBeEnabled())
    await userEvent.click(screen.getByRole("button", { name: "最近文件" }))
    await userEvent.type(screen.getByLabelText("筛选最近文件"), "recent")
    await userEvent.click(screen.getByRole("button", { name: "recent.md D:/recent.md" }))
    expect(await screen.findByRole("heading", { name: "Recent" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "最近文件" }))
    await userEvent.click(screen.getByRole("button", { name: "移除记录 recent.md" }))
    await waitFor(() => expect(store.write).toHaveBeenLastCalledWith(expect.objectContaining({ recentFiles: ["D:/other.md"] })))
    await userEvent.click(screen.getByRole("button", { name: "清空记录" }))
    await waitFor(() => expect(store.write).toHaveBeenLastCalledWith(expect.objectContaining({ recentFiles: [] })))
    expect(service.write).not.toHaveBeenCalled()
  })

  it("shows save failure inside the confirmation dialog and keeps pending content", async () => {
    const service = fileService({ chooseSaveFile: vi.fn().mockResolvedValue("D:/draft.md"), write: vi.fn().mockRejectedValue(new Error("磁盘已满")) })
    render(<App fileService={service} preferenceStorage={preferences} />)
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "keep draft" } })
    await userEvent.click(screen.getByRole("button", { name: "新建文档" }))
    await userEvent.click(screen.getByRole("button", { name: "保存" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("磁盘已满")
    expect(screen.getByRole("alertdialog")).toContainElement(screen.getByRole("alert"))
    await userEvent.click(screen.getByRole("button", { name: "取消" }))
    expect(screen.getByRole("textbox")).toHaveValue("keep draft")
  })

  it("reports preference write failure without losing edits", async () => {
    const store = { read: vi.fn().mockResolvedValue(DEFAULT_PREFERENCES), write: vi.fn().mockRejectedValue(new Error("failed")) }
    render(<App fileService={fileService()} preferenceStorage={store} />)
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "draft" } })
    await userEvent.click(screen.getByRole("button", { name: "切换主题" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("偏好设置保存失败")
    expect(screen.getByRole("textbox")).toHaveValue("draft")
  })

  it("resets preview scroll on document changes but not on edits", async () => {
    const service = fileService({ chooseOpenFile: vi.fn().mockResolvedValue("D:/one.md"), read: vi.fn().mockResolvedValue("# Title\n\nContent") })
    render(<App fileService={service} preferenceStorage={preferences} />)
    await userEvent.click(screen.getByRole("button", { name: "打开文档" }))
    const preview = screen.getByLabelText("预览内容")
    preview.scrollTop = 300
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "# Title\n\nContent update" } })
    expect(preview.scrollTop).toBe(300)
    await userEvent.click(screen.getByRole("button", { name: "打开文档" }))
    await userEvent.click(screen.getByRole("button", { name: "不保存" }))
    await waitFor(() => expect(preview.scrollTop).toBe(0))
  })
})
