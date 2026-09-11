"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Loader2Icon, Share2Icon, XIcon } from "lucide-react"
import type { z } from "zod"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { shareDocumentSchema } from "@/lib/schemas"

type ShareFormValues = z.infer<typeof shareDocumentSchema>

interface ShareRow {
  id: string
  userId: string
  name: string
  email: string
  permission: "VIEW" | "EDIT"
}

interface ShareableUser {
  id: string
  name: string
  email: string
}

export function ShareDialog({
  documentId,
  initialShares,
  shareableUsers,
}: {
  documentId: string
  initialShares: ShareRow[]
  shareableUsers: ShareableUser[]
}) {
  const [open, setOpen] = useState(false)
  const [shares, setShares] = useState<ShareRow[]>(initialShares)
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ShareFormValues>({
    resolver: zodResolver(shareDocumentSchema),
    defaultValues: { userId: "", permission: "VIEW" },
  })

  const userId = watch("userId")
  const availableUsers = shareableUsers.filter((u) => !shares.some((s) => s.userId === u.id))

  async function onSubmit(values: ShareFormValues) {
    try {
      const res = await fetch(`/api/documents/${documentId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "Could not share document")
      setShares((prev) => [...prev.filter((s) => s.userId !== data.share.userId), data.share])
      reset({ userId: "", permission: "VIEW" })
      toast.success(`Shared with ${data.share.name}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not share document")
    }
  }

  async function revoke(shareId: string) {
    setRevokingId(shareId)
    try {
      const res = await fetch(`/api/documents/${documentId}/share/${shareId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Could not revoke access")
      setShares((prev) => prev.filter((s) => s.id !== shareId))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not revoke access")
    } finally {
      setRevokingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <Share2Icon className="size-4" />
        Share
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share document</DialogTitle>
          <DialogDescription>
            Give another person view or edit access to this document.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex items-start gap-2">
          <div className="flex-1 space-y-1">
            <select
              {...register("userId")}
              disabled={availableUsers.length === 0}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
            >
              <option value="">
                {availableUsers.length === 0 ? "Everyone already has access" : "Choose a person"}
              </option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
            {errors.userId && <p className="text-xs text-destructive">{errors.userId.message}</p>}
          </div>

          <select
            {...register("permission")}
            className="h-9 w-28 rounded-md border border-input bg-background px-2 text-sm"
          >
            <option value="VIEW">View</option>
            <option value="EDIT">Edit</option>
          </select>

          <Button type="submit" disabled={isSubmitting || !userId}>
            {isSubmitting && <Loader2Icon className="size-4 animate-spin" />}
            Add
          </Button>
        </form>

        {shares.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-sm font-medium">People with access</p>
            <ul className="space-y-2">
              {shares.map((share) => (
                <li key={share.id} className="flex items-center justify-between gap-2">
                  <span className="min-w-0 text-sm">
                    <span className="block truncate">{share.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {share.email}
                    </span>
                  </span>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={share.permission === "EDIT" ? "default" : "outline"}>
                      {share.permission === "EDIT" ? "Can edit" : "View only"}
                    </Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => revoke(share.id)}
                      disabled={revokingId === share.id}
                      aria-label={`Revoke access for ${share.name}`}
                    >
                      <XIcon className="size-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
