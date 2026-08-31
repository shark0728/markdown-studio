import { load } from "@tauri-apps/plugin-store"
import { DEFAULT_PREFERENCES, type AppPreferences } from "@/types"

const STORE_FILE = "preferences.json"
const STORE_KEY = "preferences"

export function sanitizePreferences(value: Partial<AppPreferences> | null | undefined): AppPreferences {
  const fontSize = typeof value?.fontSize === "number" ? Math.min(24, Math.max(12, value.fontSize)) : DEFAULT_PREFERENCES.fontSize
  const splitRatio = typeof value?.splitRatio === "number" ? Math.min(0.7, Math.max(0.3, value.splitRatio)) : DEFAULT_PREFERENCES.splitRatio
  const recentFiles = Array.isArray(value?.recentFiles)
    ? value.recentFiles.filter((item): item is string => typeof item === "string").slice(0, 8)
    : DEFAULT_PREFERENCES.recentFiles
  return {
    theme: value?.theme === "dark" ? "dark" : "light",
    fontSize,
    splitRatio,
    recentFiles,
  }
}

export interface PreferencesStore {
  read(): Promise<AppPreferences>
  write(value: AppPreferences): Promise<void>
}

export const preferencesStore: PreferencesStore = {
  async read() {
    const store = await load(STORE_FILE, { autoSave: true, defaults: { [STORE_KEY]: DEFAULT_PREFERENCES } })
    return sanitizePreferences(await store.get<Partial<AppPreferences>>(STORE_KEY))
  },
  async write(value) {
    const store = await load(STORE_FILE, { autoSave: true })
    await store.set(STORE_KEY, sanitizePreferences(value))
    await store.save()
  },
}
