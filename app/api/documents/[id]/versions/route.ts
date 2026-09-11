import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { canAccess, canRead } from "@/lib/access"
import { errorResponse } from "@/lib/api-response"
import { generateText } from "@tiptap/core"
import StarterKit from "@tiptap/starter-kit"
import type { JSONContent } from "@tiptap/core"

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return errorResponse("Unauthorized", 401)

  const doc = await prisma.document.findUnique({ where: { id }, include: { shares: true } })
  if (!doc) return errorResponse("Document not found", 404)

  const access = canAccess(doc, user.id, doc.shares)
  if (!canRead(access)) return errorResponse("You don't have access to this document", 403)

  const versions = await prisma.documentVersion.findMany({
    where: { documentId: id },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({
    versions: versions.map((v) => ({
      id: v.id,
      title: v.title,
      createdAt: v.createdAt,
      preview: generateText(v.content as JSONContent, [StarterKit]).slice(0, 140),
    })),
  })
}
