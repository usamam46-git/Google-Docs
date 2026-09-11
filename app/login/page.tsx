import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { UserPicker } from "@/components/auth/user-picker"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>
}) {
  const user = await getCurrentUser()
  if (user) redirect("/documents")

  const { next } = await searchParams
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } })

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Docs</h1>
          <p className="text-sm text-muted-foreground">
            Pick a seeded account to sign in. No password needed — this is a
            mocked-auth demo.
          </p>
        </div>
        <UserPicker users={users} redirectTo={next && next.startsWith("/") ? next : "/documents"} />
      </div>
    </main>
  )
}
