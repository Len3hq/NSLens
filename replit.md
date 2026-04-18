# Network Brain

Personal CRM web app: capture every person you meet, ask your network anything, get proactive reminders, and route opportunities through a shared Founders Hub.

## Stack

- **Monorepo**: pnpm workspace (`pnpm-workspace`).
- **Web**: React + Vite at `artifacts/web` (artifact id `artifacts/web`, base path `/`, port 22333). Routing via `wouter`. UI via shadcn/ui + Tailwind. State/data via `@tanstack/react-query` + generated hooks from `@workspace/api-client-react`.
- **API**: Express at `artifacts/api-server` (port 8080). Mounts `clerkMiddleware()`, all `/api/*` routes require auth.
- **DB**: Drizzle + Postgres (`@workspace/db`). Schemas in `lib/db/src/schema/{users,contacts,interactions,notifications,posts}.ts`. Run `pnpm --filter @workspace/db push` after schema changes.
- **API contract**: OpenAPI 3.1 in `lib/api-spec/openapi.yaml`. Codegen with `pnpm --filter @workspace/api-spec run codegen` produces TanStack Query hooks (`@workspace/api-client-react`) and zod schemas (`@workspace/api-zod`). The `api-zod` barrel only re-exports `generated/api` to avoid duplicate-export collisions.
- **Auth**: Clerk (managed). Web uses `@clerk/react` with `<ClerkProvider>` + branded `appearance`/`localization`. Server uses `@clerk/express`. Custom `requireAuth` middleware in `artifacts/api-server/src/lib/auth.ts` upserts the user record on first contact.
- **LLM**: Replit OpenAI integration (model `gpt-5.2`) via `artifacts/api-server/src/lib/openai.ts`. Used for entity extraction (text + image), memory chat answers, agent intent routing, and Hub relevance scoring.

## Phases (all implemented)

1. **Foundation** – Sign in/up, contacts CRUD, manual entry, text-extraction ingest, image-extraction ingest, per-contact interaction history.
2. **Memory layer** – `/api/chat` performs keyword search across contacts + interactions and grounds the LLM answer with sources.
3. **Proactive agents** – `/api/reminders/run` flags contacts not interacted with in `reminderDays` (default 21) and creates `stale_contact` notifications. Triggered manually from the dashboard ("Check reminders" button); ready to be scheduled.
4. **Agent router** – `/api/agent` classifies messages into INGEST | QUERY | POST | UNKNOWN and dispatches to the right backend. Lives at `/app/agent`. (Built in-app instead of Telegram/Discord, since the user wanted a working app first.)
5. **Founders Hub** – `/api/hub` posts fan out asynchronously: each post is matched against every other user's contacts via keyword overlap and an LLM relevance check, generating personalized `hub_match` notifications.

## Routes

- Frontend: `/` (landing), `/sign-in`, `/sign-up`, `/app` (dashboard), `/app/contacts`, `/app/contacts/:id`, `/app/chat`, `/app/agent`, `/app/hub`, `/app/notifications`.
- Backend: see `lib/api-spec/openapi.yaml`. All routes are mounted in `artifacts/api-server/src/routes/index.ts`.

## Important Conventions

- Generated client (`customFetch`) returns the raw response body, **not** an axios-style `{data}` wrapper. Use `data` from `useQuery` directly.
- `IngestResult.tags` schema is required and defaults to `[]` server-side.
- Schema names that would collide with orval's auto-derived operation body types (e.g. `AddInteractionBody`) are renamed to `XxxInput` to keep generation clean.
