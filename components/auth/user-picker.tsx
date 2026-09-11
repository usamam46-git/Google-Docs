"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2Icon } from "lucide-react"

interface PickableUser {
  id: string
  name: string
  email: string
}

export function UserPicker({
  users,
  redirectTo,
}: {
  users: PickableUser[]
  redirectTo: string
}) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function signIn(userId: string) {
    setLoadingId(userId)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Could not sign in")
      }
      router.push(redirectTo)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign in")
      setLoadingId(null)
    }
  }

  return (
    <div className="space-y-2">
      {users.map((user) => (
        <button
          key={user.id}
          type="button"
          onClick={() => signIn(user.id)}
          disabled={loadingId !== null}
          className="w-full flex items-center justify-between rounded-lg border bg-card px-4 py-3 text-left transition-colors hover:bg-accent disabled:opacity-50"
        >
          <span>
            <span className="block font-medium">{user.name}</span>
            <span className="block text-sm text-muted-foreground">{user.email}</span>
          </span>
          {loadingId === user.id && (
            <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
          )}
        </button>
      ))}
    </div>
  )
}
