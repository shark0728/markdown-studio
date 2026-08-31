import { open, save } from "@tauri-apps/plugin-dialog"
import { invoke } from "@tauri-apps/api/core"
import { isMarkdownPath } from "@/lib/document"

export const markdownFilters = [{ name: "Markdown", extensions: ["md", "markdown"] }]

export interface FileService {
  chooseOpenFile(): Promise<string | null>
  chooseSaveFile(defaultPath?: string): Promise<string | null>
  read(path: string): Promise<string>
  write(path: string, content: string): Promise<void>
}

export const tauriFileService: FileService = {
  async chooseOpenFile() {
    const selected = await open({ multiple: false, directory: false, filters: markdownFilters })
    return typeof selected === "string" ? selected : null
  },
  async chooseSaveFile(defaultPath) {
    const selected = await save({ defaultPath, filters: markdownFilters })
    if (!selected) return null
    return isMarkdownPath(selected) ? selected : `${selected}.md`
  },
  read: (path) => invoke<string>("read_markdown_file", { path }),
  write: (path, content) => invoke<void>("write_markdown_file", { path, content }),
}
