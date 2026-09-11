# Docs — Collaborative Document Editor

## Submission Document

A lightweight, Google-Docs-inspired collaborative document editor built for the AI-Native
Full Stack Developer take-home assignment. This single document contains everything a
reviewer needs: the live links, a full feature walkthrough, the architecture and data model,
the AI workflow note, setup instructions, the API reference, and the final submission
checklist.

---

## Table of Contents

1. [Live Links & Access](#live-links--access)
2. [Objective Recap](#objective-recap)
3. [Feature Walkthrough](#feature-walkthrough)
   - [Document Creation & Editing](#1-document-creation--editing)
   - [Rich Text Formatting](#2-rich-text-formatting)
   - [File Upload / Import](#3-file-upload--import)
   - [Sharing](#4-sharing)
   - [Persistence](#5-persistence)
   - [Version History (stretch)](#6-version-history-stretch)
   - [Comments (stretch)](#7-comments-stretch)
   - [Markdown Export (stretch)](#8-markdown-export-stretch)
4. [Tech Stack](#tech-stack)
5. [Architecture](#architecture)
   - [Data Model](#data-model)
   - [Request Flow](#request-flow)
   - [Access Control Model](#access-control-model)
   - [Autosave & Version Checkpoints](#autosave--version-checkpoints)
   - [File Import Pipeline](#file-import-pipeline)
   - [Markdown Export Pipeline](#markdown-export-pipeline)
   - [Auth Model](#auth-model)
6. [Repository Structure](#repository-structure)
7. [API Reference](#api-reference)
   - [Example Requests & Responses](#example-requests--responses)
8. [Design Decisions — Anticipated Questions](#design-decisions--anticipated-questions)
9. [Manual QA Script](#manual-qa-script)
10. [Local Setup & Run Instructions](#local-setup--run-instructions)
11. [Environment Variables Reference](#environment-variables-reference)
12. [Testing](#testing)
13. [Deployment](#deployment)
14. [AI Workflow Note](#ai-workflow-note)
15. [What Was Prioritized and What Was Cut](#what-was-prioritized-and-what-was-cut)
16. [Known Limitations & What's Next](#known-limitations--whats-next)
17. [Submission Checklist](#submission-checklist)

---

## Live Links & Access

| | |
| --- | --- |
| **Live product URL** | https://google-docs-kappa.vercel.app |
| **Source code (GitHub)** | https://github.com/usamam46-git/Google-Docs |
| **Walkthrough video** | attached separately |

### Seeded test accounts (no password — mocked auth)

Sign-in is a picker of seeded accounts; there is no password to enter.

| Name | Email | Notes |
| --- | --- | --- |
| Alice Chen | `alice@ajaia.dev` | Owns "Q3 Planning Notes" (shared with Bob as Edit, Carol as View) and "Onboarding Guide" (not shared) |
| Bob Martinez | `bob@ajaia.dev` | Owns "Bob's Scratchpad"; has **Edit** access to Alice's "Q3 Planning Notes" |
| Carol Singh | `carol@ajaia.dev` | Owns nothing; has **View-only** access to Alice's "Q3 Planning Notes" |

Signing in as each of the three accounts is the fastest way to see every angle of the
sharing/permission model in one sitting: an owner, an editor-by-invitation, and a
viewer-by-invitation, all looking at the same document.

---

## Objective Recap

The brief asked for a lightweight collaborative document editor demonstrating: document
creation/editing with basic rich text, file upload into the product workflow, a simple but
real sharing model with owner/shared distinction, persistence across refresh, and engineering
quality (setup docs, validation, error handling, at least one automated test, an architecture
note). It explicitly rewarded depth over breadth and deliberate scope cuts over attempting
every possible feature shallowly.

Given the timebox, the strategy was: build the required core completely and correctly first,
verify it end-to-end (including server-side security boundaries, not just UI affordances),
document the scope decisions honestly, and only then add optional stretch work — three of the
five listed stretch ideas (version history, commenting, Markdown export) rather than all five,
because the other two (real-time collaboration presence, PDF export) each need a new piece of
infrastructure that would have been genuinely risky to get right in the remaining time, and a
half-working stretch feature would have undercut the core submission.

---

## Feature Walkthrough

### 1. Document Creation & Editing

- **Create**: "New document" on the dashboard creates a blank, untitled document owned by the
  current user and immediately opens the editor.
- **Rename**: the title is an inline, always-editable input in the editor header (for anyone
  with edit access). Renaming autosaves ~600ms after the user stops typing, with a small
  "Saving… / Saved" indicator next to the title.
- **Reopen**: navigating back to the dashboard and clicking a document (or refreshing the
  editor page) reloads the exact saved state — title, formatting, and structure — because
  content is persisted as structured JSON, not re-derived from anything transient.
- **Delete**: an owner can delete a document from the dashboard's "⋮" menu, behind a
  confirmation dialog that explains the action is permanent and revokes access for anyone the
  document was shared with.

### 2. Rich Text Formatting

The editor is built on [Tiptap](https://tiptap.dev) (a ProseMirror-based toolkit) with its
`StarterKit` extension bundle, which covers every formatting control the brief asked for:

- **Bold**, *italic*, <u>underline</u>
- Headings, levels 1–3
- Bulleted lists and numbered lists

The toolbar only renders for users who can actually edit (owner or Edit-share); a view-only
user sees the same content rendered read-only, with no toolbar and a disabled title field, so
there is no dead-end UI implying an action that would just fail.

### 3. File Upload / Import

"Import file" on the dashboard opens a dialog that accepts one file and converts it into a
new, fully editable document owned by the importing user:

| Extension | Conversion path |
| --- | --- |
| `.docx` | [mammoth](https://github.com/mwilliamson/mammoth.js) → HTML → Tiptap JSON |
| `.md` / `.markdown` | [marked](https://marked.js.org) → HTML → Tiptap JSON |
| `.txt` | escaped + paragraph-wrapped → HTML → Tiptap JSON |

Constraints are enforced up front and communicated clearly, not discovered by trial and
error: the dialog's own copy states the supported extensions and the 5MB limit; the server
independently re-validates both (never trusting the client alone) and returns a specific,
readable error for an unsupported type, an oversized file, or a file that fails to parse
(e.g. a corrupted `.docx`).

### 4. Sharing

- The document owner opens **Share** from the editor header, picks another seeded user, and
  grants either **View** or **Edit** access.
- Existing shares are listed in the same dialog with a one-click **revoke** (✕).
- The dashboard splits documents into **My documents** (owned) and **Shared with me**
  (access granted by someone else), and every shared document shows its granted permission
  as a badge ("Can edit" / "View only") plus who shared it.
- A view-only collaborator sees a read-only editor and a "View only · Shared by \<owner\>"
  label instead of the Share button (they have nothing to share).
- An edit collaborator gets the full editing toolbar and autosave, but not the Share button
  (sharing is an owner-only action) and not the delete option.

### 5. Persistence

Every mutation (content edits, renames, shares, comments, imports, restores) is written
straight to Postgres via Prisma — there is no client-only or in-memory state that would be
lost on refresh. Reloading a document, closing and reopening the browser, or opening the same
document as a different authorized user all show the same up-to-date content.

### 6. Version History (stretch)

- **History** in the editor header opens a dialog listing automatic checkpoints of the
  document's past content, newest first, each with a relative timestamp and a short plain-text
  preview of what that version contained.
- Checkpoints are created **automatically**, not manually: right before an autosaved content
  change is written, the system checks how long it's been since the last checkpoint for that
  document, and only writes a new checkpoint if it's been at least a couple of minutes (or none
  exists yet). This avoids flooding the history with one entry per debounced keystroke while
  still capturing meaningful past states as a user works.
- **Restore** (visible to anyone who can edit) reverts the document's title and content to a
  chosen checkpoint — but first it saves the *current* state as its own checkpoint, so a
  restore is itself always undoable from the same History dialog. This is a small but
  deliberate safety property: version history that can't recover from an accidental restore
  isn't very trustworthy.
- View-only users can open History and read past versions (it's part of a document's content,
  which they're already allowed to see) but do not get a Restore button, matching the same
  read/write boundary as everywhere else in the app.

### 7. Comments (stretch)

- **Comments** opens a lightweight discussion thread scoped to the whole document (not
  anchored to a specific text selection — see the scope note below).
- Anyone with **any** level of access to the document — owner, Edit, or **View** — can read
  and post comments. This intentionally mirrors how feedback/suggestion tools usually work:
  a viewer who can't change the document should still be able to say something about it.
- A comment can be deleted by its own author, or by the document owner (for moderation),
  shown as a small trash icon only where the current user is actually allowed to use it.
- Comments are ordered oldest-first like a conversation thread and show the author's name and
  a relative timestamp.

**Scope note:** true Google-Docs-style comments are anchored to a specific text range (you
select text, then comment on that selection, and the selection stays highlighted). Building
that well means a custom Tiptap mark extension carrying a thread ID, plus UI to position
comment bubbles next to the anchored text and to handle what happens when the anchored text is
later edited or deleted. That's a meaningfully larger and riskier scope for the time available
than a per-document discussion thread, which still fully satisfies "commenting… mode" as a
mechanism for giving and reading feedback on a document, so the per-document thread was the
scope actually built.

### 8. Markdown Export (stretch)

- **Export** in the editor header downloads the current document as a `.md` file, named from
  the document's title (e.g. "Q3 Planning Notes" → `q3-planning-notes.md`).
- Available to anyone who can read the document (owner, Edit, or View) — exporting doesn't
  change anything, so it doesn't need write access.
- The conversion reuses the same Tiptap extension set as the editor itself: the document's
  JSON is rendered to HTML server-side, then converted to Markdown with
  [Turndown](https://github.com/mixmark-io/turndown). Headings, bold/italic, and both list
  types all round-trip correctly — verified both with an automated test
  (`tests/markdown-export.test.ts`) and a manual export/inspect pass in the browser.

---

## Tech Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | **Next.js 16** (App Router) | Server Components for data-loaded pages, Route Handlers under `app/api/**` double as the Node/TypeScript backend — no separate server process to deploy or keep in sync |
| Language | **TypeScript** | End-to-end type safety from the Prisma schema through the API layer to the React components |
| Database | **PostgreSQL** via **Prisma ORM** (deployed on **Neon**) | Relational model fits documents/shares/versions/comments naturally; Prisma gives typed queries and migrations; Neon gives a free, serverless-friendly Postgres that plugs straight into Vercel |
| Rich text editor | **Tiptap** (ProseMirror) | Modern, well-maintained, React-friendly rich text toolkit; StarterKit alone covers every formatting requirement in the brief. (Quill was the assignment's suggested default, but was deliberately swapped out — see the AI workflow note — for known React 18+/Next.js friction.) |
| UI components | **shadcn/ui** (generated on top of **Base UI**) + **Tailwind CSS v4** | Accessible, consistent, copy-into-your-repo component primitives styled with Tailwind utility classes |
| Forms & validation | **react-hook-form** + **zod** | Shared validation schemas between client forms and server route handlers (`lib/schemas.ts`) so the same rules are enforced in both places, not just the UI |
| Auth | **iron-session** | Small, well-audited signed-cookie session library; no database session table needed |
| File conversion | **mammoth** (.docx → HTML), **marked** (.md → HTML), **Turndown** (HTML → Markdown) | Purpose-built, focused libraries for each direction of conversion rather than one do-everything dependency |
| Testing | **Vitest** | Fast, zero-config-friendly test runner for the pure-logic modules (`lib/access.ts`, `lib/markdown-export.ts`) |
| Deployment | **Vercel** (app) + **Neon** (database) | Next.js's native deployment target; Neon is the natural serverless-Postgres pairing for it |

---

## Architecture

### Data Model

```prisma
model User {
  id             String          @id @default(cuid())
  email          String          @unique
  name           String
  createdAt      DateTime        @default(now())
  ownedDocuments Document[]      @relation("OwnedDocuments")
  shares         DocumentShare[]
  comments       Comment[]
}

model Document {
  id        String   @id @default(cuid())
  title     String
  content   Json                 // Tiptap document JSON — the source of truth
  ownerId   String
  owner     User     @relation("OwnedDocuments", fields: [ownerId], references: [id])
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  shares   DocumentShare[]
  versions DocumentVersion[]
  comments Comment[]
}

enum Permission {
  VIEW
  EDIT
}

model DocumentShare {
  id         String     @id @default(cuid())
  documentId String
  document   Document   @relation(fields: [documentId], references: [id], onDelete: Cascade)
  userId     String
  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  permission Permission
  createdAt  DateTime   @default(now())

  @@unique([documentId, userId])   // one share row per person per document
}

model DocumentVersion {
  id         String   @id @default(cuid())
  documentId String
  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  title      String
  content    Json
  createdAt  DateTime @default(now())
}

model Comment {
  id         String   @id @default(cuid())
  documentId String
  document   Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  authorId   String
  author     User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  content    String
  createdAt  DateTime @default(now())
}
```

`content` is stored as Tiptap's own JSON document shape (not HTML), so it round-trips through
the editor without any lossy conversion. HTML only ever appears transiently, as an
intermediate step during file import and Markdown export.

### Request Flow

- **Server Components** (`app/documents/page.tsx`, `app/documents/[id]/page.tsx`) query Prisma
  directly during render and pass already-resolved data down to client components — no
  client-side fetch is needed just to paint the initial page.
- **Route Handlers** (everything under `app/api/**`) are the only place any mutation happens.
  Every one of them follows the same shape:
  1. Load the current user from the session (`lib/auth.ts`); return `401` if there isn't one.
  2. Load the document (and its shares, where relevant) from the database.
  3. Compute an access level with `canAccess()` and gate the operation with `canRead` /
     `canWrite` / `canManage`; return `403` (or `404`, for documents the user has no access to
     at all, so existence isn't leaked) on failure.
  4. Validate the request body against a zod schema shared with the client-side form.
  5. Perform the database write.
  6. Return a consistent `{ error }` shape with an appropriate HTTP status on any failure.
- **Client components** (the editor shell, all dialogs) call these routes with `fetch` and
  show a toast on failure. They never talk to Prisma directly.

### Access Control Model

A single pure function is the one source of truth for "what can this person do with this
document," used by literally every document-related route handler:

```ts
// lib/access.ts
export type AccessLevel = "owner" | "edit" | "view" | null

export function canAccess(doc, userId, shares): AccessLevel {
  if (!userId) return null
  if (doc.ownerId === userId) return "owner"
  const share = shares.find((s) => s.userId === userId)
  if (!share) return null
  return share.permission === "EDIT" ? "edit" : "view"
}

export function canRead(level): boolean   { return level !== null }
export function canWrite(level): boolean  { return level === "owner" || level === "edit" }
export function canManage(level): boolean { return level === "owner" }   // share / delete
```

This is deliberately the one piece of business logic covered by an automated test
(`tests/access.test.ts`, 8 cases) — it's the piece where a subtle bug would be a real security
issue (a viewer editing a document, or a stranger reading one), not just a UI inconvenience,
so it's the one place where "I read the code and it looks right" wasn't considered enough.

Permission mapping used throughout the app:

| Action | Owner | Edit share | View share | No access |
| --- | --- | --- | --- | --- |
| Read document | ✅ | ✅ | ✅ | ❌ (404, not 403) |
| Edit content / rename | ✅ | ✅ | ❌ | ❌ |
| Comment | ✅ | ✅ | ✅ | ❌ |
| View version history | ✅ | ✅ | ✅ | ❌ |
| Restore a version | ✅ | ✅ | ❌ | ❌ |
| Export to Markdown | ✅ | ✅ | ✅ | ❌ |
| Share / revoke access | ✅ | ❌ | ❌ | ❌ |
| Delete document | ✅ | ❌ | ❌ | ❌ |

### Autosave & Version Checkpoints

The editor debounces two independent things into `PATCH /api/documents/[id]`:

- Content changes: 800ms after the last keystroke.
- Title changes: 600ms after the last keystroke.

Each shows its own "Saving… / Saved / Couldn't save" state next to the title, so a failed
save is visible rather than silently lost.

Because autosave can fire every ~800ms during continuous typing, checkpointing on *every* save
would flood version history with near-duplicate entries. `lib/version-snapshot.ts` instead
checks the most recent checkpoint's timestamp and only writes a new one if none exists yet or
the last one is older than a fixed interval (2 minutes) — a simple time-based throttle that
keeps history meaningful without any extra moving parts (no queues, no background jobs).

This mechanism is intentionally last-write-wins and single-editor-oriented; it is not a
real-time collaboration/merge system (see "What was cut," below).

### File Import Pipeline

`lib/docx-import.ts` normalizes all three supported input types down to one shared path:

```
.docx  → mammoth.convertToHtml()   ─┐
.md    → marked.parse()             ├─→ HTML → generateJSON() → Tiptap document JSON
.txt   → escape + wrap in <p> tags ─┘
```

`generateJSON` (from `@tiptap/html/server`) needs a DOM to parse HTML in a Node.js environment
(there's no browser `DOMParser` on the server); it uses `happy-dom` under the hood for that,
entirely transparently — the import route itself never touches happy-dom directly.

### Markdown Export Pipeline

`lib/markdown-export.ts` runs the same idea in reverse:

```
Tiptap JSON → generateHTML() → HTML → Turndown → Markdown text
```

using the exact same extension set (`StarterKit`) as the editor and the importer, so the same
content model is interpreted consistently in every direction (edit, import, export).

### Auth Model

Sign-in is a deliberately mocked flow, as explicitly permitted by the assignment brief: a
`/login` page lists the seeded users, and choosing one calls `POST /api/auth/login` with that
user's id — no password anywhere in the system. The server sets an **httpOnly, signed** session
cookie via `iron-session`, storing only the user's id. `proxy.ts` (Next.js 16's renamed
`middleware.ts`) checks for a valid session on every `/documents/**` route and redirects to
`/login` if there isn't one; `lib/auth.ts`'s `getCurrentUser()` is the single place server code
resolves "who is making this request."

---

## Repository Structure

```
app/
  page.tsx                          redirect to /documents or /login
  login/page.tsx                    seeded-user picker
  documents/page.tsx                dashboard (My documents / Shared with me)
  documents/[id]/page.tsx           editor page (server component, loads + access-checks)
  layout.tsx                        root layout, fonts, toaster
  globals.css                       Tailwind + editor typography styles
  api/
    auth/login/route.ts             POST — sign in as a seeded user
    auth/logout/route.ts            POST — clear session
    documents/route.ts              GET (list mine/shared) · POST (create blank doc)
    documents/import/route.ts       POST — file → new document
    documents/[id]/route.ts         GET · PATCH (rename/save) · DELETE
    documents/[id]/share/route.ts   POST — grant access
    documents/[id]/share/[shareId]/route.ts   DELETE — revoke access
    documents/[id]/versions/route.ts          GET — list checkpoints
    documents/[id]/versions/[versionId]/restore/route.ts   POST — restore a checkpoint
    documents/[id]/comments/route.ts          GET · POST
    documents/[id]/comments/[commentId]/route.ts   DELETE
    documents/[id]/export/route.ts            GET — download as Markdown

components/
  auth/user-picker.tsx               login page's account list
  documents/
    dashboard-header.tsx             top bar (user name, sign out)
    document-list.tsx                owned/shared lists, delete flow
    new-document-button.tsx
    import-dialog.tsx
    share-dialog.tsx
  editor/
    editor-shell.tsx                 editor page's client shell: title, autosave, toolbar row
    tiptap-editor.tsx                Tiptap `useEditor` wrapper
    toolbar.tsx                      bold/italic/underline/headings/lists buttons
    version-history-dialog.tsx
    comments-dialog.tsx
    export-button.tsx
  ui/                                 shadcn/ui generated primitives (button, dialog, etc.)

lib/
  prisma.ts                          Prisma client singleton
  session.ts / auth.ts               iron-session config + getCurrentUser()
  access.ts                          canAccess / canRead / canWrite / canManage
  schemas.ts                         zod schemas shared by client forms and API routes
  api-response.ts                    errorResponse() helper for a consistent error shape
  docx-import.ts                     file → Tiptap JSON conversion
  markdown-export.ts                 Tiptap JSON → Markdown conversion
  version-snapshot.ts                throttled version-checkpoint logic

prisma/
  schema.prisma
  seed.ts                            creates the 3 seeded users + sample documents/shares
  migrations/

tests/
  access.test.ts                     8 cases covering the permission matrix
  markdown-export.test.ts            conversion + filename-slugify cases

proxy.ts                             Next.js 16 middleware — session gate on /documents/**
vitest.config.ts
README.md · ARCHITECTURE.md · AI_WORKFLOW.md · SUBMISSION.md (this file)
```

---

## API Reference

All routes are under `app/api/`. Every route (except login) requires a valid session cookie
and returns `401` without one. Error responses are always `{ "error": string }` with an
appropriate status code.

| Method | Path | Auth required | Purpose |
| --- | --- | --- | --- |
| `POST` | `/api/auth/login` | — | Sign in as a seeded user (`{ userId }`) |
| `POST` | `/api/auth/logout` | session | Clear the session cookie |
| `GET` | `/api/documents` | session | List the caller's owned + shared-with-them documents |
| `POST` | `/api/documents` | session | Create a new blank document (`{ title? }`) |
| `POST` | `/api/documents/import` | session | Upload a file (`multipart/form-data`, field `file`) → new document |
| `GET` | `/api/documents/:id` | `canRead` | Fetch one document, its access level for the caller, and (owner only) its shares |
| `PATCH` | `/api/documents/:id` | `canWrite` | Update `title` and/or `content` (`{ title?, content? }`) |
| `DELETE` | `/api/documents/:id` | `canManage` | Permanently delete a document |
| `POST` | `/api/documents/:id/share` | `canManage` | Grant access (`{ userId, permission: "VIEW" \| "EDIT" }`) |
| `DELETE` | `/api/documents/:id/share/:shareId` | `canManage` | Revoke a specific share |
| `GET` | `/api/documents/:id/versions` | `canRead` | List version checkpoints (id, title, timestamp, text preview) |
| `POST` | `/api/documents/:id/versions/:versionId/restore` | `canWrite` | Restore a checkpoint (checkpoints the current state first) |
| `GET` | `/api/documents/:id/comments` | `canRead` | List comments (author name, content, timestamp) |
| `POST` | `/api/documents/:id/comments` | `canRead` | Post a comment (`{ content }`) — any read access, including view-only |
| `DELETE` | `/api/documents/:id/comments/:commentId` | author or owner | Delete a comment |
| `GET` | `/api/documents/:id/export` | `canRead` | Download the document as `text/markdown` with a `Content-Disposition: attachment` header |

### Example Requests & Responses

A few representative examples of the actual request/response shapes, taken directly from the
zod schemas and route handlers (not idealized — this is what the code returns).

**`POST /api/auth/login`**

```json
// Request
{ "userId": "cmtwhff570000kj5kywhk4npw" }

// 200 Response
{ "user": { "id": "cmtwhff570000kj5kywhk4npw", "name": "Bob Martinez", "email": "bob@ajaia.dev" } }

// 404 Response (unknown id)
{ "error": "User not found" }
```

**`GET /api/documents`**

```json
// 200 Response
{
  "owned": [
    { "id": "cmtwhff5y0004kj5khiaenkh0", "title": "Q3 Planning Notes", "ownerId": "...", "updatedAt": "2026-09-11T04:59:...Z" }
  ],
  "shared": [
    { "id": "cmtwhff680008kj5kkhvyx3ao", "title": "Onboarding Guide", "ownerName": "Alice Chen", "permission": "VIEW", "updatedAt": "..." }
  ]
}
```

**`PATCH /api/documents/:id`** — the autosave endpoint. Either field is optional, but at least
one must be present:

```json
// Request (content-only save, what autosave sends)
{ "content": { "type": "doc", "content": [ { "type": "paragraph", "content": [ { "type": "text", "text": "Hello" } ] } ] } }

// 200 Response
{ "document": { "id": "...", "title": "Q3 Planning Notes", "content": { "...": "..." }, "updatedAt": "2026-09-11T05:12:...Z" } }

// 403 Response — this is the exact response a VIEW-only user gets, confirmed by a direct
// fetch() call during testing, not just a disabled button in the UI
{ "error": "You don't have permission to edit this document" }

// 400 Response — empty body
{ "error": "Nothing to update" }
```

**`POST /api/documents/:id/share`**

```json
// Request
{ "userId": "cmtwhff5i0001kj5kkfiudaau", "permission": "VIEW" }

// 200 Response
{ "share": { "id": "...", "userId": "cmtwhff5i0001kj5kkfiudaau", "name": "Carol Singh", "email": "carol@ajaia.dev", "permission": "VIEW" } }

// 400 Response — sharing with the owner themselves
{ "error": "The owner already has full access" }
```

**`POST /api/documents/import`** — `multipart/form-data` with a single `file` field.

```json
// 200 Response
{ "document": { "id": "cmtwj205h0003kjxo1ish5bp7", "title": "sample-import", "content": { "...": "..." } } }

// 400 Response — unsupported extension
{ "error": "Unsupported file type. Supported types: txt, md, markdown, docx" }

// 400 Response — oversized file
{ "error": "File is too large (max 5MB)" }
```

**`GET /api/documents/:id/versions`**

```json
// 200 Response
{
  "versions": [
    {
      "id": "cmtwm0qi00001kjsogoy6u2kf",
      "title": "Q3 Planning Notes",
      "createdAt": "2026-09-11T07:03:21.384Z",
      "preview": "Q3 Planning Notes Owned by Alice, shared with Bob (edit) and Carol (view)..."
    }
  ]
}
```

**`POST /api/documents/:id/versions/:versionId/restore`**

```json
// 200 Response — the document reverted to that checkpoint's title/content
{ "document": { "id": "...", "title": "Q3 Planning Notes", "content": { "...": "..." } } }

// 404 Response — versionId doesn't belong to this document
{ "error": "Version not found" }
```

**`POST /api/documents/:id/comments`**

```json
// Request
{ "content": "Looks good, ready for review!" }

// 201 Response
{
  "comment": {
    "id": "...",
    "content": "Looks good, ready for review!",
    "createdAt": "2026-09-11T07:20:...Z",
    "authorId": "cmtwhff5l0002kj5kc33xklpl",
    "authorName": "Alice Chen"
  }
}

// 400 Response — empty comment
{ "error": "Comment can't be empty" }
```

**`GET /api/documents/:id/export`** returns `text/markdown` (not JSON) with a
`Content-Disposition: attachment; filename="q3-planning-notes.md"` header, e.g.:

```markdown
# Q3 Planning Notes

Owned by Alice, shared with Bob (edit) and Carol (view) so reviewers can see both permission
levels in action.

## Goals

-   Ship the collaborative editor MVP
-   Get feedback from Bob and Carol
-   Prioritize sharing and import flows

This line uses **bold** and _italic_ text to show formatting.
```

---

## Design Decisions — Anticipated Questions

A few judgment calls a reviewer might reasonably ask about, answered directly:

**Why Postgres instead of SQLite, for a demo-scale app?**
SQLite's file-based storage doesn't survive Vercel's ephemeral serverless filesystem between
invocations, so it was never actually viable for the deployed target, independent of scale.
Postgres via Neon gives the same "just works, free tier" simplicity as SQLite for local dev,
while also being the thing that actually runs once deployed — using one database engine for
both, rather than SQLite locally and Postgres in prod, avoids a whole class of "works on my
machine" schema/dialect drift.

**Why a signed cookie session instead of JWTs or NextAuth?**
The brief explicitly allows mocked auth, and the only requirement is "identify who's making
this request, safely." A signed, httpOnly cookie via `iron-session` does exactly that in
~15 lines of config, with no token-refresh logic, no client-side token storage, and no new
attack surface (XSS-exfiltrated tokens) to reason about. NextAuth would add real value the
moment real credential-based or OAuth login is needed — it wasn't, here.

**Why store Tiptap JSON instead of HTML in the database?**
HTML is a lossy, ambiguous serialization for rich text (multiple HTML shapes can represent the
same semantic document, and parsing it back always risks small drift). Tiptap's own JSON
schema is exactly what `editor.getJSON()` produces and what `useEditor({ content })` expects,
so storing it means zero conversion on the read or write path for the editor itself — HTML
only appears where it has to (import and export), as a deliberate, contained exception.

**Why is sharing limited to two levels (View/Edit) instead of something more granular?**
The brief's actual requirement is "a visible distinction between owned and shared documents"
plus "a way to grant another user access." View/Edit satisfies that precisely. A richer
permission system (comment-only, suggest-only, transfer ownership, expiring links) is easy to
imagine but wasn't asked for, and each additional tier is another set of states every route
handler and every UI affordance has to correctly account for — exactly the kind of scope
creep the brief warns against.

**Why is delete permanent instead of soft-deleted with an undo?**
Soft-delete needs its own surface (a trash view, a retention policy, a way to purge), which is
a real feature in its own right, not a small addition. A confirmation dialog that clearly
states the action is permanent and names what it affects (revoking access for anyone the
document is shared with) is an honest, proportionate amount of safety for a feature that isn't
in the brief at all.

**Why is version history time-throttled instead of keeping every single autosaved change?**
Autosave fires roughly every 800ms of typing pause, which over a multi-minute editing session
would produce dozens of near-identical checkpoints — noise that makes "find the version I
want" harder, not easier, and grows the versions table unboundedly for no benefit. A 2-minute
minimum gap between automatic checkpoints keeps history meaningfully browsable while adding no
new infrastructure (no queues, no scheduled jobs — it's one `findFirst` ordered by
`createdAt` before each save).

**Why can view-only users comment, but not edit?**
This mirrors how feedback tools generally work: a stakeholder who shouldn't be able to change
the actual content should still be able to say something about it. Commenting doesn't mutate
the document's content or title at all, so it doesn't cross the "can this person change the
source of truth" line that View/Edit is actually drawing.

---

## Manual QA Script

The exact walkthrough used to verify every feature above, in order. Reproducible by any
reviewer in a few minutes against the live URL.

1. **Sign in as Alice** (`alice@ajaia.dev`). Dashboard shows her owned documents under
   "My documents" and an empty "Shared with me" (she owns everything she has).
2. **Create a document** via "New document." Confirm it opens immediately in the editor with
   an empty, focused, editable body.
3. **Format text**: type a line, select it, click Bold, Italic, and Underline in the toolbar;
   confirm each toggles visually and the toolbar button shows an active state. Apply Heading 1
   to a line, then a bulleted list and a numbered list to two other lines.
4. **Rename**: click the title field, change it, click elsewhere; confirm the header shows
   "Saving…" then "Saved."
5. **Reload the page.** Confirm the new title and all formatting are exactly as left.
6. **Import a file**: from the dashboard, "Import file" → upload a `.md` file with a heading,
   bold text, and a list. Confirm it opens as a new document with all three converted
   correctly. Repeat with a `.docx` file.
7. **Share**: open "Q3 Planning Notes" (seeded, owned by Alice), click Share, grant a second
   seeded user View and a third Edit; confirm both appear in "People with access" with the
   right badges, and that re-opening the "choose a person" list no longer offers users who
   already have access.
8. **Comment as owner**: open Comments, post one, confirm it appears immediately with author
   name and "a few seconds ago," and that it has a delete icon (Alice is both author and owner).
9. **Check version history**: open History — since this document was just edited above, a
   checkpoint should exist with a text preview of the pre-edit content and a Restore button.
10. **Export**: click Export, confirm a `.md` file downloads named after the document's slugified
    title, and that opening it shows correctly converted Markdown.
11. **Sign out, sign in as Bob** (`bob@ajaia.dev`, the Edit-share recipient from step 7).
    Confirm "Q3 Planning Notes" appears under "Shared with me" with a "Can edit" badge, opens
    with the full toolbar, and that edits made here autosave and persist on reload. Confirm
    Bob does **not** see a Share button (sharing is owner-only) and does **not** see the "⋮"
    delete option on the dashboard for this document (he doesn't own it).
12. **Sign out, sign in as Carol** (the View-share recipient). Confirm the same document shows
    a "View only" badge, opens with no toolbar and a disabled title field, and that typing into
    the body has no effect. Confirm Comments and Export are still available to her (read-only
    access is enough for both) and that History has no Restore button for her.
13. **Server-side check (not just UI)**: as Carol, open the browser console and run
    `fetch('/api/documents/<id>', { method: 'PATCH', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ title: 'hack' }) })`
    against the shared document's id — confirm it returns `403`, proving the restriction is
    enforced by the server, not just hidden in the UI.
14. **Unrelated-user check**: as Carol, navigate directly to the URL of a document Alice owns
    but never shared with Carol (e.g. "Onboarding Guide"). Confirm a `404`, not a `403` — the
    document's existence isn't revealed to someone with no access to it at all.
15. **Revoke access**: sign back in as Alice, open Share on "Q3 Planning Notes," click the ✕
    next to Carol's row, confirm she disappears from "People with access" and reappears as an
    option in "choose a person."
16. **Delete**: as Alice, delete one of the throwaway documents created during this walkthrough
    via the "⋮" menu, confirm the AlertDialog names the document and warns the action is
    permanent, confirm, and confirm it disappears from the dashboard.

---

## Local Setup & Run Instructions

### Prerequisites

- Node.js 20.9+ (built and tested on Node 24)
- A Postgres database — either:
  - **Docker**: `docker run -d --name docs-app-postgres -e POSTGRES_USER=docsapp -e POSTGRES_PASSWORD=docsapp -e POSTGRES_DB=docsapp -p 55432:5432 postgres:16-alpine`
  - or a free [Neon](https://neon.tech) project (same connection-string format)

### Steps

```bash
npm install
cp .env.example .env
```

Edit `.env`:

```bash
DATABASE_URL="postgresql://docsapp:docsapp@localhost:55432/docsapp?schema=public"
SESSION_SECRET="any random string, at least 32 characters"
```

```bash
npx prisma migrate dev   # creates all tables (documents, shares, versions, comments, users)
npm run db:seed          # 3 seeded users + sample documents/shares
npm run dev              # http://localhost:3000
```

Visiting `/` redirects to `/login`.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | `prisma migrate deploy && next build` — used for deploys |
| `npm start` | Start the production server (after `build`) |
| `npm test` | Run the Vitest suite |
| `npm run db:seed` | Seed the database (safe to run once on a fresh DB) |
| `npm run db:migrate` | `prisma migrate dev`, for schema changes during development |

---

## Environment Variables Reference

| Variable | Required | Example | Notes |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | `postgresql://user:pass@host:5432/db?schema=public` | Any Postgres connection string — local Docker, Neon, or another provider. Read by both Prisma and, indirectly, every Route Handler through the Prisma client singleton (`lib/prisma.ts`). |
| `SESSION_SECRET` | Yes | a random 32+ character string | Used by `iron-session` to sign the session cookie. `lib/session.ts` throws at startup if this is missing or under 32 characters, so a misconfiguration fails loudly at boot rather than silently producing insecure sessions. |

Neither variable has a default value on purpose — a missing `DATABASE_URL` should fail the
build/boot immediately (Prisma itself errors), and a missing or weak `SESSION_SECRET` should
never silently fall back to something predictable.

`.env.example` in the repo root documents both with placeholder values; `.env` (git-ignored)
holds the real ones for local development.

---

## Testing

`npm test` runs two suites (11 assertions total):

- **`tests/access.test.ts`** — the permission matrix: owner/edit/view/no-access, for every
  helper in `lib/access.ts`. This is the test that matters most, since it verifies a security
  boundary rather than a UI convenience.
- **`tests/markdown-export.test.ts`** — the Tiptap-JSON-to-Markdown conversion produces correct
  headings/bold/list output, and the filename slugifier handles normal, empty, and
  symbol-only titles.

Beyond the automated suite, every feature in this document was manually verified end-to-end
in a real browser across all three seeded accounts, plus a set of checks that went around the
UI entirely: direct `fetch()` calls to confirm a `VIEW`-only user's `PATCH` request is
rejected with `403` (not just disabled in the UI), and direct Postgres queries to confirm
database state actually matched what the UI reported after each mutation.

---

## Deployment

The app is deployed as a standard Next.js app on **Vercel**, backed by **Neon** Postgres.

1. Create a Neon project and copy its Postgres connection string.
2. `vercel login`, then `vercel` (or import the GitHub repo from the Vercel dashboard).
3. Set environment variables on the Vercel project: `DATABASE_URL` (the Neon connection
   string) and `SESSION_SECRET` (a random 32+ character string).
4. Vercel's build command is `prisma migrate deploy && next build` (from `package.json`), so
   the schema is created/updated automatically on every deploy — no manual migration step.
5. After the first deploy, seed the production database once:
   `DATABASE_URL="<neon connection string>" npm run db:seed` (run locally, pointed at
   production, not the local `.env`).

This is exactly the path used for the live URL above.

---

## AI Workflow Note

### Which AI tools were used

The entire implementation was built with **Claude Code** (Sonnet 5) in an agentic session:
planning, scaffolding, writing every file, running dev/build/test/lint commands, debugging
in a real Chrome browser via a browser-automation tool, and querying the database directly to
verify behavior against what the UI claimed.

### Where AI materially sped things up

- **Boilerplate with one obviously-correct shape.** The Route Handlers, Prisma schema, and
  zod schemas were generated in one pass and typechecked cleanly on the first try — this is
  exactly the kind of code where AI generation is fastest and safest, because the pattern
  repeats and the constraints (auth check → access check → validate → mutate → respond) are
  explicit and mechanical.
- **Reading unfamiliar, very new library internals under time pressure**, instead of guessing.
  This project landed on Next.js 16, Prisma 6, Zod 4, and a shadcn/ui generation built on
  Base UI (not Radix) — all newer than the assistant's training data. Rather than writing code
  against a remembered (and possibly outdated) API, Claude Code read the framework's own
  bundled docs (`node_modules/next/dist/docs`) and the actual `@base-ui/react` source and type
  definitions whenever something didn't behave as expected.
- **A real end-to-end verification loop.** Claude Code drove a real Chrome tab to log in as
  each seeded user, create/edit/format documents, import a real generated `.docx` and `.md`
  file, share and revoke access, restore a version, and post/delete comments — then
  cross-checked the results directly against Postgres. A subtle bug (below) was only caught
  this way, not by reading the code.

### What AI-generated output was changed or rejected

- **Quill → Tiptap.** The brief suggested Quill "or a better" editor. Before writing any
  editor code, the known `findDOMNode` friction Quill has under React 18+ strict mode in
  Next.js was flagged, and Tiptap was proposed and confirmed as the replacement before any
  implementation began — not swapped in reactively after hitting a problem.
- **A shadcn `Select` component was replaced with a native `<select>`.** The Share dialog's
  "choose a person" dropdown initially used shadcn's generated `Select` (built on Base UI). It
  visually appeared to select a value, but the underlying form state never actually updated —
  confirmed by adding temporary `console.log`s inside the `onValueChange` callback and
  observing they *never fired* despite the UI showing a selection, then independently
  confirming via a direct `fetch()` (bypassing the UI entirely) that the backend logic itself
  was correct. Rather than fight an unfamiliar, very new component library's internals under
  time pressure, the dropdown was rewritten as a plain native `<select>` wired through
  `react-hook-form`, which is simpler and was confirmed correct immediately.
- **A dialog-open caching bug, caught during the stretch-feature testing pass.** The Version
  History and Comments dialogs only re-fetched their data if local state was still `null` —
  but after the *first* fetch returned an empty array, `!versions` is `false` (an empty array
  is truthy in JavaScript), so neither dialog ever refreshed after that first (empty) load,
  even after new versions/comments were created. Caught by testing the actual sequence a user
  would follow (open dialog while empty → make a change → reopen dialog) rather than testing
  each state in isolation; fixed by always refetching on open instead of conditionally.
- **Prisma version pin.** `npm install prisma@latest` pulled in a version whose CLI depended on
  a package version that doesn't exist on npm (`effect@^4.0.0-rc.114`). Caught immediately from
  the install error and pinned to the latest *stable* 6.x release instead.
- **Dialog/dropdown trigger simplification.** Some Base-UI-backed trigger buttons occasionally
  didn't open on the very first click after a fresh page load during automated testing.
  Real pointer/click events were instrumented directly to confirm the click itself fired
  correctly at the browser level (ruling out an event-dispatch problem) — the remaining
  explanation was React hydration timing, not an app-logic bug. Since every dialog in this app
  is already externally controlled (`open`/`onOpenChange` state), the trigger buttons were
  simplified to plain `<button onClick={() => setOpen(true)}>` elements, removing a layer of
  indirection that wasn't adding value regardless.

### How correctness, UX quality, and reliability were verified

- `npx tsc --noEmit` and `npx eslint .` after every meaningful change.
- `npx vitest run` for the automated suite.
- A full **production build** (`next build && next start`), not just `next dev`, was used to
  confirm a suspected bug wasn't a dev-only artifact before concluding it was real.
- Manual, real-browser walkthroughs as all three seeded users covering every feature in this
  document, including the stretch features added in a second pass.
- Direct Postgres queries (via throwaway Node scripts) to confirm database state matched what
  the UI reported, rather than trusting the UI alone — this is how the version-checkpoint
  throttle and the restore-creates-a-safety-checkpoint behavior were confirmed correct.
- Server-side security checks performed *as* the boundary being tested: a direct `PATCH`
  request as a `VIEW`-only user, bypassing the UI entirely, to confirm the server rejects it
  with `403` — not just that a button happens to be disabled.

---

## What Was Prioritized and What Was Cut

### Prioritized

1. **A permission model that's actually enforced**, not just implied by the UI — every
   document route resolves access through the one `canAccess()` function, and it's the one
   piece of logic covered by a unit test, because a bug there is a security problem, not a
   cosmetic one.
2. **A rich text editor that behaves correctly** — autosave, permission-aware read-only mode,
   and content that survives a reload — over a wider set of formatting options. StarterKit
   already covers everything the brief asked for; extra marks/nodes (tables, images, colors)
   would each be a new place for the JSON-content contract to break, for no requirement gained.
3. **A working import pipeline for three real file types**, including the unglamorous parts
   (rejecting an unsupported extension, an oversized file, or a `.docx` that fails to parse)
   up front, over supporting more formats shallowly.
4. **Consistent product feedback** — every mutation has a loading state and a success/error
   toast, and the current permission level is always visible in the editor header.

### Cut, and why

- **Real-time collaboration** (live cursors, CRDT/OT merging) — explicitly optional in the
  brief, and a different order of engineering effort than everything else here. Autosave +
  last-write-wins is the honest scope for the time available; it's not a real-time app.
- **PDF export** — cut from the stretch list in favor of version history + comments + Markdown
  export, because PDF rendering needs a genuinely new piece of infrastructure (a headless
  browser or a PDF-generation library and its layout quirks) that was a worse risk/time
  trade-off than the three stretch items actually built.
- **Real authentication** — mocked per the brief's own allowance, freeing the time budget for
  the parts actually being evaluated.
- **A granular roles system beyond View/Edit** — the brief asks for "a visible distinction
  between owned and shared documents," which View/Edit plus an Owner role satisfies directly,
  without inventing tiers nobody asked for.
- **Soft-delete / trash / undo-delete** — delete is permanent, behind a confirmation dialog,
  rather than building a whole recovery UX for a feature outside the brief's scope.
- **Text-anchored inline comments** — see the scope note in the Comments section above; a
  per-document thread was chosen deliberately over a riskier anchored-comment implementation.

---

## Known Limitations & What's Next

- Version checkpoints are time-throttled (one per ~2 minutes of active editing), which is
  right for a demo/light-use app but would want tuning (or an explicit "save a named version"
  action) for heavier real-world editing sessions.
- Comments are document-scoped, not text-anchored — see the scope note above for the specific
  reason and what a full implementation would need.
- No presence/typing indicators — a user won't know someone else has a document open unless
  they talk to them separately.
- Delete is permanent (no trash/undo).

With another 2–4 hours, the next things worth building are, in order: text-anchored comments
(the highest-value gap versus a "real" Google Docs), a lightweight presence indicator (even
just "N people have this open" via polling, short of true live cursors), and PDF export.

---

## Submission Checklist

- [x] Source code — https://github.com/usamam46-git/Google-Docs
- [x] Live deployment — https://google-docs-kappa.vercel.app
- [x] `README.md` — setup and run instructions, seeded accounts
- [x] `ARCHITECTURE.md` — priorities and cuts (also folded into this document, above)
- [x] `AI_WORKFLOW.md` — AI tool usage note (also folded into this document, above)
- [x] This `SUBMISSION.md` — the consolidated document
- [x] Automated tests — `tests/access.test.ts`, `tests/markdown-export.test.ts` (`npm test`)
- [x] Document creation, rename, rich-text editing, autosave, reload-persistence
- [x] File import — `.txt`, `.md`, `.docx`
- [x] Sharing — grant View/Edit, revoke, owner/shared dashboard distinction
- [x] Access control enforced server-side (verified with direct, UI-bypassing requests)
- [x] Stretch: version history with restore
- [x] Stretch: comments
- [x] Stretch: Markdown export
- [ ] Walkthrough video — attached separately by the candidate
- [ ] Screenshots/GIF — optional per the assignment; attached separately if included
