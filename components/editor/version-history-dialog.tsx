"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"
import { HistoryIcon, Loader2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface VersionRow {
  id: string
  title: string
  createdAt: string
  preview: string
}

export function VersionHistoryDialog({
  documentId,
  canRestore,
}: {
  documentId: string
  canRestore: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [versions, setVersions] = useState<VersionRow[] | null>(null)
  const [restoreTarget, setRestoreTarget] = useState<VersionRow | null>(null)
  const [restoring, setRestoring] = useState(false)

  async function loadVersions() {
    setLoading(true)
    try {
      const res = await fetch(`/api/documents/${documentId}/versions`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "Could not load history")
      setVersions(data.versions)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load history")
    } finally {
      setLoading(false)
    }
  }

  async function confirmRestore() {
    if (!restoreTarget) return
    setRestoring(true)
    try {
      const res = await fetch(
        `/api/documents/${documentId}/versions/${restoreTarget.id}/restore`,
        { method: "POST" }
      )
      if (!res.ok) throw new Error("Could not restore this version")
      toast.success("Version restored")
      setRestoreTarget(null)
      setOpen(false)
      router.refresh()
      window.location.reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not restore this version")
    } finally {
      setRestoring(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        aria-haspopup="dialog"
        onClick={() => {
          setOpen(true)
          loadVersions()
        }}
      >
        <HistoryIcon className="size-4" />
        History
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Version history</DialogTitle>
            <DialogDescription>
              A checkpoint is saved automatically a couple of minutes into each editing
              session. Restoring saves the current content as a version too, so you can
              always undo a restore.
            </DialogDescription>
          </DialogHeader>

          {loading && (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Loading history…
            </div>
          )}

          {!loading && versions && versions.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No earlier versions yet — checkpoints appear as you keep editing.
            </p>
          )}

          {!loading && versions && versions.length > 0 && (
            <ul className="max-h-80 space-y-2 overflow-y-auto">
              {versions.map((v) => (
                <li key={v.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{v.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(v.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    {canRestore && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRestoreTarget(v)}
                        className="shrink-0"
                      >
                        Restore
                      </Button>
                    )}
                  </div>
                  {v.preview && (
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                      {v.preview}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={restoreTarget !== null}
        onOpenChange={(next) => !next && setRestoreTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this version?</AlertDialogTitle>
            <AlertDialogDescription>
              The document will be reverted to how it looked{" "}
              {restoreTarget
                ? formatDistanceToNow(new Date(restoreTarget.createdAt), { addSuffix: true })
                : ""}
              . The current content is saved as a version first, so this can be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRestore} disabled={restoring}>
              {restoring && <Loader2Icon className="size-4 animate-spin" />}
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
