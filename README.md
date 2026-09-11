# Docs — Lightweight Collaborative Document Editor

A small Google-Docs-inspired editor: create/edit rich-text documents, import files, share
documents between users with view/edit permissions, and persist everything to Postgres.

Built with Next.js (App Router, Route Handlers as the Node/TS backend), Prisma + Postgres,
Tiptap, shadcn/ui, react-hook-form + zod.

## Features

- **Documents** — create, rename (inline), edit, autosave, reopen after refresh.
- **Rich text editing** (Tiptap) — bold, italic, underline, headings (H1–H3), bulleted and
  numbered lists.
- **File import** — upload `.txt`, `.md`/`.markdown`, or `.docx` (max 5MB) and it's converted
  into a new editable document. Unsupported types are rejected with a clear error, both in the
  upload UI and here.
- **Sharing** — the owner can share a document with another seeded user as `View` or `Edit`,
  and revoke access. The dashboard visually separates **My documents** from **Shared with me**,
  and shared documents show the granted permission.
- **Access control** — enforced both in the UI (read-only editor, no Share button for
  non-owners) and on every API route (`lib/access.ts`), not just the client.
- **Auth** — mocked: pick one of three seeded accounts, no password. Session is an httpOnly
  signed cookie ([iron-session](https://github.com/vvo/iron-session)).

## Tech stack

- **Next.js 16** (App Router) — pages/layouts are Server Components; Route Handlers under
  `app/api/*` are the Node.js/TypeScript backend (no separate server).
- **Prisma + PostgreSQL** — schema in `prisma/schema.prisma`.
- **Tiptap** (ProseMirror) — the rich text editor; document content is stored as Tiptap JSON.
- **shadcn/ui** (built on Base UI) + Tailwind CSS v4.
- **react-hook-form + zod** — forms and both client- and server-side validation
  (`lib/schemas.ts`).
- **mammoth** (.docx → HTML) and **marked** (.md → HTML), then converted to Tiptap JSON via
  `@tiptap/html/server` for import.
- **Vitest** — unit tests for the access-control logic.

## Local setup

### Prerequisites

- Node.js 20.9+ (project was built and tested on Node 24)
- A Postgres database. Easiest options:
  - **Docker**: `docker run -d --name docs-app-postgres -e POSTGRES_USER=docsapp -e POSTGRES_PASSWORD=docsapp -e POSTGRES_DB=docsapp -p 55432:5432 postgres:16-alpine`
  - Or a free [Neon](https://neon.tech) database (same connection string format).

### Steps

```bash
npm install

# copy the example env file and fill in real values
cp .env.example .env
```

Edit `.env`:

```bash
DATABASE_URL="postgresql://docsapp:docsapp@localhost:55432/docsapp?schema=public"
SESSION_SECRET="any random string, at least 32 characters"
```

```bash
npx prisma migrate dev   # creates the schema
npm run db:seed          # creates 3 seeded users + sample documents/shares
npm run dev              # http://localhost:3000
```

Visiting `/` redirects to `/login`, where you pick one of the seeded accounts.

### Seeded accounts (no password)

| Name | Email |
| --- | --- |
| Alice Chen | alice@ajaia.dev |
| Bob Martinez | bob@ajaia.dev |
| Carol Singh | carol@ajaia.dev |

The seed creates: Alice owns "Q3 Planning Notes" (shared with Bob as **Edit**, Carol as
**View**) and "Onboarding Guide" (not shared); Bob owns "Bob's Scratchpad". Sign in as each
user to see the owner/shared distinction and both permission levels immediately.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Runs `prisma migrate deploy` then `next build` (used for deploys) |
| `npm start` | Start the production server (after `build`) |
| `npm test` | Run the Vitest suite |
| `npm run db:seed` | Seed the database (safe to run once on a fresh DB) |
| `npm run db:migrate` | `prisma migrate dev`, for schema changes during development |

## Supported import file types

`.txt`, `.md`, `.markdown`, `.docx` — max 5MB. Anything else is rejected with a 400 and a
toast explaining the supported types.

## Deploying

The app is a standard Next.js app and deploys to Vercel with a Postgres database (e.g. Neon).

1. Create a Postgres database (e.g. a free [Neon](https://neon.tech) project) and copy its
   connection string.
2. `vercel login`, then `vercel` (or connect the repo in the Vercel dashboard) and set the
   environment variables `DATABASE_URL` and `SESSION_SECRET` in the Vercel project settings.
3. Vercel's build runs `npm run build`, which runs `prisma migrate deploy` automatically.
4. After the first deploy, seed the production database once:
   `DATABASE_URL="<your prod connection string>" npm run db:seed` (run locally, pointed at
   the prod DB) so reviewers see the sample owned/shared documents immediately.

See `ARCHITECTURE.md` for what was prioritized and why, and `AI_WORKFLOW.md` for how AI tools
were used while building this.
