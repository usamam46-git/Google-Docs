import { prisma } from "@/lib/prisma"
import { getSession } from "@/lib/session"

export async function getCurrentUser() {
  const session = await getSession()
  if (!session.userId) return null

  const user = await prisma.user.findUnique({ where: { id: session.userId } })
  if (!user) return null

  return user
}
