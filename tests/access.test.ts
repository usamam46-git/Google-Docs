import { describe, expect, it } from "vitest"
import { canAccess, canManage, canRead, canWrite } from "@/lib/access"

const doc = { ownerId: "owner-1" }

describe("canAccess", () => {
  it("grants the owner 'owner' access regardless of shares", () => {
    expect(canAccess(doc, "owner-1", [])).toBe("owner")
  })

  it("grants 'edit' access to a user with an EDIT share", () => {
    const shares = [{ userId: "user-2", permission: "EDIT" as const }]
    expect(canAccess(doc, "user-2", shares)).toBe("edit")
  })

  it("grants 'view' access to a user with a VIEW share", () => {
    const shares = [{ userId: "user-3", permission: "VIEW" as const }]
    expect(canAccess(doc, "user-3", shares)).toBe("view")
  })

  it("denies access to a user with no share and no ownership", () => {
    const shares = [{ userId: "user-2", permission: "EDIT" as const }]
    expect(canAccess(doc, "stranger", shares)).toBeNull()
  })

  it("denies access when there is no logged-in user", () => {
    expect(canAccess(doc, null, [])).toBeNull()
    expect(canAccess(doc, undefined, [])).toBeNull()
  })
})

describe("permission helpers", () => {
  it("canRead is true for any non-null access level", () => {
    expect(canRead("owner")).toBe(true)
    expect(canRead("edit")).toBe(true)
    expect(canRead("view")).toBe(true)
    expect(canRead(null)).toBe(false)
  })

  it("canWrite is true only for owner and edit", () => {
    expect(canWrite("owner")).toBe(true)
    expect(canWrite("edit")).toBe(true)
    expect(canWrite("view")).toBe(false)
    expect(canWrite(null)).toBe(false)
  })

  it("canManage (share/delete) is true only for the owner", () => {
    expect(canManage("owner")).toBe(true)
    expect(canManage("edit")).toBe(false)
    expect(canManage("view")).toBe(false)
    expect(canManage(null)).toBe(false)
  })
})
