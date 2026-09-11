"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Loader2Icon, UploadIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

export function ImportDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleImport() {
    if (!file) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await fetch("/api/documents/import", { method: "POST", body: formData })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "Import failed")
      toast.success("Document imported")
      setOpen(false)
      setFile(null)
      router.push(`/documents/${data.document.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setFile(null)
      }}
    >
      <Button variant="outline" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <UploadIcon className="size-4" />
        Import file
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import a document</DialogTitle>
          <DialogDescription>
            Supported formats: .txt, .md, .docx (max 5MB). The file is converted
            into a new editable document you own.
          </DialogDescription>
        </DialogHeader>
        <input
          type="file"
          accept=".txt,.md,.markdown,.docx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="rounded-md border border-input px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium"
        />
        <DialogFooter>
          <Button onClick={handleImport} disabled={!file || loading}>
            {loading && <Loader2Icon className="size-4 animate-spin" />}
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
