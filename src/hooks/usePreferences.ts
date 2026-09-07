import { useCallback, useEffect, useRef, useState } from "react"
import { DEFAULT_PREFERENCES, type AppPreferences } from "@/types"
import { sanitizePreferences, type PreferencesStore } from "@/lib/preferences"

type PreferenceChange = Partial<AppPreferences> | ((value: AppPreferences) => AppPreferences)

function applyChange(value: AppPreferences, change: PreferenceChange) {
  return sanitizePreferences(typeof change === "function" ? change(value) : { ...value, ...change })
}

export function usePreferences(storage: PreferencesStore) {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const current = useRef(preferences)
  const pending = useRef<AppPreferences | null>(null)
  const writer = useRef<Promise<void> | null>(null)
  const initialized = useRef(false)
  const startupChanges = useRef<PreferenceChange[]>([])
  const reader = useRef<Promise<void> | null>(null)

  const enqueueWrite = useCallback((next: AppPreferences) => {
    pending.current = next
    if (!writer.current) {
      // Serialize native writes and coalesce intermediate slider changes.
      writer.current = (async () => {
        while (pending.current) {
          const value = pending.current
          pending.current = null
          try { await storage.write(value); setError(null) }
          catch { setError("偏好设置保存失败，本次设置可能无法在重启后保留。") }
        }
      })().finally(() => { writer.current = null })
    }
  }, [storage])

  useEffect(() => {
    let active = true
    initialized.current = false
    setReady(false)
    reader.current = (async () => {
      let loaded = DEFAULT_PREFERENCES
      try { loaded = sanitizePreferences(await storage.read()) }
      catch { if (active) setError("无法读取偏好设置，已使用默认设置。") }
      if (!active) return
      const changes = startupChanges.current
      startupChanges.current = []
      current.current = changes.reduce(applyChange, loaded)
      initialized.current = true
      setPreferences(current.current)
      if (changes.length) enqueueWrite(current.current)
      setReady(true)
    })()
    return () => { active = false }
  }, [storage, enqueueWrite])

  const update = useCallback((change: PreferenceChange) => {
    if (!initialized.current) {
      // A native drop or splitter action can precede Store loading. Replay over
      // the stored state, never write a defaults-based snapshot over that state.
      startupChanges.current.push(change)
      return
    }
    current.current = applyChange(current.current, change)
    setPreferences(current.current)
    enqueueWrite(current.current)
  }, [enqueueWrite])

  const flush = useCallback(async () => { await reader.current; await writer.current }, [])
  return { preferences, update, ready, error, dismissError: () => setError(null), flush }
}
