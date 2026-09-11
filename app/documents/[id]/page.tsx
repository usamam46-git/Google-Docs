import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { canAccess } from "@/lib/access"
import { EditorShell } from "@/components/editor/editor-shell"
import type { JSONContent } from "@tiptap/react"

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getCurrentUser()
  if (!user) redirect("/login")

  const doc = await prisma.document.findUnique({
    where: { id },
    include: { shares: { include: { user: true } }, owner: true },
  })
  if (!doc) notFound()

  const access = canAccess(doc, user.id, doc.shares)
  // Return 404 instead of 403 so unauthorized users can't tell the document exists.
  if (!access) notFound()

  const shareableUsers =
    access === "owner"
      ? await prisma.user.findMany({
          where: { id: { not: user.id } },
          orderBy: { name: "asc" },
        })
      : []

  return (
    <EditorShell
      documentId={doc.id}
      initialTitle={doc.title}
      initialContent={doc.content as JSONContent}
      access={access}
      ownerName={doc.owner.name}
      currentUserId={user.id}
      shares={doc.shares.map((s) => ({
        id: s.id,
        userId: s.userId,
        name: s.user.name,
        email: s.user.email,
        permission: s.permission,
      }))}
      shareableUsers={shareableUsers.map((u) => ({ id: u.id, name: u.name, email: u.email }))}
    />
  )
}
