"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { FileTextIcon, Loader2Icon, MoreVerticalIcon, Trash2Icon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

interface OwnedDoc {
  id: string
  title: string
  updatedAt: string
}

interface SharedDoc {
  id: string
  title: string
  updatedAt: string
  ownerName: string
  permission: "VIEW" | "EDIT"
}

export function DocumentList({ owned, shared }: { owned: OwnedDoc[]; shared: SharedDoc[] }) {
  const router = useRouter()
  const [deleteTarget, setDeleteTarget] = useState<OwnedDoc | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/documents/${deleteTarget.id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Could not delete document")
      toast.success("Document deleted")
      setDeleteTarget(null)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">My documents</h2>
        {owned.length === 0 ? (
          <EmptyState label="You haven't created any documents yet." />
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {owned.map((doc) => (
              <li key={doc.id} className="flex items-center gap-2 px-4 py-3">
                <Link
                  href={`/documents/${doc.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{doc.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      Updated {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
                    </span>
                  </span>
                </Link>
                <Badge variant="secondary">Owner</Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button variant="ghost" size="icon-sm">
                        <MoreVerticalIcon className="size-4" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(doc)}>
                      <Trash2Icon className="size-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Shared with me</h2>
        {shared.length === 0 ? (
          <EmptyState label="Nothing has been shared with you yet." />
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {shared.map((doc) => (
              <li key={doc.id} className="flex items-center gap-2 px-4 py-3">
                <Link
                  href={`/documents/${doc.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <FileTextIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{doc.title}</span>
                    <span className="block text-xs text-muted-foreground">
                      Shared by {doc.ownerName} · Updated{" "}
                      {formatDistanceToNow(new Date(doc.updatedAt), { addSuffix: true })}
                    </span>
                  </span>
                </Link>
                <Badge variant={doc.permission === "EDIT" ? "default" : "outline"}>
                  {doc.permission === "EDIT" ? "Can edit" : "View only"}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.title}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the document and revokes access for anyone
              it was shared with. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting && <Loader2Icon className="size-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
      {label}
    </div>
  )
}
