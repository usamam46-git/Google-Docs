import mammoth from "mammoth"
import { marked } from "marked"
import { generateJSON } from "@tiptap/html/server"
import StarterKit from "@tiptap/starter-kit"

const EDITOR_EXTENSIONS = [StarterKit]

export const SUPPORTED_IMPORT_EXTENSIONS = ["txt", "md", "markdown", "docx"] as const
export type ImportableExtension = (typeof SUPPORTED_IMPORT_EXTENSIONS)[number]

export function getImportExtension(filename: string): ImportableExtension | null {
  const ext = filename.split(".").pop()?.toLowerCase()
  if (!ext) return null
  return (SUPPORTED_IMPORT_EXTENSIONS as readonly string[]).includes(ext)
    ? (ext as ImportableExtension)
    : null
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function plainTextToHtml(text: string): string {
  const paragraphs = text.split(/\r?\n\s*\r?\n/).filter((p) => p.trim().length > 0)
  if (paragraphs.length === 0) return "<p></p>"
  return paragraphs
    .map((p) => `<p>${escapeHtml(p).replace(/\r?\n/g, "<br>")}</p>`)
    .join("\n")
}

/**
 * Converts an uploaded file's raw bytes into Tiptap's document JSON so it can
 * be saved straight into a new Document row and opened in the editor.
 */
export async function convertFileToTiptapContent(
  buffer: Buffer,
  extension: ImportableExtension
) {
  let html: string

  if (extension === "docx") {
    const result = await mammoth.convertToHtml({ buffer })
    html = result.value || "<p></p>"
  } else if (extension === "md" || extension === "markdown") {
    html = (await marked.parse(buffer.toString("utf-8"))) || "<p></p>"
  } else {
    html = plainTextToHtml(buffer.toString("utf-8"))
  }

  return generateJSON(html, EDITOR_EXTENSIONS)
}

export function titleFromFilename(filename: string): string {
  const withoutExt = filename.replace(/\.[^./\\]+$/, "")
  return withoutExt.trim() || "Imported document"
}
