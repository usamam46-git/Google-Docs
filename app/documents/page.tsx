import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { DashboardHeader } from "@/components/documents/dashboard-header"
import { NewDocumentButton } from "@/components/documents/new-document-button"
import { ImportDialog } from "@/components/documents/import-dialog"
import { DocumentList } from "@/components/documents/document-list"

export default async function DocumentsPage() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")

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

  const ownedSerialized = owned.map((d) => ({
    id: d.id,
    title: d.title,
    updatedAt: d.updatedAt.toISOString(),
  }))

  const shared = sharedRows.map((s) => ({
    id: s.document.id,
    title: s.document.title,
    updatedAt: s.document.updatedAt.toISOString(),
    ownerName: s.document.owner.name,
    permission: s.permission,
  }))

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader user={{ name: user.name, email: user.email }} />
      <main className="mx-auto w-full max-w-4xl flex-1 space-y-8 p-6">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-semibold">Your documents</h1>
          <div className="flex gap-2">
            <ImportDialog />
            <NewDocumentButton />
          </div>
        </div>
        <DocumentList owned={ownedSerialized} shared={shared} />
      </main>
    </div>
  )
}
