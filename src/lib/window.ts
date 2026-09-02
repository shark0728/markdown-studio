export type ClosableWindow = {
  destroy: () => Promise<void>
}

export function shouldInterceptClose(isDirty: boolean, isClosing: boolean) {
  return isDirty && !isClosing
}

export async function closeWindow(windowRef: ClosableWindow | null) {
  if (windowRef) {
    await windowRef.destroy()
    return
  }
  window.close()
}
