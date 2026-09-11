import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { errorResponse } from "@/lib/api-response"
import {
  SUPPORTED_IMPORT_EXTENSIONS,
  convertFileToTiptapContent,
  getImportExtension,
  titleFromFilename,
} from "@/lib/docx-import"

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return errorResponse("Unauthorized", 401)

  const formData = await request.formData().catch(() => null)
  const file = formData?.get("file")
  if (!file || !(file instanceof File)) {
    return errorResponse("No file was uploaded", 400)
  }

  if (file.size > MAX_FILE_SIZE) {
    return errorResponse("File is too large (max 5MB)", 400)
  }

  const extension = getImportExtension(file.name)
  if (!extension) {
    return errorResponse(
      `Unsupported file type. Supported types: ${SUPPORTED_IMPORT_EXTENSIONS.join(", ")}`,
      400
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  let content
  try {
    content = await convertFileToTiptapContent(buffer, extension)
  } catch {
    return errorResponse("Could not read that file — it may be corrupted or empty.", 400)
  }

  const document = await prisma.document.create({
    data: {
      title: titleFromFilename(file.name),
      ownerId: user.id,
      content,
    },
  })

  return NextResponse.json({ document }, { status: 201 })
}
