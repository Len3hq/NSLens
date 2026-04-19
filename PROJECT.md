# NSLens — Network Brain

A personal CRM web app that lets you capture every person you meet, query your network conversationally, receive proactive reminders, and route opportunities through a shared Founders Hub.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Repository Structure](#repository-structure)
4. [Database Schema](#database-schema)
5. [API Routes](#api-routes)
6. [Features](#features)
7. [Dependencies](#dependencies)
8. [Environment Variables & Secrets](#environment-variables--secrets)
9. [Setup & Installation](#setup--installation)
10. [Development Workflow](#development-workflow)
11. [Codegen](#codegen)
12. [Key Conventions](#key-conventions)

---

## Overview

NSLens ("Network Brain") is a full-stack monorepo application that functions as an AI-powered personal CRM. Core capabilities:

- **Capture** contacts from free-form text or screenshots (AI entity extraction)
- **Query** your network in natural language ("Who did I meet at the conference who works in AI?")
- **Proactive reminders** when you haven't interacted with someone recently
- **Founders Hub** — a shared feed where connections post opportunities and AI matches them to relevant people in your network
- **Telegram bot** integration for on-the-go network management via chat

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   pnpm Monorepo                          │
│                                                          │
│  artifacts/                                              │
│  ├── web/              React + Vite frontend (port 22333)│
│  ├── api-server/       Express API backend (port 8080)   │
│  ├── mockup-sandbox/   UI component sandbox              │
│  └── ns-lens-pitch/    Pitch deck app (React slides)     │
│                                                          │
│  lib/                                                    │
│  ├── db/               Drizzle ORM + Postgres schemas    │
│  ├── api-spec/         OpenAPI 3.1 contract              │
│  ├── api-client-react/ Generated TanStack Query hooks    │
│  └── api-zod/          Generated Zod validation schemas  │
└─────────────────────────────────────────────────────────┘
```

**Tech stack at a glance:**

| Layer       | Technology                                       |
|-------------|--------------------------------------------------|
| Frontend    | React 19, Vite 7, Wouter (routing), shadcn/ui, Tailwind CSS 4, TanStack Query |
| Backend     | Express 5, TypeScript (ESM)                      |
| Database    | PostgreSQL + Drizzle ORM                         |
| Auth        | Clerk (`@clerk/react` + `@clerk/express`)        |
| AI / LLM    | OpenAI SDK — model `gpt-5.2` for extraction, chat, embeddings |
| Embeddings  | `@xenova/transformers` + `onnxruntime-node` (local inference) |
| Object storage | Google Cloud Storage via Replit sidecar       |
| Telegram    | Bot webhook (`TELEGRAM_BOT_TOKEN`)               |
| Monorepo    | pnpm workspaces                                  |
| Codegen     | Orval (OpenAPI → TanStack Query hooks + Zod)     |

---

## Repository Structure

```
NSLens/
├── package.json                   # Root workspace scripts & devDependencies
├── pnpm-workspace.yaml            # Workspace config, catalog versions, security settings
├── tsconfig.base.json             # Shared TypeScript base config
├── tsconfig.json                  # Root TS project references
│
├── artifacts/
│   ├── web/                       # React + Vite frontend
│   │   ├── src/
│   │   │   ├── App.tsx            # Root component, ClerkProvider, ClerkAuthBridge
│   │   │   ├── pages/             # Route pages (dashboard, contacts, hub, chat, agent…)
│   │   │   └── components/        # Shared UI components
│   │   └── package.json
│   │
│   ├── api-server/                # Express API
│   │   ├── src/
│   │   │   ├── index.ts           # Entry point, server bootstrap
│   │   │   ├── app.ts             # Express app setup, Clerk middleware, CORS
│   │   │   ├── routes/            # All API route handlers (see API Routes section)
│   │   │   └── lib/
│   │   │       ├── auth.ts        # requireAuth middleware, user upsert
│   │   │       ├── openai.ts      # OpenAI client, entity extraction, chat, embeddings
│   │   │       ├── aiTags.ts      # AI-powered contact tag suggestion
│   │   │       ├── embeddings.ts  # Local embedding inference
│   │   │       ├── telegram.ts    # Telegram bot helpers
│   │   │       ├── telegramQueue.ts # Batched Telegram notification delivery
│   │   │       ├── objectStorage.ts # GCS helpers (upload, download, presigned URLs)
│   │   │       └── objectAcl.ts   # Object access control
│   │   └── package.json
│   │
│   ├── mockup-sandbox/            # Isolated Vite app for UI component prototyping
│   └── ns-lens-pitch/             # React-based pitch deck (slide components)
│
├── lib/
│   ├── db/
│   │   ├── src/
│   │   │   ├── index.ts           # Drizzle client export
│   │   │   └── schema/
│   │   │       ├── users.ts
│   │   │       ├── contacts.ts
│   │   │       ├── interactions.ts
│   │   │       ├── notifications.ts
│   │   │       ├── posts.ts       # Founders Hub posts
│   │   │       ├── friendships.ts
│   │   │       └── followups.ts
│   │   └── drizzle.config.ts
│   │
│   ├── api-spec/
│   │   ├── openapi.yaml           # Source-of-truth API contract (OpenAPI 3.1)
│   │   └── orval.config.ts        # Codegen configuration
│   │
│   ├── api-client-react/
│   │   └── src/
│   │       ├── generated/         # Auto-generated TanStack Query hooks & schemas
│   │       ├── custom-fetch.ts    # Fetch wrapper with Clerk auth header injection
│   │       └── index.ts
│   │
│   └── api-zod/
│       └── src/
│           └── generated/types/   # Auto-generated Zod types from OpenAPI spec
│
├── scripts/                       # Utility scripts
├── attached_assets/               # Phase planning documents
└── .npmrc                         # pnpm security config (minimumReleaseAge: 1440 min)
```

---

## Database Schema

All tables are managed via Drizzle ORM (`lib/db/`) against a PostgreSQL instance.

### `users`
| Column | Type | Notes |
|--------|------|-------|
| `id` | text PK | Clerk user ID |
| `email` | text | |
| `name` | text | |
| `full_name` | text | |
| `username` | text | unique |
| `telegram_username` | text | |
| `x_username` | text | |
| `discord_username` | text | |
| `reminder_days` | integer | Default 21 — staleness threshold |
| `telegram_chat_id` | text | Linked Telegram chat |
| `telegram_link_code` | text | Short linking code |
| `telegram_link_code_expires_at` | timestamp | |
| `telegram_awaiting_more` | boolean | Batched notification gate |
| `calendar_feed_token` | text | Opaque iCal auth token |
| `created_at` | timestamp | |

### `contacts`
Core CRM entity. Stores name, handles (email, telegram, x, discord), tags, notes, `starred` boolean, and embedding vector for semantic search.

### `interactions`
Records of contact interactions (meetings, calls, messages). Has a `content` field and a vector embedding for memory-layer search.

### `notifications`
Notification inbox. Types include `stale_contact`, `followup_due`, and `hub_match`. Stores `telegramText`, `telegramQueued`, `telegramSentAt` for the Telegram queue.

### `posts` (Founders Hub)
Hub posts with `text`, `attachments` (JSONB array of `PostAttachment`), and `searchableText` (enriched by AI — image descriptions + link previews). Used for semantic matching to contacts.

### `friendships`
Tracks mutual "follow" relationships between users enabling the Founders Hub fan-out.

### `followups`
Scheduled follow-up tasks: `dueAt`, `note`, `source`, `completedAt`. Feeds the iCal export.

---

## API Routes

All routes are prefixed `/api` and require Clerk auth (except `/healthz`, `/calendar/<token>.ics`, and public storage).

| Route | Description |
|-------|-------------|
| `GET /healthz` | Health check |
| `GET /me` | Current user profile |
| `GET /dashboard` | Dashboard summary |
| **Contacts** | |
| `GET /contacts` | List contacts (supports `?q=` search) |
| `POST /contacts` | Create contact |
| `GET /contacts/:id` | Contact detail |
| `PATCH /contacts/:id` | Update contact |
| `DELETE /contacts/:id` | Delete contact |
| `POST /contacts/:id/star` | Toggle star |
| `POST /contacts/:id/suggest-tags` | AI tag suggestions |
| `GET /contacts/priority` | Priority-ranked contacts |
| **Interactions** | |
| `POST /contacts/:id/interactions` | Add interaction |
| `GET /contacts/:id/interactions` | List interactions |
| **Ingest** | |
| `POST /ingest/text` | AI-extract contact from free text |
| `POST /ingest/image` | AI-extract contact from image |
| **Chat / Memory** | |
| `POST /chat` | Natural-language memory query |
| **Agent** | |
| `POST /agent` | Intent router → INGEST/QUERY/POST/FOLLOWUP/PRIORITY/TAG |
| **Notifications** | |
| `GET /notifications` | List notifications |
| `POST /notifications/:id/read` | Mark read |
| **Reminders** | |
| `POST /reminders/run` | Evaluate stale contacts & due follow-ups |
| **Founders Hub** | |
| `GET /hub` | List posts |
| `POST /hub` | Create post (with attachments) |
| `GET /hub/:id` | Single post (public) |
| **Follow-ups** | |
| `GET /followups` | List open follow-ups |
| `GET /contacts/:id/followups` | Contact-specific follow-ups |
| `POST /followups` | Create follow-up |
| `POST /followups/:id/complete` | Complete follow-up |
| **Friends** | |
| `GET /friends` | List friends |
| `POST /friends/:userId` | Add friend |
| `DELETE /friends/:userId` | Remove friend |
| **Telegram** | |
| `POST /telegram/webhook` | Inbound Telegram messages |
| `POST /me/telegram/link` | Generate linking code |
| `DELETE /me/telegram/unlink` | Unlink Telegram |
| `GET /me/telegram/status` | Link status |
| **Calendar** | |
| `GET /me/calendar` | Get iCal subscribe URLs |
| `POST /me/calendar/rotate` | Rotate calendar token |
| `GET /calendar/:token.ics` | Public iCal feed |
| **Storage** | |
| `POST /storage/uploads/request-url` | Presigned GCS upload URL |
| `GET /storage/objects/*` | Auth-gated object download |
| `GET /storage/public-objects/*` | Public object access |

---

## Features

### 1. Contact Management
- Full CRUD with tagging, starring, and priority scoring
- Priority formula: `(starred × 3) + log(interaction_count) + recency_decay(90 days)`
- AI tag suggestions run automatically on contact creation (background job)

### 2. AI Ingestion
- **Text** — paste notes, email threads, or conversation transcripts; GPT extracts name, project, context, date, handles
- **Image** — upload LinkedIn screenshots or business card photos; GPT Vision extracts structured data

### 3. Memory Layer (Chat)
- `POST /chat` performs keyword search across contacts + interactions
- LLM answers are grounded with source citations (which contacts/interactions matched)

### 4. Proactive Reminders
- `POST /reminders/run` scans for contacts not interacted with in `reminderDays` (default 21)
- Creates `stale_contact` notifications; also surfaces due follow-ups as `followup_due`
- Queues Telegram messages for linked users

### 5. Agent Router
- Single `POST /agent` endpoint that classifies intent: `INGEST | QUERY | POST | FOLLOWUP_SET | FOLLOWUP_LIST | PRIORITY | TAG_LIST | UNKNOWN`
- Used by both the in-app Agent UI and the Telegram bot webhook

### 6. Founders Hub
- Shared post feed between connected users
- Posts support text + multiple attachments (images, videos, files, links)
- **Background enrichment**: images described by GPT Vision; links scraped for og metadata (SSRF-hardened — RFC1918/loopback/link-local blocked)
- Enriched text is embedded and run through `similarContacts` (similarity floor 0.2) + LLM relevance pass → personalized `hub_match` notifications
- **Handle-based identity match**: if post author's handles match a user's contact card, that user is force-added to the match list with `score=1`

### 7. Telegram Integration
- Bot webhook auto-registers on server startup
- Per-user linking via `/start <CODE>` flow
- Free-text messages route through `runAgent()` for the same intent classification
- Slash commands: `/start`, `/help`, `/reminders`, `/unlink`, `/followups`, `/priority`, `/tag <name>`
- Batched delivery: max 3 notifications per flush; overflow triggers "You have N more, reply YES" gate

### 8. Follow-ups
- Schedulable tasks with due dates and notes
- Deduped in reminders via `followup_due:<id>` key
- Full iCal feed (`text/calendar`) for Google/Apple/Outlook subscription — no OAuth needed

### 9. Calendar Feed
- Per-user opaque token-based iCal endpoint
- Returns all follow-ups as `VEVENT` entries (30-min default duration)
- Token can be rotated via `POST /me/calendar/rotate`

---

## Dependencies

### Root (devDependencies)
| Package | Version | Purpose |
|---------|---------|---------|
| `typescript` | ~5.9.2 | TypeScript compiler |
| `prettier` | ^3.8.1 | Code formatting |

### API Server (`artifacts/api-server`)
| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^5 | HTTP server framework |
| `@clerk/express` | ^2.1.4 | Server-side auth middleware |
| `drizzle-orm` | catalog | ORM for Postgres queries |
| `openai` | ^6.34.0 | GPT-4o / gpt-5.2 for AI features |
| `@xenova/transformers` | ^2.17.2 | Local embedding inference |
| `onnxruntime-node` | ^1.14.0 | ONNX model runtime |
| `@google-cloud/storage` | ^7.19.0 | GCS object storage |
| `google-auth-library` | ^10.6.2 | GCP authentication |
| `http-proxy-middleware` | ^3.0.5 | Clerk proxy middleware |
| `pino` / `pino-http` | ^9 / ^10 | Structured logging |
| `sharp` | ^0.34.5 | Image processing |
| `cookie-parser` | ^1.4.7 | Cookie parsing |
| `cors` | ^2 | CORS headers |
| `@workspace/api-zod` | workspace | Zod validation types |
| `@workspace/db` | workspace | Drizzle DB client & schemas |

### Database Library (`lib/db`)
| Package | Version | Purpose |
|---------|---------|---------|
| `drizzle-orm` | catalog | ORM |
| `drizzle-zod` | ^0.8.3 | Zod schema generation from Drizzle |
| `drizzle-kit` | ^0.31.9 | Migrations & schema push |
| `pg` | ^8.20.0 | PostgreSQL client |
| `zod` | catalog | Schema validation |

### Frontend (`artifacts/web`) — via workspace catalog
| Package | Version | Purpose |
|---------|---------|---------|
| `react` | 19.1.0 | UI library |
| `react-dom` | 19.1.0 | DOM renderer |
| `vite` | ^7.3.0 | Build tool & dev server |
| `@vitejs/plugin-react` | ^5.0.4 | React fast refresh |
| `@tailwindcss/vite` | ^4.1.14 | Tailwind CSS v4 |
| `tailwindcss` | ^4.1.14 | Utility CSS framework |
| `@tanstack/react-query` | ^5.90.21 | Server state & data fetching |
| `@clerk/react` | — | Client-side auth |
| `wouter` | — | Lightweight client routing |
| `lucide-react` | ^0.545.0 | Icon library |
| `framer-motion` | ^12.23.24 | Animations |
| `clsx` | ^2.1.1 | Conditional class names |
| `tailwind-merge` | ^3.3.1 | Tailwind class merging |
| `class-variance-authority` | ^0.7.1 | Component variant helpers |
| `zod` | catalog | Form & input validation |
| `@workspace/api-client-react` | workspace | Generated API hooks |

### API Spec & Codegen (`lib/api-spec`)
| Package | Purpose |
|---------|---------|
| `orval` | Generates TanStack Query hooks + Zod types from OpenAPI |

---

## Environment Variables & Secrets

Set these as environment variables or Replit secrets:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `CLERK_SECRET_KEY` | Yes | Clerk server-side secret |
| `CLERK_PUBLISHABLE_KEY` | Yes | Clerk client-side key |
| `OPENAI_API_KEY` | Yes | OpenAI API key (used for GPT entity extraction, chat, embeddings) |
| `TELEGRAM_BOT_TOKEN` | Yes | Telegram Bot API token |
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | Yes | GCS bucket ID |
| `PRIVATE_OBJECT_DIR` | Yes | GCS directory for private objects |
| `PUBLIC_OBJECT_SEARCH_PATHS` | Yes | GCS paths for public object access |
| `ALLOWED_ORIGINS` | **Required in production** | Comma-separated list of allowed CORS origins (e.g. `https://app.yourdomain.com`). If unset, all origins are allowed (dev/Replit mode only). |
| `PUBLIC_API_URL` | No | Public API base URL (for Telegram webhook registration) |
| `PUBLIC_APP_URL` | No | Public frontend URL (used in Hub post links) |
| `REPLIT_DEV_DOMAIN` | No | Auto-set by Replit; fallback for `PUBLIC_API_URL` |

---

## Setup & Installation

### Prerequisites
- **Node.js** 20+
- **pnpm** 9+ (`npm install -g pnpm`)
- **PostgreSQL** instance (Supabase, Neon, Railway, or local Docker)

### Steps

```bash
# 1. Clone the repository
git clone git@github.com:Len3hq/NSLens.git
cd NSLens

# 2. Install all workspace dependencies
pnpm install

# 3. Configure environment variables
# Copy and fill in your secrets (see Environment Variables section above)
cp .env.example .env        # if provided, otherwise create .env manually

# 4. Push database schema to Postgres
pnpm --filter @workspace/db push

# 5. Start the API server (port 8080)
pnpm --filter @workspace/api-server dev

# 6. Start the frontend (port 22333)
pnpm --filter @workspace/web dev
```

### Running on Replit
The project includes `.replit` and `pnpm-workspace.yaml` configured for Replit's environment. Simply open the project in Replit and hit **Run** — the `.replit` config starts both the API server and the web frontend.

---

## Development Workflow

### Schema Changes
After editing any file in `lib/db/src/schema/`:
```bash
pnpm --filter @workspace/db push
```

### API Contract Changes
After editing `lib/api-spec/openapi.yaml`:
```bash
pnpm --filter @workspace/api-spec run codegen
```
This regenerates:
- `lib/api-client-react/src/generated/` — TanStack Query hooks
- `lib/api-zod/src/generated/` — Zod validation types

### Type Checking
```bash
# Check all packages
pnpm typecheck

# Check only lib packages
pnpm typecheck:libs
```

### Building
```bash
pnpm build
```

### Individual package scripts
```bash
# Start API server in dev mode
pnpm --filter @workspace/api-server dev

# Start web frontend
pnpm --filter @workspace/web dev

# Force-push schema (drops and recreates if needed)
pnpm --filter @workspace/db push-force
```

---

## Codegen

The API contract lives in `lib/api-spec/openapi.yaml` and is the single source of truth. Orval (`lib/api-spec/orval.config.ts`) generates:

1. **`@workspace/api-client-react`** — TanStack Query hooks for every OpenAPI operation. The custom fetch wrapper in `custom-fetch.ts` reads the Clerk token via `getAuthTokenGetter()` and injects `Authorization: Bearer <token>` on every request. The web app wires this up in `App.tsx > ClerkAuthBridge` by calling `setAuthTokenGetter(getToken)`.

2. **`@workspace/api-zod`** — Zod schemas for request/response validation. The barrel `src/index.ts` re-exports only from `generated/api` to prevent duplicate-export collisions.

> **Note:** Follow-ups, calendar, priority, star, suggest-tags, and friends endpoints are not yet in the OpenAPI spec. The web app calls these directly via `customFetch`.

---

## Key Conventions

- **No `{data}` wrapper**: `customFetch` returns the raw response body. Use `data` from `useQuery` directly (not `data.data`).
- **`IngestResult.tags`** is always present and defaults to `[]` server-side.
- **Schema naming**: types that would collide with Orval's auto-derived operation body types are named `XxxInput` (e.g. `AddInteractionInput`) to keep codegen clean.
- **Auth flow**: every `/api/*` route requires a valid Clerk JWT. The `requireAuth` middleware in `api-server/src/lib/auth.ts` upserts the user row on first contact.
- **pnpm only**: the `preinstall` script blocks npm and yarn. Always use `pnpm`.
- **Supply-chain security**: `pnpm-workspace.yaml` sets `minimumReleaseAge: 1440` (24h) to guard against freshly-published malicious packages.
