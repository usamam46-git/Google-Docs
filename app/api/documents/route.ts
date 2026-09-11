import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { errorResponse } from "@/lib/api-response"
import { createDocumentSchema } from "@/lib/schemas"

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return errorResponse("Unauthorized", 401)

  const [owned, sharedRows] = await Promise.all([
    prisma.document.findMany({
      where: { ownerId: user.id },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.documentShare.findMany({
      where: { userId: user.id },
      include: { document: { include: { owner: true } } },
      orderBy: { document: { updatedAt: "desc" } },
    }),
  ])

  const shared = sharedRows.map((s) => ({
    id: s.document.id,
    title: s.document.title,
    updatedAt: s.document.updatedAt,
    ownerId: s.document.ownerId,
    ownerName: s.document.owner.name,
    permission: s.permission,
  }))

  return NextResponse.json({ owned, shared })
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return errorResponse("Unauthorized", 401)

  const body = await request.json().catch(() => ({}))
  const parsed = createDocumentSchema.safeParse(body)
  if (!parsed.success) return errorResponse("Invalid title", 400)

  const document = await prisma.document.create({
    data: {
      title: parsed.data.title?.trim() || "Untitled document",
      ownerId: user.id,
      content: { type: "doc", content: [{ type: "paragraph" }] },
    },
  })

  return NextResponse.json({ document }, { status: 201 })
}
