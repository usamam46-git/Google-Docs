"use client"

import { useRouter } from "next/navigation"
import { FileTextIcon, LogOutIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export function DashboardHeader({ user }: { user: { name: string; email: string } }) {
  const router = useRouter()

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex w-full max-w-4xl items-center justify-between p-4">
        <div className="flex items-center gap-2 font-semibold">
          <FileTextIcon className="size-5" />
          Docs
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-muted-foreground">{user.name}</span>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOutIcon className="size-4" />
            Sign out
          </Button>
        </div>
      </div>
    </header>
  )
}
