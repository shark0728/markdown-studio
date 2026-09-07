import { act, renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { useDocumentSession } from "@/hooks/useDocumentSession"
import type { FileService } from "@/lib/file-service"

function setup(overrides: Partial<FileService> = {}) {
  const service: FileService = { chooseOpenFile: vi.fn().mockResolvedValue("D:/old.md"), chooseSaveFile: vi.fn().mockResolvedValue("D:/new.md"), read: vi.fn().mockResolvedValue("# old\r\nbody"), write: vi.fn().mockResolvedValue(undefined), ...overrides }
  const close = vi.fn().mockResolvedValue(undefined)
  const remember = vi.fn()
  const hook = renderHook(() => useDocumentSession(service, remember, close))
  return { ...hook, service, close, remember }
}

describe("document session", () => {
  it("saves as a new path and preserves CRLF", async () => {
    const { result, service } = setup()
    await act(async () => result.current.request({ kind: "open" }))
    act(() => result.current.change("# changed\nbody"))
    await act(async () => { await result.current.save(true) })
    expect(service.write).toHaveBeenCalledWith("D:/new.md", "# changed\r\nbody")
    expect(result.current.doc).toMatchObject({ path: "D:/new.md", savedContent: "# changed\nbody", isDirty: false })
  })

  it("cancelling Save As retains the dirty document and path", async () => {
    const { result, service } = setup({ chooseSaveFile: vi.fn().mockResolvedValue(null) })
    await act(async () => result.current.request({ kind: "open" }))
    act(() => result.current.change("changed"))
    await act(async () => { await result.current.save(true) })
    expect(service.write).not.toHaveBeenCalled()
    expect(result.current.doc).toMatchObject({ path: "D:/old.md", content: "changed", isDirty: true })
  })

  it("serializes saves and prevents switching documents during a write", async () => {
    let finish!: () => void
    const { result, service } = setup({ write: vi.fn(() => new Promise<void>((resolve) => { finish = resolve })) })
    act(() => result.current.change("first"))
    let saving!: Promise<boolean>
    await act(async () => { saving = result.current.save() })
    await act(async () => { expect(await result.current.save()).toBe(false); result.current.request({ kind: "new" }) })
    act(() => result.current.change("second"))
    await act(async () => { finish(); await saving })
    expect(service.write).toHaveBeenCalledTimes(1)
    expect(result.current.doc).toMatchObject({ content: "second", savedContent: "first", isDirty: true })
    expect(result.current.pending).toBeNull()
  })

  it("cancelled or failed saves never execute pending close", async () => {
    const { result, close, service } = setup({ chooseSaveFile: vi.fn().mockResolvedValue(null) })
    act(() => { result.current.change("keep me"); result.current.request({ kind: "close" }) })
    await act(async () => result.current.resolve("save"))
    expect(close).not.toHaveBeenCalled()
    expect(result.current.pending?.kind).toBe("close")
    vi.mocked(service.chooseSaveFile).mockResolvedValue("D:/new.md")
    vi.mocked(service.write).mockRejectedValue(new Error("read only"))
    await act(async () => result.current.resolve("save"))
    expect(close).not.toHaveBeenCalled()
    expect(result.current.doc.content).toBe("keep me")
    await act(async () => result.current.resolve("cancel"))
    expect(result.current.pending).toBeNull()
  })

  it("saves before confirming close", async () => {
    const { result, close, service } = setup()
    act(() => { result.current.change("draft"); result.current.request({ kind: "close" }) })
    await act(async () => result.current.resolve("save"))
    expect(service.write).toHaveBeenCalledWith("D:/new.md", "draft")
    expect(close).toHaveBeenCalledTimes(1)
    expect(result.current.doc.isDirty).toBe(false)
  })

  it("handles a failed close and allows retry without discarding content", async () => {
    const { result, close } = setup()
    close.mockRejectedValueOnce(new Error("cannot destroy"))
    act(() => { result.current.change("draft"); result.current.request({ kind: "close" }) })
    await act(async () => result.current.resolve("discard"))
    expect(result.current.error).toContain("cannot destroy")
    expect(result.current.doc.content).toBe("draft")
    act(() => result.current.request({ kind: "close" }))
    await act(async () => result.current.resolve("discard"))
    expect(close).toHaveBeenCalledTimes(2)
  })

  it("opens the requested recent path only after confirmation", async () => {
    const { result, service } = setup()
    act(() => { result.current.change("draft"); result.current.request({ kind: "open", path: "D:/recent.md" }) })
    expect(service.read).not.toHaveBeenCalled()
    await act(async () => result.current.resolve("discard"))
    expect(service.read).toHaveBeenCalledWith("D:/recent.md")
    expect(result.current.doc.path).toBe("D:/recent.md")
    expect(service.chooseOpenFile).not.toHaveBeenCalled()
  })
})
