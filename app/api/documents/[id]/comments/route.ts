import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { canAccess, canRead } from "@/lib/access"
import { errorResponse } from "@/lib/api-response"
import { createCommentSchema } from "@/lib/schemas"

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return errorResponse("Unauthorized", 401)

  const doc = await prisma.document.findUnique({ where: { id }, include: { shares: true } })
  if (!doc) return errorResponse("Document not found", 404)

  const access = canAccess(doc, user.id, doc.shares)
  if (!canRead(access)) return errorResponse("You don't have access to this document", 403)

  const comments = await prisma.comment.findMany({
    where: { documentId: id },
    include: { author: true },
    orderBy: { createdAt: "asc" },
  })

  return NextResponse.json({
    comments: comments.map((c) => ({
      id: c.id,
      content: c.content,
      createdAt: c.createdAt,
      authorId: c.authorId,
      authorName: c.author.name,
    })),
    currentUserId: user.id,
    canDeleteAny: access === "owner",
  })
}

export async function POST(request: NextRequest, { params }: Params) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) return errorResponse("Unauthorized", 401)

  const doc = await prisma.document.findUnique({ where: { id }, include: { shares: true } })
  if (!doc) return errorResponse("Document not found", 404)

  const access = canAccess(doc, user.id, doc.shares)
  // Anyone who can see the document (including view-only) can comment on it.
  if (!canRead(access)) return errorResponse("You don't have access to this document", 403)

  const body = await request.json().catch(() => null)
  const parsed = createCommentSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid comment", 400)
  }

  const comment = await prisma.comment.create({
    data: { documentId: id, authorId: user.id, content: parsed.data.content },
    include: { author: true },
  })

  return NextResponse.json(
    {
      comment: {
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        authorId: comment.authorId,
        authorName: comment.author.name,
      },
    },
    { status: 201 }
  )
}
