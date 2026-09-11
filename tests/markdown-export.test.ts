import { describe, expect, it } from "vitest"
import { documentToMarkdown, filenameForExport } from "@/lib/markdown-export"

describe("documentToMarkdown", () => {
  it("converts headings, marks, and lists to Markdown", () => {
    const content = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Title" }] },
        {
          type: "paragraph",
          content: [
            { type: "text", text: "Some " },
            { type: "text", marks: [{ type: "bold" }], text: "bold" },
            { type: "text", text: " text." },
          ],
        },
        {
          type: "bulletList",
          content: [
            {
              type: "listItem",
              content: [{ type: "paragraph", content: [{ type: "text", text: "item one" }] }],
            },
          ],
        },
      ],
    }

    const markdown = documentToMarkdown(content)

    expect(markdown).toContain("# Title")
    expect(markdown).toContain("**bold**")
    expect(markdown).toContain("item one")
  })
})

describe("filenameForExport", () => {
  it("slugifies the title into a .md filename", () => {
    expect(filenameForExport("Q3 Planning Notes")).toBe("q3-planning-notes.md")
  })

  it("falls back to 'document.md' for an empty or symbol-only title", () => {
    expect(filenameForExport("   ")).toBe("document.md")
    expect(filenameForExport("!!!")).toBe("document.md")
  })
})
