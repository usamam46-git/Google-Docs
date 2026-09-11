# Architecture Notes

> **Note:** the full, up-to-date submission document — including the three stretch features
> (version history, comments, Markdown export) added after this note was first written — lives
> in `SUBMISSION.md`. This file is kept as the original, focused architecture note.

## Scope and priorities

The brief explicitly rewards depth over breadth. Given a 4–6 hour budget, I prioritized:

1. **A permission model that's actually enforced**, not just hinted at in the UI. Every
   document route (`app/api/documents/**`) resolves access through one function,
   `canAccess()` in `lib/access.ts`, rather than re-deriving "is this person allowed to do X"
   in each handler. This is also the one thing I unit-tested (`tests/access.test.ts`) — it's
   the piece where a subtle bug (e.g. an off-by-one in permission checks) would be a real
   security problem, not just a UI glitch.
2. **A rich text editor that behaves correctly**, including autosave, permission-aware
   read-only mode, and content that survives a page reload — over a wider set of formatting
   options. Tiptap's StarterKit already covers bold/italic/underline/headings/lists, which is
   what the brief asks for; I didn't add extra marks/nodes (tables, images, colors) since they
   weren't required and each one is a new place for the JSON-content contract to break.
3. **A working import pipeline for three real file types** (`.txt`, `.md`, `.docx`), including
   handling of pathological cases up front (unsupported extension, oversized file, a `.docx`
   that fails to parse) — over supporting more formats shallowly.
4. **Consistent product feedback**: every mutation (rename, save, share, revoke, delete,
   import) has a loading state and either a success or error toast, and permission state is
   always visible in the editor header (owner / can edit / view only, and who shared it).

## What was deliberately cut

- **No real-time collaboration** (no CRDT/OT, no live cursors). The brief allows this as an
  optional stretch, not a requirement, and it's a different order of engineering effort than
  the rest of the app. Autosave + last-write-wins is the honest scope for the time available.
- **No real authentication.** Session is a signed cookie set from a list of seeded users with
  no password — explicitly allowed by the brief. This let the time budget go toward the parts
  actually being evaluated (editing, import, sharing) instead of a login/signup flow.
- **Two-level permission model (view/edit) rather than a granular roles system.** Owner can
  do everything (edit, share, delete); a share is either `VIEW` or `EDIT`. This maps directly
  onto the assignment's requirement ("a visible distinction between owned and shared
  documents") without inventing permission tiers nobody asked for.
- **No delete/undo trash.** Delete is permanent (with a confirmation dialog) rather than
  soft-deleted, to avoid building a whole recovery UX for a feature that isn't in scope.
- **PDF export and real-time collaboration presence** were the two stretch items *not* built
  (out of the five listed) — each needs genuinely new infrastructure (a PDF rendering pipeline;
  a presence/websocket channel) that was a worse time/risk trade-off than the three stretch
  items that were built: **version history with restore**, **document-scoped comments**, and
  **Markdown export** — see `SUBMISSION.md` for the full writeup of all three.

## Data model

```
User             id, email, name
Document         id, title, content (Tiptap JSON), ownerId → User
DocumentShare    id, documentId → Document, userId → User, permission (VIEW | EDIT)
                 unique on (documentId, userId) — one share row per person per document
DocumentVersion  id, documentId → Document, title, content (Tiptap JSON snapshot), createdAt
Comment          id, documentId → Document, authorId → User, content, createdAt
```

(`DocumentVersion` and `Comment` back the two stretch features added later — full details in
`SUBMISSION.md`.)

`content` is stored as Tiptap's document JSON (not HTML) so it round-trips through the editor
without a lossy HTML conversion step. HTML only appears transiently during file import
(`.docx`/`.md` → HTML → Tiptap JSON via `@tiptap/html/server`).

## Request flow / where logic lives

- **Server Components** (`app/documents/page.tsx`, `app/documents/[id]/page.tsx`) query Prisma
  directly and pass serialized data down — no client-side fetch needed just to render the
  initial page.
- **Route Handlers** (`app/api/**`) are the only place mutations happen. Every one:
  1. loads the current user from the session (`lib/auth.ts`),
  2. loads the document + its shares,
  3. calls `canAccess()` to get an access level, and gates the operation with `canRead` /
     `canWrite` / `canManage`,
  4. validates the request body with a zod schema shared with the client form
     (`lib/schemas.ts`),
  5. returns a consistent `{ error }` shape with an appropriate status code on failure.
- **Client components** (editor, dialogs) call these routes with `fetch`, never touch Prisma
  directly, and show a toast on failure.

## Autosave

The editor debounces content changes (800ms) and title changes (600ms) into `PATCH
/api/documents/[id]`, each independently, with a small save-state indicator ("Saving…" /
"Saved" / error) in the header. This is a simple, understandable mechanism appropriate for a
single-editor-at-a-time app; it is *not* meant to handle two people typing in the same
document simultaneously (see "what was cut" above).

## A note on the UI library

shadcn's current registry generates components on top of [Base UI](https://base-ui.com/)
rather than Radix. One of its `Select` component's `onValueChange` didn't fire reliably in
this app's usage (confirmed by direct instrumentation, not just observation) — I replaced it
with a plain native `<select>` wired through `react-hook-form`'s `register()` in the Share
dialog, which is simpler and unambiguously correct for a two-field form like this one.
