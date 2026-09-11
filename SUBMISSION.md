# Submission Checklist

## Included in this folder

- [x] Source code (this repository)
- [x] `README.md` — local setup and run instructions, seeded test accounts
- [x] `ARCHITECTURE.md` — what was prioritized, what was cut, and why
- [x] `AI_WORKFLOW.md` — AI tool usage, what was changed/rejected, how correctness was verified
- [x] Automated test: `tests/access.test.ts` (`npm test`) — unit tests for the document
      permission logic (`lib/access.ts`)
- [ ] Live deployment URL — **not yet deployed**; this environment doesn't have your Vercel /
      Neon credentials. See "To finish deploying" below — it's a ~10 minute, mostly
      copy/paste process.
- [ ] Walkthrough video URL — record separately and drop the link in a text file per the
      assignment instructions.
- [ ] Screenshots/GIF — optional per the assignment; add if you want reviewers to see the UI
      without running it.

## What's working end to end (verified in a real browser + against the database directly)

- Sign in as any of 3 seeded users (no password)
- Create a document, format text (bold/italic/underline/H1–H3/bulleted+numbered lists), rename
  it, reload the page — content and title persist
- Import a `.txt`, `.md`, or `.docx` file into a new editable document
- Share a document with another user as View or Edit; revoke access
- Owned vs. shared documents are visually distinct on the dashboard
- A `VIEW`-permission user cannot edit — enforced both in the UI (read-only editor) and on the
  server (a direct API request to modify the document returns 403)
- An unrelated user gets a 404 for a document that isn't theirs and isn't shared with them
  (doesn't leak that the document exists)

## What's incomplete / not attempted

- **Real-time collaboration** (live cursors, concurrent-edit merging) — out of scope per the
  assignment's own guidance; autosave + last-write-wins is the implemented model.
- **Version history, comments/suggestions, export to PDF/Markdown** — none implemented (all
  were listed as optional stretch goals in the brief).
- **Deployment** — see above; needs your Vercel/Neon accounts.

## To finish deploying

1. Create a free Postgres database at [neon.tech](https://neon.tech) and copy its connection
   string.
2. From this project directory: `npx vercel login`, then `npx vercel` and follow the prompts
   to link/create a project.
3. In the Vercel project's environment variables, set:
   - `DATABASE_URL` — the Neon connection string
   - `SESSION_SECRET` — any random string, at least 32 characters
4. `npx vercel --prod` to deploy. The build runs `prisma migrate deploy` automatically.
5. Seed the production database once so reviewers see sample data immediately:
   `DATABASE_URL="<your neon connection string>" npm run db:seed` (run from your machine,
   pointed at the prod database — not against your local `.env`).
6. Visit the deployed URL, confirm you can sign in as the seeded accounts, and add that URL
   plus the seeded account emails to your submission.

## With another 2–4 hours, I would build next

- Markdown export (serialize the Tiptap document back to Markdown) — the cheapest high-value
  stretch given the import pipeline already parses Markdown.
- Soft-delete with an "undo" toast instead of permanent delete.
- A small "last edited by" indicator when a shared document has multiple editors.
