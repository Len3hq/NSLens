# NS Lens

An AI-powered personal CRM built exclusively for verified [Network School](https://ns.com) members. NS Lens captures every person you meet, remembers what they're working on, and nudges you when it's time to reach back out.

## Features

- **Contact capture** — paste notes, forward a chat, or drop in a screenshot. The AI agent extracts contacts and the context behind them automatically.
- **Memory search** — ask your network in plain English: "Who do I know working on developer tools?" and get grounded answers with cited contacts.
- **Follow-ups & calendar** — schedule follow-ups and subscribe to a live calendar feed (Google, Apple, Outlook) so nothing falls through.
- **Priority signals** — starred contacts, AI-suggested tags, and a recency/frequency score surface who matters most.
- **Founders Hub** — post a question or opportunity; the system routes it to the people in your circle whose interests match.
- **Telegram & Discord bots** — full feature parity on both chat platforms. Capture contacts, run queries, and receive reminders without opening the web app.
- **Proactive reminders** — get nudged via Telegram or Discord DM when a relationship has gone stale.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7, Wouter, TanStack Query v5, shadcn/ui, Tailwind CSS v4 |
| Backend | Express 5, TypeScript (ESM), esbuild |
| Database | PostgreSQL + pgvector + Drizzle ORM |
| Auth | Discord OAuth2 + NS membership verification + JWT |
| AI / LLM | OpenAI (GPT for extraction, chat, tagging, intent routing) |
| Embeddings | OpenAI `text-embedding-3-small` (1536 dims, HNSW cosine index) |
| Object storage | Google Cloud Storage |
| Telegram | Webhook-based bot (Telegram Bot API) |
| Discord | Gateway bot (discord.js v14) |
| Monorepo | pnpm workspaces |
| Deployment | Docker + Railway |

## Repository layout

```
/
├── artifacts/
│   ├── api-server/        Express API server
│   └── web/               React frontend (Vite)
├── lib/
│   ├── api-client-react/  Auto-generated TanStack Query hooks (Orval)
│   ├── api-zod/           Zod schemas generated from OpenAPI spec
│   └── db/                Drizzle schema, migrations, client
├── Dockerfile             Multi-stage build (web + API → single image)
├── railway.toml           Railway deployment config
└── .env.example           All environment variables documented
```

## Prerequisites

- Node.js 22+
- pnpm 9+
- PostgreSQL with the `pgvector` extension enabled
- A Discord application (OAuth2 + Bot token) — [discord.com/developers](https://discord.com/developers)
- An NS Auth API key from [ns.com/platform](https://ns.com/platform)
- An OpenAI API key

## Local development

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in all values. Key ones for local dev:

```env
PORT=3002
NODE_ENV=development

DATABASE_URL=postgresql://user:password@localhost:5432/nslens

DISCORD_CLIENT_ID=<your Discord app client ID>
DISCORD_CLIENT_SECRET=<your Discord app client secret>
DISCORD_REDIRECT_URI=http://localhost:3002/api/auth/discord/callback

NS_AUTH_API_KEY=<your nsauth_... key>
DISCORD_BOT_TOKEN=<your bot token>
SESSION_SECRET=<random 32-byte hex: openssl rand -hex 32>

OPENAI_API_KEY=sk-...

# Leave blank so the Vite proxy handles /api routing
VITE_API_URL=
ALLOWED_ORIGINS=
```

> Register `http://localhost:3002/api/auth/discord/callback` as a redirect URI in your Discord app's OAuth2 settings.

### 3. Set up the database

```bash
# Enable pgvector (run once in psql)
psql $DATABASE_URL -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Run migrations
pnpm --filter @workspace/db run migrate
```

### 4. Start the API server

```bash
pnpm --filter @workspace/api-server run dev
```

The API server starts on `http://localhost:3002`.

### 5. Start the frontend

In a separate terminal, with `PORT` and `BASE_PATH` set (required by Vite):

```bash
PORT=22333 BASE_PATH=/ pnpm --filter @workspace/web run dev
```

The web app is available at `http://localhost:22333`. API calls are proxied through Vite to the API server automatically (no CORS issues in dev).

### Seed mock data

Once logged in, use the Dashboard seed button, or hit the API directly:

```bash
curl -X POST http://localhost:3002/api/dev/seed \
  -H "Authorization: Bearer <your JWT>"
```

## Production deployment (Railway)

The project ships as a single Docker image serving both the React frontend (as static files) and the Express API.

### Required environment variables in Railway

| Variable | Value |
|---|---|
| `PORT` | `8080` (Railway injects this automatically) |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Your Railway Postgres connection string |
| `DISCORD_CLIENT_ID` | From Discord Developer Portal |
| `DISCORD_CLIENT_SECRET` | From Discord Developer Portal |
| `DISCORD_REDIRECT_URI` | `https://<your-domain>/api/auth/discord/callback` |
| `DISCORD_BOT_TOKEN` | From Discord Developer Portal → Bot |
| `NS_AUTH_API_KEY` | From ns.com/platform |
| `SESSION_SECRET` | Random 32-byte hex |
| `OPENAI_API_KEY` | Your OpenAI key |
| `PUBLIC_APP_URL` | `https://<your-domain>` |
| `PUBLIC_API_URL` | `https://<your-domain>` |
| `ALLOWED_ORIGINS` | `https://<your-domain>` (or leave unset to allow all) |

> `DISCORD_REDIRECT_URI` must be registered exactly in your Discord app's OAuth2 → Redirects list.

### Optional environment variables

| Variable | Purpose |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Enables Telegram bot integration |
| `OPENAI_BASE_URL` | Override OpenAI endpoint (LiteLLM, Azure, etc.) |
| `GOOGLE_APPLICATION_CREDENTIALS` | Path to GCS service account JSON |
| `PRIVATE_OBJECT_DIR` | GCS bucket path for private uploads |
| `PUBLIC_OBJECT_SEARCH_PATHS` | GCS bucket paths for public assets |
| `LOG_LEVEL` | `trace` / `debug` / `info` / `warn` / `error` (default: `info`) |

### Build & deploy

```bash
# Build the Docker image locally
docker build -t nslens .

# Run it
docker run -p 8080:8080 --env-file .env.local nslens
```

Railway builds the image automatically on every push to `main` using the `Dockerfile` at the project root.

## Authentication flow

1. User clicks **Sign in** → **Continue with Discord** → redirected to Discord OAuth consent screen.
2. Discord redirects back to `/api/auth/discord/callback` with an authorization code.
3. Server exchanges the code for a Discord access token, fetches the user's Discord profile.
4. Server calls the NS Auth API to verify the user is an active NS member.
5. On success, the user is upserted in the database and a 7-day JWT is issued.
6. The browser is redirected to `/auth/callback#token=<JWT>`, which stores the token in `localStorage`.
7. All subsequent API calls include `Authorization: Bearer <token>`.

## API overview

All authenticated routes require `Authorization: Bearer <JWT>`.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/auth/discord` | Start Discord OAuth flow |
| `GET` | `/api/auth/discord/callback` | OAuth callback — issues JWT |
| `GET` | `/api/me` | Current user profile |
| `GET` | `/api/dashboard` | Stats, recent contacts, interactions |
| `GET/POST` | `/api/contacts` | List / create contacts |
| `GET/PATCH/DELETE` | `/api/contacts/:id` | Contact detail / update / delete |
| `POST` | `/api/ingest/text` | Extract contacts from free text |
| `POST` | `/api/ingest/image` | Extract contacts from an image |
| `POST` | `/api/chat` | Natural-language memory query |
| `POST` | `/api/agent` | Intent-routing agent (ingest / query / hub post / follow-up) |
| `GET/POST` | `/api/hub` | Founders Hub feed / create post |
| `GET` | `/api/hub/:id` | Public single post view |
| `GET/POST` | `/api/followups` | List / create follow-ups |
| `GET` | `/api/notifications` | Notification inbox |
| `POST` | `/api/reminders/run` | Evaluate stale contacts and queue reminders |
| `GET` | `/api/me/calendar` | Get calendar subscribe URLs |
| `GET` | `/api/calendar/:token.ics` | Public iCal feed |

Dev-only (disabled in production):

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/dev/seed` | Seed realistic mock data |
| `POST` | `/api/dev/seed/clear` | Wipe all data for current user |

## Monorepo commands

```bash
# Type-check everything
pnpm run typecheck

# Build everything (web + API)
pnpm run build

# Build only the API
pnpm --filter @workspace/api-server run build

# Build only the frontend
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/web run build
```

> Always use `pnpm`. An npm/yarn preinstall guard will reject other package managers.

## License

MIT
