import { NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { canAccess, canManage, canWrite } from "@/lib/access"
import { errorResponse } from "@/lib/api-response"
import { updateDocumentSchema } from "@/lib/schemas"

type Params = { params: Promise<{ id: string }> }

async function loadDocWithShares(id: string) {
  return prisma.document.findUnique({
    where: { id },
    include: { shares: { include: { user: true } }, owner: true },
  })
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return errorResponse("Unauthorized", 401)

  const doc = await loadDocWithShares(id)
  if (!doc) return errorResponse("Document not found", 404)

  const access = canAccess(doc, user.id, doc.shares)
  if (!access) return errorResponse("You don't have access to this document", 403)

  return NextResponse.json({
    document: {
      id: doc.id,
      title: doc.title,
      content: doc.content,
      ownerId: doc.ownerId,
      ownerName: doc.owner.name,
      updatedAt: doc.updatedAt,
    },
    access,
    shares:
      access === "owner"
        ? doc.shares.map((s) => ({
            id: s.id,
            userId: s.userId,
            name: s.user.name,
            email: s.user.email,
            permission: s.permission,
          }))
        : [],
  })
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return errorResponse("Unauthorized", 401)

  const doc = await loadDocWithShares(id)
  if (!doc) return errorResponse("Document not found", 404)

  const access = canAccess(doc, user.id, doc.shares)
  if (!canWrite(access)) {
    return errorResponse("You don't have permission to edit this document", 403)
  }

  const body = await request.json().catch(() => null)
  const parsed = updateDocumentSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid update payload", 400)
  }

  if (Object.keys(parsed.data).length === 0) {
    return errorResponse("Nothing to update", 400)
  }

  const updated = await prisma.document.update({
    where: { id },
    data: {
      ...(parsed.data.title !== undefined ? { title: parsed.data.title } : {}),
      ...(parsed.data.content !== undefined
        ? { content: parsed.data.content as Prisma.InputJsonValue }
        : {}),
    },
  })

  return NextResponse.json({ document: updated })
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return errorResponse("Unauthorized", 401)

  const doc = await loadDocWithShares(id)
  if (!doc) return errorResponse("Document not found", 404)

  const access = canAccess(doc, user.id, doc.shares)
  if (!canManage(access)) {
    return errorResponse("Only the owner can delete this document", 403)
  }

  await prisma.document.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
