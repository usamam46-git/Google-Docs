"use client"

import { useState } from "react"
import { toast } from "sonner"
import { DownloadIcon, Loader2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"

export function ExportButton({ documentId }: { documentId: string }) {
  const [loading, setLoading] = useState(false)

  async function handleExport() {
    setLoading(true)
    try {
      const res = await fetch(`/api/documents/${documentId}/export`)
      if (!res.ok) throw new Error("Could not export this document")

      const disposition = res.headers.get("Content-Disposition") ?? ""
      const match = disposition.match(/filename="([^"]+)"/)
      const filename = match?.[1] ?? "document.md"

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not export this document")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button variant="outline" onClick={handleExport} disabled={loading}>
      {loading ? <Loader2Icon className="size-4 animate-spin" /> : <DownloadIcon className="size-4" />}
      Export
    </Button>
  )
}
