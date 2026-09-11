import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"
import { errorResponse } from "@/lib/api-response"

const loginSchema = z.object({ userId: z.string().min(1) })

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)
  const parsed = loginSchema.safeParse(body)
  if (!parsed.success) {
    return errorResponse("Pick a user to sign in as", 400)
  }

  const user = await prisma.user.findUnique({ where: { id: parsed.data.userId } })
  if (!user) {
    return errorResponse("User not found", 404)
  }

  const session = await getSession()
  session.userId = user.id
  await session.save()

  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email } })
}
