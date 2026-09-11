export type AccessLevel = "owner" | "edit" | "view" | null

interface DocLike {
  ownerId: string
}

interface ShareLike {
  userId: string
  permission: "VIEW" | "EDIT"
}

/**
 * Single source of truth for document permissions. Every route handler that
 * touches a document goes through this instead of re-deriving access rules.
 */
export function canAccess(
  doc: DocLike,
  userId: string | null | undefined,
  shares: ShareLike[]
): AccessLevel {
  if (!userId) return null
  if (doc.ownerId === userId) return "owner"

  const share = shares.find((s) => s.userId === userId)
  if (!share) return null

  return share.permission === "EDIT" ? "edit" : "view"
}

export function canRead(level: AccessLevel): boolean {
  return level !== null
}

export function canWrite(level: AccessLevel): boolean {
  return level === "owner" || level === "edit"
}

// Sharing and deleting are owner-only actions.
export function canManage(level: AccessLevel): boolean {
  return level === "owner"
}
