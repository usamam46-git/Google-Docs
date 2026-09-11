"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { ArrowLeftIcon, CheckIcon, Loader2Icon } from "lucide-react"
import type { JSONContent } from "@tiptap/react"
import { Input } from "@/components/ui/input"
import { TiptapEditor } from "@/components/editor/tiptap-editor"
import { ShareDialog } from "@/components/documents/share-dialog"
import { VersionHistoryDialog } from "@/components/editor/version-history-dialog"
import { CommentsDialog } from "@/components/editor/comments-dialog"
import { ExportButton } from "@/components/editor/export-button"
import type { AccessLevel } from "@/lib/access"

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

type SaveState = "idle" | "saving" | "saved" | "error"

export function EditorShell({
  documentId,
  initialTitle,
  initialContent,
  access,
  ownerName,
  currentUserId,
  shares,
  shareableUsers,
}: {
  documentId: string
  initialTitle: string
  initialContent: JSONContent
  access: AccessLevel
  ownerName: string
  currentUserId: string
  shares: ShareRow[]
  shareableUsers: ShareableUser[]
}) {
  const canEdit = access === "owner" || access === "edit"
  const [title, setTitle] = useState(initialTitle)
  const [saveState, setSaveState] = useState<SaveState>("idle")
  const contentSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const titleSaveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const persist = useCallback(
    async (payload: { title?: string; content?: JSONContent }) => {
      setSaveState("saving")
      try {
        const res = await fetch(`/api/documents/${documentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error("Save failed")
        setSaveState("saved")
      } catch {
        setSaveState("error")
        toast.error("Couldn't save your changes")
      }
    },
    [documentId]
  )

  function handleContentChange(content: JSONContent) {
    if (!canEdit) return
    if (contentSaveTimeout.current) clearTimeout(contentSaveTimeout.current)
    setSaveState("saving")
    contentSaveTimeout.current = setTimeout(() => {
      persist({ content })
    }, 800)
  }

  function handleTitleChange(value: string) {
    setTitle(value)
    if (!canEdit) return
    if (titleSaveTimeout.current) clearTimeout(titleSaveTimeout.current)
    titleSaveTimeout.current = setTimeout(() => {
      const trimmed = value.trim()
      if (trimmed.length === 0) return
      persist({ title: trimmed })
    }, 600)
  }

  useEffect(() => {
    return () => {
      if (contentSaveTimeout.current) clearTimeout(contentSaveTimeout.current)
      if (titleSaveTimeout.current) clearTimeout(titleSaveTimeout.current)
    }
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-3 p-4">
          <Link
            href="/documents"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            aria-label="Back to documents"
          >
            <ArrowLeftIcon className="size-5" />
          </Link>
          <Input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            disabled={!canEdit}
            className="h-9 min-w-0 flex-1 border-none px-2 text-lg font-medium shadow-none focus-visible:ring-1"
            aria-label="Document title"
          />
          <SaveIndicator state={saveState} />
          {access !== "owner" && (
            <span className="shrink-0 text-xs text-muted-foreground">
              {access === "edit" ? "Can edit" : "View only"} · Shared by {ownerName}
            </span>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <VersionHistoryDialog documentId={documentId} canRestore={canEdit} />
            <CommentsDialog
              documentId={documentId}
              currentUserId={currentUserId}
              isOwner={access === "owner"}
            />
            <ExportButton documentId={documentId} />
            {access === "owner" && (
              <ShareDialog
                documentId={documentId}
                initialShares={shares}
                shareableUsers={shareableUsers}
              />
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 p-6">
        <TiptapEditor
          content={initialContent}
          editable={canEdit}
          onChange={handleContentChange}
        />
      </main>
    </div>
  )
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === "idle") return null
  return (
    <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
      {state === "saving" && (
        <>
          <Loader2Icon className="size-3 animate-spin" /> Saving…
        </>
      )}
      {state === "saved" && (
        <>
          <CheckIcon className="size-3" /> Saved
        </>
      )}
      {state === "error" && <span className="text-destructive">Couldn&apos;t save</span>}
    </span>
  )
}
