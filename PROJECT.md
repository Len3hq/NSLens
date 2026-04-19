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

NSLens ("Network Brain") is a full-stack monorepo application that functions as an AI-powered personal CRM, built exclusively for verified Network School (NS) members. Core capabilities:

- **Capture** contacts from free-form text or screenshots (AI entity extraction)
- **Query** your network in natural language ("Who did I meet at the conference who works in AI?")
- **Proactive reminders** when you haven't interacted with someone recently
- **Founders Hub** — a shared feed where connections post opportunities and AI matches them to relevant people in your network
- **Telegram bot** integration for on-the-go network management via chat
- **Discord bot** integration — DM-based agent with the same full feature set as Telegram

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

| Layer          | Technology                                                                 |
|----------------|----------------------------------------------------------------------------|
| Frontend       | React 19.1, Vite 7, Wouter (routing), shadcn/ui, Tailwind CSS v4, TanStack Query v5 |
| Backend        | Express 5, TypeScript (ESM), esbuild                                       |
| Database       | PostgreSQL + Drizzle ORM + pgvector                                        |
| Auth           | Discord OAuth2 + NS membership verification + JWT (`jsonwebtoken`)         |
| AI / LLM       | OpenAI SDK — model `gpt-5.2` for extraction, chat, tag suggestion          |
| Embeddings     | `@xenova/transformers` + `onnxruntime-node` — local `all-MiniLM-L6-v2` (384 dims) |
| Object storage | Google Cloud Storage via `@google-cloud/storage`                           |
| Telegram       | Webhook-based bot (raw Telegram Bot API)                                   |
| Discord        | Gateway bot via `discord.js` v14                                           |
| Monorepo       | pnpm workspaces                                                            |
| Codegen        | Orval (OpenAPI 3.1 → TanStack Query hooks + Zod)                           |
| Logging        | Pino + pino-http                                                           |
| Security       | helmet, express-rate-limit, CORS allowlist                                 |

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
│   │   │   ├── App.tsx            # Root: WouterRouter, AuthProvider, QueryClientProvider
│   │   │   ├── lib/auth.tsx       # Custom JWT AuthContext (localStorage key: ns_auth_token)
│   │   │   ├── pages/
│   │   │   │   ├── Login.tsx          # "Continue with Discord" → /api/auth/discord
│   │   │   │   ├── AuthCallback.tsx   # Reads #token= from URL hash after OAuth redirect
│   │   │   │   ├── Dashboard.tsx      # Stats, contacts, interactions, Telegram card
│   │   │   │   ├── Contacts.tsx       # Contact list with search
│   │   │   │   ├── ContactDetail.tsx  # Contact detail, interactions, follow-ups, tags
│   │   │   │   ├── Chat.tsx           # Memory query chat interface
│   │   │   │   ├── Agent.tsx          # AI agent chat interface
│   │   │   │   ├── Hub.tsx            # Founders Hub feed + post composer
│   │   │   │   ├── Notifications.tsx  # Notification inbox
│   │   │   │   ├── FollowUps.tsx      # Follow-ups list
│   │   │   │   ├── Profile.tsx        # Profile edit + Friends search/management
│   │   │   │   └── PublicPost.tsx     # Public Hub post view (no auth required)
│   │   │   └── components/
│   │   │       ├── Layout.tsx         # App shell with sidebar nav
│   │   │       ├── TelegramCard.tsx   # Telegram link/unlink widget
│   │   │       └── ui/                # shadcn/ui components
│   │   └── package.json
│   │
│   ├── api-server/                # Express API
│   │   ├── src/
│   │   │   ├── index.ts           # Entry point: starts Express, registers Telegram webhook,
│   │   │   │                      #   starts Discord bot, runs embedding backfill
│   │   │   ├── app.ts             # Express setup: CORS, helmet, rate-limit, pino-http
│   │   │   ├── routes/
│   │   │   │   ├── index.ts           # Mounts all routers under /api
│   │   │   │   ├── auth.ts            # Discord OAuth (/auth/discord + callback) + NS membership verify
│   │   │   │   ├── me.ts              # GET/PATCH/DELETE /me, account deletion
│   │   │   │   ├── contacts.ts        # Full CRUD, tag suggestion background job
│   │   │   │   ├── interactions.ts    # Log and list interactions per contact
│   │   │   │   ├── ingest.ts          # Text + image AI extraction, persistEntities
│   │   │   │   ├── chat.ts            # /chat — RAG memory query
│   │   │   │   ├── agent.ts           # /agent — intent router + runAgent()
│   │   │   │   ├── hub.ts             # Hub posts CRUD + fanOutPost background enrichment
│   │   │   │   ├── reminders.ts       # evaluateReminders() — stale contacts + due follow-ups
│   │   │   │   ├── notifications.ts   # List + read notifications
│   │   │   │   ├── followups.ts       # Follow-up CRUD + complete
│   │   │   │   ├── friends.ts         # Friend search, add, remove
│   │   │   │   ├── telegram.ts        # Telegram webhook + link/unlink
│   │   │   │   ├── discord-bot.ts     # Discord bot status + disconnect routes
│   │   │   │   ├── priority.ts        # Priority-ranked contacts
│   │   │   │   ├── calendar.ts        # iCal feed generation and token management
│   │   │   │   ├── storage.ts         # GCS presigned upload URLs + object download
│   │   │   │   ├── dashboard.ts       # Dashboard summary endpoint
│   │   │   │   └── dev-seed.ts        # Mock data seeding + clearing (Dashboard UI)
│   │   │   └── lib/
│   │   │       ├── auth.ts            # requireAuth middleware — JWT verify + user existence check
│   │   │       ├── openai.ts          # OpenAI client (model: gpt-5.2)
│   │   │       ├── embeddings.ts      # Local transformer embeddings, similarContacts/Interactions,
│   │   │       │                      #   backfillEmbeddings on startup
│   │   │       ├── aiTags.ts          # suggestTags() — LLM tag generation
│   │   │       ├── chatHistory.ts     # Per-user chat history (100-message pruning, shared across surfaces)
│   │   │       ├── telegram.ts        # Bot helpers, webhook setup, message sending
│   │   │       ├── telegramQueue.ts   # Batched delivery (max 3/flush, "N more" gate)
│   │   │       ├── discordBot.ts      # Discord Gateway client, message handler, slash commands
│   │   │       ├── discordQueue.ts    # Batched Discord notification delivery (same pattern as Telegram)
│   │   │       ├── objectStorage.ts   # GCS helpers (presigned URLs, upload, download)
│   │   │       └── objectAcl.ts       # Object access control
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
│   │   │       ├── contacts.ts    # Includes vector(384) embedding + HNSW index
│   │   │       ├── interactions.ts # Includes vector(384) embedding + HNSW index
│   │   │       ├── notifications.ts # Telegram + Discord queue fields
│   │   │       ├── posts.ts       # Founders Hub posts
│   │   │       ├── friendships.ts
│   │   │       ├── followups.ts
│   │   │       └── chatHistory.ts # Persisted conversation history (web/Telegram/Discord)
│   │   └── drizzle.config.ts
│   │
│   ├── api-spec/
│   │   ├── openapi.yaml           # Source-of-truth API contract (OpenAPI 3.1)
│   │   └── orval.config.ts        # Codegen configuration
│   │
│   ├── api-client-react/
│   │   └── src/
│   │       ├── generated/         # Auto-generated TanStack Query hooks & schemas
│   │       ├── custom-fetch.ts    # Fetch wrapper injecting Authorization: Bearer <token>
│   │       └── index.ts
│   │
│   └── api-zod/
│       └── src/
│           └── generated/types/   # Auto-generated Zod types from OpenAPI spec
│
├── scripts/                       # Utility scripts
├── attached_assets/               # Phase planning documents (phases 1–5)
└── .npmrc                         # pnpm security config (minimumReleaseAge: 1440 min)
```

---

## Database Schema

All tables are managed via Drizzle ORM (`lib/db/`) against a PostgreSQL instance with the `pgvector` extension enabled.

### `users`
| Column | Type | Notes |
|--------|------|-------|
| `id` | text PK | Discord user ID |
| `email` | text | |
| `name` | text | Display name from Discord |
| `full_name` | text | |
| `username` | text | Unique (2–32 chars, no leading `@`) |
| `telegram_username` | text | |
| `x_username` | text | |
| `discord_username` | text | |
| `reminder_days` | integer | Default 21 — staleness threshold |
| `telegram_chat_id` | text | Linked Telegram chat |
| `telegram_link_code` | text | Short linking code |
| `telegram_link_code_expires_at` | timestamp | |
| `telegram_awaiting_more` | boolean | Batched notification gate |
| `discord_dm_channel_id` | text | Linked Discord DM channel |
| `discord_awaiting_more` | boolean | Batched Discord notification gate |
| `calendar_feed_token` | text | Opaque iCal auth token |
| `created_at` | timestamp | |

### `contacts`
Core CRM entity. Stores name, handles (email, telegram, x, discord), tags (`text[]`), starred boolean, `lastInteractionAt`, and a `vector(384)` embedding column (HNSW cosine index) for semantic search.

### `interactions`
Records of contact interactions (meetings, calls, messages). Has a `content` field, `source`, `occurredAt`, and a `vector(384)` embedding for memory-layer search.

### `chatHistory`
Persisted conversation history shared across web, Telegram, and Discord surfaces. Columns: `userId`, `role` (`user` | `assistant`), `content`, `source` (`web` | `telegram` | `discord`), `createdAt`. Pruned to the last 100 messages per user.

### `notifications`
Notification inbox. Types: `stale_contact`, `followup_due`, `hub_match`. Stores both `telegramText`/queue fields and `discordText`/queue fields for bot delivery.

### `posts` (Founders Hub)
Hub posts with `content`, `attachments` (JSONB `PostAttachment[]`), and `searchableText` (enriched by AI — image descriptions + link previews). Used for semantic matching to contacts.

### `friendships`
Tracks "follow" relationships between users enabling the Founders Hub fan-out. Unique constraint on `(userId, friendUserId)`. Optional `contactId` FK links the friend to a contact card in the adder's CRM.

### `followups`
Scheduled follow-up tasks: `dueAt`, `note`, `source` (default `manual`), `completedAt`. Feeds the iCal export.

---

## API Routes

All routes are prefixed `/api` and require a valid JWT (except `/healthz`, `/auth/discord*`, `/calendar/<token>.ics`, and public storage).

| Route | Description |
|-------|-------------|
| `GET /healthz` | Health check |
| **Auth** | |
| `GET /auth/discord` | Redirect to Discord OAuth consent screen |
| `GET /auth/discord/callback` | OAuth callback — verifies NS membership, issues JWT via URL hash |
| **Profile** | |
| `GET /me` | Current user profile |
| `PATCH /me` | Update profile (fullName, username, handles) |
| `DELETE /me` | Delete account (cascades all data) |
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
| `POST /ingest/text` | AI-extract contact(s) from free text (up to 20,000 chars) |
| `POST /ingest/image` | AI-extract contact from image (base64, up to 20MB) |
| **Chat / Memory** | |
| `POST /chat` | Natural-language memory query (RAG + chat history) |
| **Agent** | |
| `POST /agent` | Intent router → INGEST / QUERY / POST / FOLLOWUP_SET / FOLLOWUP_LIST / PRIORITY / TAG_LIST / UNKNOWN |
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
| `POST /friends/:userId` | Add friend (also creates a contact card) |
| `DELETE /friends/:userId` | Remove friend |
| **Telegram** | |
| `POST /telegram/webhook` | Inbound Telegram messages |
| `POST /me/telegram/link` | Generate linking code |
| `DELETE /me/telegram/unlink` | Unlink Telegram |
| `GET /me/telegram/status` | Link status |
| **Discord** | |
| `GET /me/discord-bot/status` | Discord bot connection status |
| `DELETE /me/discord-bot/disconnect` | Disconnect Discord bot |
| **Calendar** | |
| `GET /me/calendar` | Get iCal subscribe URLs |
| `POST /me/calendar/rotate` | Rotate calendar token |
| `GET /calendar/:token.ics` | Public iCal feed (no auth) |
| **Storage** | |
| `POST /storage/uploads/request-url` | Presigned GCS upload URL |
| `GET /storage/objects/*` | Auth-gated object download |
| `GET /storage/public-objects/*` | Public object access |

---

## Features

### 1. Contact Management
- Full CRUD with tagging (`text[]`), starring, and priority scoring
- Priority formula: `(starred × 3) + GREATEST(0, 1.0 - elapsed_seconds / (90 × 86400))`
- AI tag suggestions run automatically on contact creation (background job; atomic guard prevents clobbering user edits)

### 2. AI Ingestion
- **Text** — paste notes, email threads, or conversation transcripts; GPT extracts name, project, context, date, handles. Upserts on name match.
- **Image** — upload LinkedIn screenshots or business card photos; GPT Vision extracts structured data

### 3. Memory Layer (Chat)
- `POST /chat` performs keyword search across contacts + interactions
- LLM answers are grounded with source citations (which contacts/interactions matched)
- Chat history persists in the `chatHistory` table, shared across web, Telegram, and Discord

### 4. Proactive Reminders
- `POST /reminders/run` scans for contacts not interacted with in `reminderDays` (default 21)
- Creates `stale_contact` notifications; also surfaces due follow-ups as `followup_due`
- Queues messages for linked Telegram and Discord users

### 5. Agent Router
- Single `POST /agent` endpoint that classifies intent via LLM + conversation history
- Intent classes: `INGEST | QUERY | POST | FOLLOWUP_SET | FOLLOWUP_LIST | PRIORITY | TAG_LIST | UNKNOWN`
- Used by the in-app Agent UI, Telegram bot, and Discord bot

### 6. Founders Hub
- Shared post feed between connected users (friends)
- Posts support text + multiple attachments (images, videos, files, links)
- **Background enrichment**: images described by GPT Vision; links scraped for OG metadata (SSRF-hardened — RFC 1918, loopback, and link-local addresses blocked)
- Enriched text is embedded and run through `similarContacts` (cosine similarity ≥ 0.2) + LLM relevance pass → personalized `hub_match` notifications
- **Handle-based identity match**: if post author's handles match a user's contact card, that user is force-added to the match list with `score=1`

### 7. Telegram Integration
- Webhook-based bot; webhook auto-registers on server startup
- Per-user linking via `/start <CODE>` flow
- Free-text messages route through `runAgent()` for intent classification
- Slash commands: `/start`, `/help`, `/reminders`, `/unlink`, `/followups`, `/priority`, `/tag <name>`
- Batched delivery: max 3 notifications per flush; overflow triggers "You have N more, reply YES" gate
- Queue state persists in the `notifications` table

### 8. Discord Integration
- Gateway WebSocket bot via `discord.js` v14; starts on server boot
- Responds to DMs only (no guild commands)
- Same agent routing as Telegram
- DM slash commands: `/help`, `/followups`, `/priority`, `/tag <name>`, `/reminders`, `/disconnect`
- Hub posts via `/post` prefix, bare links, or attachments in DMs
- Batched delivery matching Telegram's pattern
- DM channel ID stored in `users.discordDmChannelId`

### 9. Follow-ups
- Schedulable tasks with due dates and notes
- Deduped in reminders via `followup_due:<id>` key
- Full iCal feed (`text/calendar`) for Google/Apple/Outlook subscription — no OAuth needed

### 10. Calendar Feed
- Per-user opaque token-based iCal endpoint
- Returns all follow-ups as `VEVENT` entries (30-min default duration)
- Token can be rotated via `POST /me/calendar/rotate`

### 11. Friends System
- Search other NS members by username, name, or handle
- Adding a friend creates a contact card in the adder's CRM
- Friendship enables Founders Hub fan-out (you receive `hub_match` notifications for friends' posts)

### 12. Local Vector Embeddings
- `Xenova/all-MiniLM-L6-v2` runs in-process via `@xenova/transformers` (384 dimensions)
- Stored in `pgvector` columns with HNSW cosine index on both `contacts` and `interactions`
- `backfillEmbeddings()` runs at server startup to populate any missing embeddings

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
| `jsonwebtoken` | — | JWT signing and verification (session auth) |
| `drizzle-orm` | catalog | ORM for Postgres queries |
| `openai` | ^6.34.0 | GPT-5.2 for AI features |
| `@xenova/transformers` | ^2.17.2 | Local embedding inference |
| `onnxruntime-node` | ^1.14.0 | ONNX model runtime |
| `@google-cloud/storage` | ^7.19.0 | GCS object storage |
| `google-auth-library` | ^10.6.2 | GCP authentication |
| `discord.js` | ^14 | Discord Gateway bot |
| `pino` / `pino-http` | ^9 / ^10 | Structured logging |
| `helmet` | — | HTTP security headers |
| `express-rate-limit` | — | Rate limiting |
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
| `DATABASE_URL` | Yes | PostgreSQL connection string (must have `pgvector` extension) |
| `DISCORD_CLIENT_ID` | Yes | Discord OAuth2 application client ID |
| `DISCORD_CLIENT_SECRET` | Yes | Discord OAuth2 application client secret |
| `DISCORD_REDIRECT_URI` | Yes | OAuth2 callback URL (e.g. `https://your-api/api/auth/discord/callback`) |
| `DISCORD_BOT_TOKEN` | Yes | Discord bot token (for Gateway + DM bot) |
| `NS_AUTH_API_KEY` | Yes | NS membership verification API key |
| `SESSION_SECRET` | Yes | Secret for signing JWT sessions (min 32 random chars) |
| `OPENAI_API_KEY` | Yes | OpenAI API key (used for GPT entity extraction, chat, tag suggestion) |
| `TELEGRAM_BOT_TOKEN` | Yes | Telegram Bot API token |
| `DEFAULT_OBJECT_STORAGE_BUCKET_ID` | Yes | GCS bucket ID |
| `PRIVATE_OBJECT_DIR` | Yes | GCS directory for private objects |
| `PUBLIC_OBJECT_SEARCH_PATHS` | Yes | GCS paths for public object access |
| `ALLOWED_ORIGINS` | Prod only | Comma-separated list of allowed CORS origins. If unset, all origins are allowed (dev mode). |
| `PUBLIC_API_URL` | No | Public API base URL (for Telegram webhook registration) |
| `PUBLIC_APP_URL` | No | Public frontend URL (used in Hub post links) |

---

## Setup & Installation

### Prerequisites
- **Node.js** 20+
- **pnpm** 9+ (`npm install -g pnpm`)
- **PostgreSQL** instance with `pgvector` extension (Supabase, Neon, Railway, or local Docker)

### Steps

```bash
# 1. Clone the repository
git clone git@github.com:Len3hq/NSLens.git
cd NSLens

# 2. Install all workspace dependencies
pnpm install

# 3. Configure environment variables
cp .env.example .env        # if provided, otherwise create .env manually
# Fill in all required secrets (see Environment Variables section above)

# 4. Push database schema to Postgres
pnpm --filter @workspace/db push

# 5. Start the API server (port 8080)
pnpm --filter @workspace/api-server dev

# 6. Start the frontend (port 22333)
pnpm --filter @workspace/web dev
```

### Running on Replit
The project includes `.replit` and `pnpm-workspace.yaml` configured for Replit's environment. Open the project in Replit and hit **Run** — the config starts both the API server and the web frontend.

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

1. **`@workspace/api-client-react`** — TanStack Query hooks for every OpenAPI operation. The custom fetch wrapper in `custom-fetch.ts` reads the JWT via `getAuthTokenGetter()` and injects `Authorization: Bearer <token>` on every request. The web app wires this up in `App.tsx` via the `AuthProvider` which calls `setAuthTokenGetter(getToken)` on mount.

2. **`@workspace/api-zod`** — Zod schemas for request/response validation. The barrel `src/index.ts` re-exports only from `generated/api` to prevent duplicate-export collisions.

> **Note:** Follow-ups, calendar, priority, star, suggest-tags, and friends endpoints are not yet in the OpenAPI spec. The web app calls these directly via `customFetch`.

---

## Key Conventions

- **No `{data}` wrapper**: `customFetch` returns the raw response body. Use `data` from `useQuery` directly (not `data.data`).
- **`IngestResult.tags`** is always present and defaults to `[]` server-side.
- **Schema naming**: types that would collide with Orval's auto-derived operation body types are named `XxxInput` (e.g. `AddInteractionInput`) to keep codegen clean.
- **Auth flow**: Discord OAuth2 → NS membership check (`nsProfile.member === true`) → 7-day JWT stored in `localStorage` under key `ns_auth_token`. Every `/api/*` route requires this JWT. The `requireAuth` middleware in `api-server/src/lib/auth.ts` verifies the token and checks the user row exists.
- **User identity**: the `users.id` PK is the Discord user ID (text), not a generated UUID.
- **Handles stored without `@`**: profile fields `telegramUsername`, `xUsername`, `discordUsername` strip leading `@` on save.
- **Bot parity**: Telegram and Discord bots expose identical feature sets. Both route through `runAgent()` and share the same `chatHistory` table.
- **pnpm only**: the `preinstall` script blocks npm and yarn. Always use `pnpm`.
- **Supply-chain security**: `pnpm-workspace.yaml` sets `minimumReleaseAge: 1440` (24h) to guard against freshly-published malicious packages.
- **Embedding backfill**: `backfillEmbeddings()` runs on every server start and is idempotent — safe to restart freely.
