import { z } from "zod"

export const createDocumentSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
})

export const renameDocumentSchema = z.object({
  title: z.string().trim().min(1, "Title can't be empty").max(200, "Title is too long"),
})

// Tiptap's document JSON always has a top-level `type: "doc"` node; beyond
// that we don't want to over-constrain the shape since it evolves with
// whichever marks/nodes are enabled in the editor.
export const documentContentSchema = z
  .object({
    type: z.literal("doc"),
  })
  .passthrough()

export const updateDocumentSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  content: documentContentSchema.optional(),
})

export const permissionSchema = z.enum(["VIEW", "EDIT"])

export const shareDocumentSchema = z.object({
  userId: z.string().min(1, "Pick a person to share with"),
  permission: permissionSchema,
})

export const SUPPORTED_IMPORT_EXTENSIONS = ["txt", "md", "markdown", "docx"] as const
