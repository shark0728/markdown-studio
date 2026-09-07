export type Theme = "light" | "dark"
export type ViewMode = "editor" | "split" | "preview"

export type EditorStatus = { line: number; column: number; selected: number; canUndo: boolean; canRedo: boolean }

export type DocumentState = {
  path: string | null
  title: string
  content: string
  savedContent: string
  lineEnding: "lf" | "crlf"
  isDirty: boolean
}

export type AppPreferences = {
  theme: Theme
  fontSize: number
  splitRatio: number
  recentFiles: string[]
  viewMode: ViewMode
  wordWrap: boolean
  lineNumbers: boolean
}

export type OutlineItem = {
  id: string
  level: number
  text: string
  line: number
}

export const DEFAULT_PREFERENCES: AppPreferences = {
  theme: "light",
  fontSize: 15,
  splitRatio: 0.5,
  recentFiles: [],
  viewMode: "split",
  wordWrap: true,
  lineNumbers: true,
}
