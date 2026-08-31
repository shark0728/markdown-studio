export type Theme = "light" | "dark"

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
}
