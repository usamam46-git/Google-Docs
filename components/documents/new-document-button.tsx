"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2Icon, PlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export function NewDocumentButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function create() {
    setLoading(true)
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "Could not create document")
      router.push(`/documents/${data.document.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
      setLoading(false)
    }
  }

  return (
    <Button onClick={create} disabled={loading}>
      {loading ? <Loader2Icon className="size-4 animate-spin" /> : <PlusIcon className="size-4" />}
      New document
    </Button>
  )
}
