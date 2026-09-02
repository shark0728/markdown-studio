import { describe, expect, it, vi } from "vitest"
import { closeWindow, shouldInterceptClose } from "@/lib/window"

describe("window close helpers", () => {
  it("only intercepts close when there are unsaved changes", () => {
    expect(shouldInterceptClose(false, false)).toBe(false)
    expect(shouldInterceptClose(true, false)).toBe(true)
    expect(shouldInterceptClose(true, true)).toBe(false)
  })

  it("uses destroy to finish a confirmed native close", async () => {
    const destroy = vi.fn().mockResolvedValue(undefined)
    await closeWindow({ destroy })
    expect(destroy).toHaveBeenCalledOnce()
  })
})
