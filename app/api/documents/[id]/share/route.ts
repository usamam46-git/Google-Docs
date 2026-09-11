import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { canAccess, canManage } from "@/lib/access"
import { errorResponse } from "@/lib/api-response"
import { shareDocumentSchema } from "@/lib/schemas"

type Params = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return errorResponse("Unauthorized", 401)

  const doc = await prisma.document.findUnique({ where: { id }, include: { shares: true } })
  if (!doc) return errorResponse("Document not found", 404)

  const access = canAccess(doc, user.id, doc.shares)
  if (!canManage(access)) return errorResponse("Only the owner can share this document", 403)

  const body = await request.json().catch(() => null)
  const parsed = shareDocumentSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid share request", 400)
  }

  if (parsed.data.userId === doc.ownerId) {
    return errorResponse("The owner already has full access", 400)
  }

  const targetUser = await prisma.user.findUnique({ where: { id: parsed.data.userId } })
  if (!targetUser) return errorResponse("User not found", 404)

  const share = await prisma.documentShare.upsert({
    where: { documentId_userId: { documentId: id, userId: parsed.data.userId } },
    create: { documentId: id, userId: parsed.data.userId, permission: parsed.data.permission },
    update: { permission: parsed.data.permission },
  })

  return NextResponse.json({
    share: {
      id: share.id,
      userId: targetUser.id,
      name: targetUser.name,
      email: targetUser.email,
      permission: share.permission,
    },
  })
}
