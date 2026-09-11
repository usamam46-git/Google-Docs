import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { canAccess, canManage } from "@/lib/access"
import { errorResponse } from "@/lib/api-response"

type Params = { params: Promise<{ id: string; shareId: string }> }

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id, shareId } = await params
  const user = await getCurrentUser()
  if (!user) return errorResponse("Unauthorized", 401)

  const doc = await prisma.document.findUnique({ where: { id }, include: { shares: true } })
  if (!doc) return errorResponse("Document not found", 404)

  const access = canAccess(doc, user.id, doc.shares)
  if (!canManage(access)) return errorResponse("Only the owner can revoke access", 403)

  await prisma.documentShare.deleteMany({ where: { id: shareId, documentId: id } })

  return NextResponse.json({ ok: true })
}
