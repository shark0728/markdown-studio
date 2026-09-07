import { load } from "@tauri-apps/plugin-store"
import { isTauri } from "@tauri-apps/api/core"
import { isMarkdownPath } from "@/lib/document"
import { DEFAULT_PREFERENCES, type AppPreferences } from "@/types"

const STORE_FILE = "preferences.json"
const STORE_KEY = "preferences"

export function sanitizePreferences(value: Partial<AppPreferences> | null | undefined): AppPreferences {
  const fontSize = typeof value?.fontSize === "number" && Number.isFinite(value.fontSize) ? Math.min(24, Math.max(12, value.fontSize)) : DEFAULT_PREFERENCES.fontSize
  const splitRatio = typeof value?.splitRatio === "number" && Number.isFinite(value.splitRatio) ? Math.min(0.7, Math.max(0.3, value.splitRatio)) : DEFAULT_PREFERENCES.splitRatio
  const recentFiles = Array.isArray(value?.recentFiles)
    ? value.recentFiles.filter((item): item is string => typeof item === "string" && isMarkdownPath(item)).filter((path, index, paths) => paths.findIndex((item) => pathKey(item) === pathKey(path)) === index).slice(0, 8)
    : DEFAULT_PREFERENCES.recentFiles
  return {
    theme: value?.theme === "dark" ? "dark" : "light",
    fontSize,
    splitRatio,
    recentFiles,
    viewMode: value?.viewMode === "editor" || value?.viewMode === "preview" ? value.viewMode : "split",
    wordWrap: typeof value?.wordWrap === "boolean" ? value.wordWrap : true,
    lineNumbers: typeof value?.lineNumbers === "boolean" ? value.lineNumbers : true,
  }
}

export function pathKey(path: string) {
  return path.replaceAll("\\", "/").toLocaleLowerCase("en-US")
}

export interface PreferencesStore {
  read(): Promise<AppPreferences>
  write(value: AppPreferences): Promise<void>
}

export const preferencesStore: PreferencesStore = {
  async read() {
    if (!isTauri()) return sanitizePreferences(JSON.parse(localStorage.getItem("markdown-studio-preferences") ?? "null"))
    const store = await load(STORE_FILE, { autoSave: true, defaults: { [STORE_KEY]: DEFAULT_PREFERENCES } })
    return sanitizePreferences(await store.get<Partial<AppPreferences>>(STORE_KEY))
  },
  async write(value) {
    if (!isTauri()) {
      localStorage.setItem("markdown-studio-preferences", JSON.stringify(sanitizePreferences(value)))
      return
    }
    const store = await load(STORE_FILE, { autoSave: true })
    await store.set(STORE_KEY, sanitizePreferences(value))
    await store.save()
  },
}
