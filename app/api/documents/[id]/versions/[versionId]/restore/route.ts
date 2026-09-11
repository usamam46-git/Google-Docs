import { NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { canAccess, canWrite } from "@/lib/access"
import { errorResponse } from "@/lib/api-response"

type Params = { params: Promise<{ id: string; versionId: string }> }

export async function POST(_request: NextRequest, { params }: Params) {
  const { id, versionId } = await params
  const user = await getCurrentUser()
  if (!user) return errorResponse("Unauthorized", 401)

  const doc = await prisma.document.findUnique({ where: { id }, include: { shares: true } })
  if (!doc) return errorResponse("Document not found", 404)

  const access = canAccess(doc, user.id, doc.shares)
  if (!canWrite(access)) {
    return errorResponse("You don't have permission to edit this document", 403)
  }

  const version = await prisma.documentVersion.findFirst({
    where: { id: versionId, documentId: id },
  })
  if (!version) return errorResponse("Version not found", 404)

  // Checkpoint the current state before overwriting it, so restoring is itself reversible.
  const updated = await prisma.$transaction(async (tx) => {
    await tx.documentVersion.create({
      data: { documentId: id, title: doc.title, content: doc.content as Prisma.InputJsonValue },
    })
    return tx.document.update({
      where: { id },
      data: { title: version.title, content: version.content as Prisma.InputJsonValue },
    })
  })

  return NextResponse.json({ document: updated })
}
