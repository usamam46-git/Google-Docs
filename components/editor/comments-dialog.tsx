"use client"

import { useState } from "react"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"
import { Loader2Icon, MessageSquareIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface CommentRow {
  id: string
  content: string
  createdAt: string
  authorId: string
  authorName: string
}

export function CommentsDialog({
  documentId,
  currentUserId,
  isOwner,
}: {
  documentId: string
  currentUserId: string
  isOwner: boolean
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [comments, setComments] = useState<CommentRow[] | null>(null)
  const [draft, setDraft] = useState("")
  const [posting, setPosting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function loadComments() {
    setLoading(true)
    try {
      const res = await fetch(`/api/documents/${documentId}/comments`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "Could not load comments")
      setComments(data.comments)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load comments")
    } finally {
      setLoading(false)
    }
  }

  async function postComment() {
    const content = draft.trim()
    if (!content) return
    setPosting(true)
    try {
      const res = await fetch(`/api/documents/${documentId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "Could not post comment")
      setComments((prev) => [...(prev ?? []), data.comment])
      setDraft("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not post comment")
    } finally {
      setPosting(false)
    }
  }

  async function deleteComment(commentId: string) {
    setDeletingId(commentId)
    try {
      const res = await fetch(`/api/documents/${documentId}/comments/${commentId}`, {
        method: "DELETE",
      })
      if (!res.ok) throw new Error("Could not delete comment")
      setComments((prev) => (prev ?? []).filter((c) => c.id !== commentId))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete comment")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        aria-haspopup="dialog"
        onClick={() => {
          setOpen(true)
          loadComments()
        }}
      >
        <MessageSquareIcon className="size-4" />
        Comments
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Comments</DialogTitle>
            <DialogDescription>
              Visible to anyone with access to this document, including view-only.
            </DialogDescription>
          </DialogHeader>

          {loading && (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              Loading comments…
            </div>
          )}

          {!loading && comments && comments.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No comments yet. Be the first to say something.
            </p>
          )}

          {!loading && comments && comments.length > 0 && (
            <ul className="max-h-72 space-y-3 overflow-y-auto">
              {comments.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {c.authorName}{" "}
                      <span className="font-normal text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                      </span>
                    </p>
                    <p className="whitespace-pre-wrap text-muted-foreground">{c.content}</p>
                  </div>
                  {(isOwner || c.authorId === currentUserId) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0"
                      onClick={() => deleteComment(c.id)}
                      disabled={deletingId === c.id}
                      aria-label="Delete comment"
                    >
                      <Trash2Icon className="size-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="space-y-2 border-t pt-3">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Add a comment…"
              rows={2}
              className="resize-none"
            />
            <div className="flex justify-end">
              <Button onClick={postComment} disabled={posting || draft.trim().length === 0}>
                {posting && <Loader2Icon className="size-4 animate-spin" />}
                Post
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
