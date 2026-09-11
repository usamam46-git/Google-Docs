import TurndownService from "turndown"
import { generateHTML } from "@tiptap/html/server"
import StarterKit from "@tiptap/starter-kit"
import type { JSONContent } from "@tiptap/core"

const EDITOR_EXTENSIONS = [StarterKit]

const turndownService = new TurndownService({
  headingStyle: "atx",
  bulletListMarker: "-",
})

export function documentToMarkdown(content: JSONContent): string {
  const html = generateHTML(content, EDITOR_EXTENSIONS)
  return turndownService.turndown(html).trim() + "\n"
}

export function filenameForExport(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return `${slug || "document"}.md`
}
