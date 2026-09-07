import { act, renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { usePreferences } from "@/hooks/usePreferences"
import { DEFAULT_PREFERENCES, type AppPreferences } from "@/types"

describe("preference lifecycle", () => {
  it("merges updates arriving during startup into the loaded preferences", async () => {
    let finish!: (preferences: AppPreferences) => void
    const store = { read: vi.fn(() => new Promise<AppPreferences>((resolve) => { finish = resolve })), write: vi.fn().mockResolvedValue(undefined) }
    const { result } = renderHook(() => usePreferences(store))
    act(() => result.current.update((value) => ({ ...value, recentFiles: ["D:/dropped.md", ...value.recentFiles] })))
    expect(store.write).not.toHaveBeenCalled()
    await act(async () => finish({ ...DEFAULT_PREFERENCES, theme: "dark", fontSize: 22, recentFiles: ["D:/previous.md"] }))
    await waitFor(() => expect(result.current.ready).toBe(true))
    expect(result.current.preferences).toMatchObject({ theme: "dark", fontSize: 22, recentFiles: ["D:/dropped.md", "D:/previous.md"] })
    await act(async () => result.current.flush())
    expect(store.write).toHaveBeenLastCalledWith(expect.objectContaining({ theme: "dark", fontSize: 22, recentFiles: ["D:/dropped.md", "D:/previous.md"] }))
  })

  it("serializes writes and flush waits until the latest queued value is written", async () => {
    const finishers: (() => void)[] = []
    const store = { read: vi.fn().mockResolvedValue(DEFAULT_PREFERENCES), write: vi.fn(() => new Promise<void>((resolve) => finishers.push(resolve))) }
    const { result } = renderHook(() => usePreferences(store))
    await waitFor(() => expect(result.current.ready).toBe(true))
    act(() => { result.current.update({ fontSize: 16 }); result.current.update({ fontSize: 17 }); result.current.update({ fontSize: 18 }) })
    expect(store.write).toHaveBeenCalledTimes(1)
    let flushed = false
    act(() => { void result.current.flush().then(() => { flushed = true }) })
    await act(async () => finishers[0]())
    expect(flushed).toBe(false)
    expect(store.write).toHaveBeenCalledTimes(2)
    expect(store.write).toHaveBeenLastCalledWith(expect.objectContaining({ fontSize: 18 }))
    await act(async () => finishers[1]())
    expect(flushed).toBe(true)
  })
})
