import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { canAccess } from "@/lib/access"
import { errorResponse } from "@/lib/api-response"

type Params = { params: Promise<{ id: string; commentId: string }> }

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id, commentId } = await params
  const user = await getCurrentUser()
  if (!user) return errorResponse("Unauthorized", 401)

  const doc = await prisma.document.findUnique({ where: { id }, include: { shares: true } })
  if (!doc) return errorResponse("Document not found", 404)

  const access = canAccess(doc, user.id, doc.shares)
  if (!access) return errorResponse("You don't have access to this document", 403)

  const comment = await prisma.comment.findFirst({ where: { id: commentId, documentId: id } })
  if (!comment) return errorResponse("Comment not found", 404)

  const isOwner = access === "owner"
  const isAuthor = comment.authorId === user.id
  if (!isOwner && !isAuthor) {
    return errorResponse("You can only delete your own comments", 403)
  }

  await prisma.comment.delete({ where: { id: commentId } })
  return NextResponse.json({ ok: true })
}
