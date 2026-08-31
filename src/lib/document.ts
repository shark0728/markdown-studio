import type { DocumentState } from "@/types"

export function detectLineEnding(content: string): "lf" | "crlf" {
  return content.includes("\r\n") ? "crlf" : "lf"
}

export function normalizeForEditor(content: string) {
  return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n")
}

export function toDiskContent(content: string, lineEnding: "lf" | "crlf") {
  const normalized = normalizeForEditor(content)
  return lineEnding === "crlf" ? normalized.replace(/\n/g, "\r\n") : normalized
}

export function titleFromPath(path: string | null) {
  if (!path) return "未命名文档"
  const normalized = path.replaceAll("\\", "/")
  return normalized.split("/").pop() || "未命名文档"
}

export function createDocument(content = "", path: string | null = null): DocumentState {
  const lineEnding = detectLineEnding(content)
  const normalized = normalizeForEditor(content)
  return {
    path,
    title: titleFromPath(path),
    content: normalized,
    savedContent: normalized,
    lineEnding,
    isDirty: false,
  }
}

export function updateDocumentContent(document: DocumentState, content: string): DocumentState {
  const normalized = normalizeForEditor(content)
  return {
    ...document,
    content: normalized,
    isDirty: normalized !== document.savedContent,
  }
}

export function markDocumentSaved(document: DocumentState, path = document.path): DocumentState {
  return {
    ...document,
    path,
    title: titleFromPath(path),
    savedContent: document.content,
    isDirty: false,
  }
}

export function isMarkdownPath(path: string) {
  return /\.(md|markdown)$/i.test(path)
}
