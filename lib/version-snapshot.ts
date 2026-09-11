import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

// Autosave debounces every ~800ms, so snapshotting on every save would flood
// the history with near-duplicate entries. Instead we only checkpoint the
// pre-edit state when enough time has passed since the last checkpoint.
const SNAPSHOT_MIN_INTERVAL_MS = 2 * 60 * 1000

export async function snapshotIfStale(
  documentId: string,
  currentTitle: string,
  currentContent: Prisma.JsonValue
) {
  const latest = await prisma.documentVersion.findFirst({
    where: { documentId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  })

  const isStale =
    !latest || Date.now() - latest.createdAt.getTime() > SNAPSHOT_MIN_INTERVAL_MS

  if (!isStale) return

  await prisma.documentVersion.create({
    data: {
      documentId,
      title: currentTitle,
      content: currentContent as Prisma.InputJsonValue,
    },
  })
}
