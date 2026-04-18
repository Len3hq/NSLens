# Network Brain

Personal CRM web app: capture every person you meet, ask your network anything, get proactive reminders, and route opportunities through a shared Founders Hub.

## Stack

- **Monorepo**: pnpm workspace (`pnpm-workspace`).
- **Web**: React + Vite at `artifacts/web` (artifact id `artifacts/web`, base path `/`, port 22333). Routing via `wouter`. UI via shadcn/ui + Tailwind. State/data via `@tanstack/react-query` + generated hooks from `@workspace/api-client-react`.
- **API**: Express at `artifacts/api-server` (port 8080). Mounts `clerkMiddleware()`, all `/api/*` routes require auth.
- **DB**: Drizzle + Postgres (`@workspace/db`). Schemas in `lib/db/src/schema/{users,contacts,interactions,notifications,posts}.ts`. Run `pnpm --filter @workspace/db push` after schema changes.
- **API contract**: OpenAPI 3.1 in `lib/api-spec/openapi.yaml`. Codegen with `pnpm --filter @workspace/api-spec run codegen` produces TanStack Query hooks (`@workspace/api-client-react`) and zod schemas (`@workspace/api-zod`). The `api-zod` barrel only re-exports `generated/api` to avoid duplicate-export collisions.
- **Auth**: Clerk (managed). Web uses `@clerk/react` with `<ClerkProvider>` + branded `appearance`/`localization`. Server uses `@clerk/express`. Custom `requireAuth` middleware in `artifacts/api-server/src/lib/auth.ts` upserts the user record on first contact. The web app must call `setAuthTokenGetter()` from `@workspace/api-client-react` with Clerk's `getToken()` so every API request carries `Authorization: Bearer <token>` — without this, all `/api/*` calls return 401. This is wired in `App.tsx > ClerkAuthBridge`.
- **LLM**: Replit OpenAI integration (model `gpt-5.2`) via `artifacts/api-server/src/lib/openai.ts`. Used for entity extraction (text + image), memory chat answers, agent intent routing, and Hub relevance scoring.

## Phases (all implemented)

1. **Foundation** – Sign in/up, contacts CRUD, manual entry, text-extraction ingest, image-extraction ingest, per-contact interaction history.
2. **Memory layer** – `/api/chat` performs keyword search across contacts + interactions and grounds the LLM answer with sources.
3. **Proactive agents** – `/api/reminders/run` flags contacts not interacted with in `reminderDays` (default 21) and creates `stale_contact` notifications. Triggered manually from the dashboard ("Check reminders" button); ready to be scheduled.
4. **Agent router** – `/api/agent` classifies messages into INGEST | QUERY | POST | UNKNOWN and dispatches to the right backend. Lives at `/app/agent`. (Built in-app instead of Telegram/Discord, since the user wanted a working app first.)
5. **Founders Hub (multimedia)** – `/api/hub` posts can include text + multiple attachments (`PostAttachment[]` in `posts.attachments` jsonb): images, videos, files, and links. On create, posts are inserted immediately for snappy UX, then enriched in the background — images are described by GPT vision (`describeImage` over `publicObjectUrl`), links are scraped for og:title/description/image (`fetchLinkPreview`, hardened against SSRF: http(s) only, RFC1918/loopback/link-local blocked, post-redirect re-check). Enriched text is stored in `posts.searchableText` and used to embed the post and run `similarContacts` per recipient (sim floor 0.2), with a final LLM relevance pass that returns matched names → personalized `hub_match` notifications + Telegram pings.
   - **Handle-based identity match** (in `fanOutPost`): before the embedding pass, the fan-out runs an exact lower-case lookup of the post author's profile handles (`email`, `telegramUsername`, `xUsername`, `discordUsername`, `username`) against `contactsTable.email/telegramUsername/xUsername/discordUsername`. Any user with a matching contact card is force-added to the match list with `score=1` and a personalized "X (in your contacts via Telegram) just posted" reason — even if the embedding similarity is weak and even if they've never added the author as a friend. Contacts thus act as a "watch list" that lights up when that person publishes anything.

## Object Storage

- GCS via Replit sidecar. `DEFAULT_OBJECT_STORAGE_BUCKET_ID`, `PRIVATE_OBJECT_DIR`, `PUBLIC_OBJECT_SEARCH_PATHS` are set as secrets.
- `artifacts/api-server/src/lib/objectStorage.ts` provides `getObjectEntityUploadURL`, `normalizeObjectEntityPath`, `getObjectEntityFile`, `downloadObject`, and a server-side `uploadBuffer(buffer, mime)` helper used by the Telegram webhook.
- Routes in `artifacts/api-server/src/routes/storage.ts`: `POST /storage/uploads/request-url` (auth-required, returns presigned PUT URL + canonical objectPath), `GET /storage/objects/*` (auth-required), `GET /storage/public-objects/*` (open).
- Web upload flow: `Hub.tsx` calls the request-url endpoint, PUTs the file directly to GCS, then references the returned `objectPath` in the `attachments` array of `POST /hub`.

## Telegram

- Bot token in `TELEGRAM_BOT_TOKEN` secret. Webhook auto-registers on api-server startup to `${REPLIT_DEV_DOMAIN || PUBLIC_API_URL}/api/telegram/webhook` with a per-process secret (`getWebhookSecret`).
- Per-user linking via short code: `usersTable.telegramChatId` + `telegramLinkCode` (+ expiry). Code generated by `POST /api/me/telegram/link`; linked when the user sends `/start <CODE>` to the bot.
- Inbound `/api/telegram/webhook` looks up the user by chat id, then routes free text through the same `runAgent()` used by the in-app agent. Commands: `/start`, `/help`, `/reminders`, `/unlink`.
- Outbound: `evaluateReminders` and Hub fan-out queue Telegram messages via `enqueueTelegram(userId, notificationId, shortText)` in `lib/telegramQueue.ts`. The queue caps deliveries at `TELEGRAM_BATCH_SIZE` (3) per flush; if more notifications are pending, the bot sends a single conversational prompt ("You have N more updates. Reply YES to see them.") and sets `users.telegramAwaitingMore=true`. The webhook calls `handleTelegramQueueReply` first on every text message — YES/Y/sure/etc flushes another batch, NO/STOP clears the queue and silences further pushes. Notification rows persist `telegramText`, `telegramQueued`, and `telegramSentAt`. Each Hub fan-out short text is one line + a public post link `${PUBLIC_APP_URL || REPLIT_DEV_DOMAIN}/hub/p/<id>` (no auth required).

## Standard CRM features (follow-ups, tags, priority, calendar)

- **Follow-ups**: `lib/db/src/schema/followups.ts` `followUpsTable(id, userId, contactId, dueAt, note, source, completedAt)`. CRUD at `/api/followups` + `/api/followups/:id/complete` + `/api/contacts/:id/followups`. UI: `/app/followups` lists open + completed, ContactDetail has an inline `FollowUpsCard`. `evaluateReminders` also flags due follow-ups as notifications using a per-followup dedupe key `followup_due:<id>` so multiple due items per contact each surface independently.
- **AI tag suggestion**: `artifacts/api-server/src/lib/aiTags.ts` `suggestTags(contact)`. Auto-runs in the background on contact create when no tags supplied (atomic guard: only sets if tags array still empty, so a quick user edit isn't clobbered). Manual endpoint `POST /api/contacts/:id/suggest-tags` returns suggestions; the ContactDetail "Suggest tags" button merges them with existing tags.
- **Priority / "who matters"**: `GET /api/contacts/priority` ranks contacts by `(starred * 3) + log(interaction_count) + recency_decay(90 days)` in SQL. `POST /api/contacts/:id/star` toggles `contactsTable.starred` (boolean). Star button on ContactDetail.
- **Calendar (ICS subscribe)**: per-user opaque token in `usersTable.calendarFeedToken` (24-byte base64url). `GET /api/me/calendar` issues/returns `webcal://...` and `https://...` subscribe URLs; `POST /api/me/calendar/rotate` invalidates the old token. Public `GET /api/calendar/<token>.ics` returns a `text/calendar` feed of all the user's follow-ups (UID `followup-<id>@network-brain`, 30-min default duration). Subscribe in Google/Apple/Outlook — read-only sync, no OAuth.
- **Telegram extensions**: agent intent router classifies into INGEST | QUERY | POST | FOLLOWUP_SET | FOLLOWUP_LIST | PRIORITY | TAG_LIST | UNKNOWN. The webhook adds slash commands `/followups`, `/priority`, `/tag <name>` that just route into `runAgent()` so wording/casing variations all work.

## Routes

- Frontend: `/` (landing), `/sign-in`, `/sign-up`, `/app` (dashboard), `/app/contacts`, `/app/contacts/:id`, `/app/followups`, `/app/chat`, `/app/agent`, `/app/hub`, `/app/notifications`, `/app/profile`.
- Backend: see `lib/api-spec/openapi.yaml`. All routes are mounted in `artifacts/api-server/src/routes/index.ts`. Note: follow-ups, calendar, priority, star, suggest-tags, and friends endpoints are not in the OpenAPI spec yet — the web app calls them via `customFetch` directly.

## Important Conventions

- Generated client (`customFetch`) returns the raw response body, **not** an axios-style `{data}` wrapper. Use `data` from `useQuery` directly.
- `IngestResult.tags` schema is required and defaults to `[]` server-side.
- Schema names that would collide with orval's auto-derived operation body types (e.g. `AddInteractionBody`) are renamed to `XxxInput` to keep generation clean.
