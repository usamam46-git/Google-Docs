# AI Workflow Note

> **Note:** `SUBMISSION.md` contains an updated version of this note that also covers the
> second work pass (version history, comments, Markdown export) and a dialog-caching bug found
> while testing them. This file is kept as the original note from the first pass.

## Which AI tools were used

The entire implementation was built with **Claude Code** (Sonnet 5) in a single agentic
session: planning, scaffolding, writing every file, running the dev/build/test commands,
debugging in a real browser (via the Claude-in-Chrome browser tool), and querying the
database directly to verify behavior.

## Where AI materially sped things up

- **Boilerplate that has one obviously-correct shape**: the 8 Route Handlers (documents CRUD,
  share, revoke, import), the Prisma schema, and the zod schemas were generated in one pass
  and were correct on the first typecheck. This is exactly the kind of code where AI
  generation is fastest and safest — the pattern repeats and the constraints (auth check →
  access check → validate → mutate → respond) are explicit.
- **Reading unfamiliar/very new library internals under time pressure.** This project landed
  on Next.js 16, Prisma 6, Zod 4, and a shadcn/ui generation built on Base UI (not Radix) —
  all newer than the assistant's training data. Rather than guessing at APIs, Claude Code
  read the framework's own bundled docs (`node_modules/next/dist/docs`) and the actual
  `@base-ui/react` source/type definitions when something didn't behave as expected. That's
  slower than writing from memory but avoided shipping code against an imagined API.
- **End-to-end verification loop.** Claude Code drove a real Chrome tab to log in as each
  seeded user, create/edit/format documents, import a real generated `.docx` and `.md` file,
  open the share dialog, and revoke access — then cross-checked the results against the
  Postgres database directly. Catching a real bug this way (see below) would have been much
  slower to find by reading code alone.

## What AI-generated output was changed or rejected

- **Quill → Tiptap.** The task brief suggested Quill "or a better" editor; before writing any
  editor code, Claude Code flagged that Quill has known `findDOMNode` friction under React 18+
  strict mode in Next.js and recommended Tiptap instead. This was proposed and confirmed
  before implementation, not swapped in afterward.
- **A shadcn `Select` component was replaced with a native `<select>`.** The Share dialog's
  "choose a person" dropdown initially used shadcn's generated `Select` (built on Base UI).
  It visually appeared to select a value but the underlying form state never updated —
  confirmed by adding temporary `console.log`s inside the `onValueChange` callback and
  observing they *never fired* despite the UI showing a selection, then confirming via a
  direct `fetch()` to the API (bypassing the UI) that the backend logic was correct. Rather
  than fight an unfamiliar, very new component library's internals under time pressure, the
  dropdown was rewritten as a plain native `<select>` wired through `react-hook-form`, which
  is simpler, and confirmed correct immediately.
- **Prisma version pin.** `npm install prisma@latest` pulled in a version whose CLI had a
  broken transitive dependency (`effect@^4.0.0-rc.114`, which doesn't exist on npm). This was
  caught immediately from the install error and pinned to the latest *stable* 6.x release
  instead of a newer prerelease-adjacent line.
- **Dialog/dropdown trigger pattern.** Some Base-UI-backed trigger buttons occasionally didn't
  open on the very first click after a fresh page load in automated testing. After
  instrumenting real pointer/click events to confirm the click itself was firing correctly
  (ruling out an event-dispatch problem), the remaining explanation was React hydration
  timing rather than a car in the app logic — every dialog in this app is already externally
  controlled (`open`/`onOpenChange` state), so the trigger buttons were simplified to plain
  `<button onClick={() => setOpen(true)}>` elements, removing a layer of indirection that
  wasn't adding value.

## How correctness, UX quality, and reliability were verified

- `npx tsc --noEmit` after every meaningful change (caught the Prisma `Json` type mismatch
  and the Base UI `render`-prop typing immediately).
- `npx vitest run` for the access-control unit tests.
- A full production build (`next build && next start`) — not just `next dev` — was used to
  confirm behavior wasn't a dev-only artifact before concluding a bug was real.
- Manual, real-browser walkthroughs as all three seeded users: creating a document, applying
  every formatting option, renaming, reloading to confirm persistence, importing a real
  `.docx` and `.md` file, sharing with both `View` and `Edit` permissions, and confirming
  from the *server* (not just the grayed-out UI) that a `VIEW`-only user's direct `PATCH`
  request is rejected with 403 — i.e. the permission check was tested as a security boundary,
  not just a UI affordance.
- Direct Postgres queries (via a throwaway Node script) to confirm database state matched
  what the UI reported, rather than trusting the UI alone.

## What to take from this

The volume of "generated" code here is not the interesting part — a CRUD app with these
routes is a well-understood shape. The judgment calls were: catching a broken package version
before it wasted a build, refusing to guess at an unfamiliar library's API instead of reading
its source, and treating an unusual runtime behavior as a real bug worth root-causing (via
direct instrumentation and a production-build check) rather than working around it with a
retry or a wait — but still landing on the *simplest* fix (a native `<select>`, a plain
button) rather than a clever one.
