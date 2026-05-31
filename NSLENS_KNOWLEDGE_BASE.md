# NSLens — Complete Knowledge Base

> This document is the authoritative knowledge base for NSLens. It is designed to be fed to an AI acting as NSLens's public relations, community manager, or support agent. It covers what the product is, how it is built, who it is for, what problems it solves, and how to talk about it.

---

## Table of Contents

1. [What Is NSLens?](#1-what-is-nslens)
2. [The Problem It Solves](#2-the-problem-it-solves)
3. [Who It Is For](#3-who-it-is-for)
4. [Core Features](#4-core-features)
5. [How It Is Built](#5-how-it-is-built)
6. [Architecture Overview](#6-architecture-overview)
7. [The AI Brain](#7-the-ai-brain)
8. [Bot Integrations](#8-bot-integrations)
9. [The Founders Hub](#9-the-founders-hub)
10. [Benefits to the NS Community](#10-benefits-to-the-ns-community)
11. [Security & Privacy](#11-security--privacy)
12. [Getting Started](#12-getting-started)
13. [FAQ — For PR / Community Use](#13-faq--for-pr--community-use)
14. [Talking Points & Positioning](#14-talking-points--positioning)
15. [Glossary](#15-glossary)

---

## 1. What Is NSLens?

**NSLens** is an AI-powered personal CRM (Customer Relationship Manager) built exclusively for verified members of **Network School (NS)**. It is the community's "network brain" — a private, intelligent system that helps every NS member capture, organize, search, and stay connected with everyone they meet inside the community.

Where most CRMs are built for sales teams tracking leads, NSLens is built for **community members tracking relationships**. It understands the NS context: builders, founders, investors, researchers, and operators who meet at events, co-work spaces, residencies, and online channels. NSLens makes sure those connections don't decay.

### The One-Sentence Pitch
> NSLens is the AI memory layer for your NS network — so you never forget who you met, what they're building, or when to follow up.

### What It Is Not
- Not a social network (there is no public profile or follower system)
- Not a messaging app (it works alongside your existing channels — Discord, Telegram)
- Not a lead tracker or sales pipeline tool
- Not a public directory of NS members

---

## 2. The Problem It Solves

### The NS Context
Network School brings together hundreds of high-caliber people. Members meet constantly — at events, dinners, co-working sessions, residencies, and in online channels. The quality of those meetings is high. But the average person can hold only about 150 relationships in active memory (Dunbar's number), and even fewer with enough context to act on.

### The Real Problem
After a great conversation, most people:
- Take scattered notes in different apps (Notion, notes, DMs)
- Forget to follow up within a week
- Lose context on what someone was building six months ago
- Cannot recall "who in my network works on X?" when it matters
- Never connect dots between new opportunities and existing relationships

This is the **relationship decay problem**. And at the speed NS moves, it gets worse fast.

### What NSLens Does About It
1. **Capture:** AI extracts structured contact data from messy notes, photos, screenshots, or typed text — in seconds.
2. **Organize:** Every person you've met gets a contact card with context, tags, and an interaction history.
3. **Remember:** Ask in plain English — "Who do I know building in DeFi?" — and get a grounded answer from your own data.
4. **Remind:** NSLens watches for relationships that have gone quiet and nudges you before they go cold.
5. **Connect:** The Founders Hub surfaces Hub posts to people whose contacts are relevant — so opportunities reach the right people.

---

## 3. Who It Is For

NSLens is exclusively for **verified NS members**. Access is gated behind NS membership verification — you must be an active member of Network School to create an account.

### Primary User Profiles

**The Builder / Founder**
Meets dozens of people per week. Needs to remember what everyone is building, follow up on intros, and post opportunities to the right people. NSLens acts as their external memory and broadcast layer.

**The Investor**
Tracks dealflow relationships across the community. Uses NSLens to log interactions after meetings, set follow-up reminders, and get notified when someone they know posts a relevant opportunity in the Founders Hub.

**The Operator / Talent**
Stays connected to the NS job and project network. Uses Hub posts to find roles or collaborators, and uses NSLens to maintain warm relationships with people they've met.

**The Newcomer**
Just joined NS and meeting everyone. NSLens lets them capture contacts from conversations and get oriented faster without the pressure of remembering everything manually.

---

## 4. Core Features

### 4.1 AI Contact Capture

You don't fill out forms. You paste your notes, upload a photo, or describe the person, and NSLens's AI extracts a structured contact card.

- **Text ingestion:** Paste any text — meeting notes, LinkedIn bios, email threads, chat transcripts — and the AI extracts name, company, project, context, and date.
- **Image ingestion:** Upload screenshots of LinkedIn profiles, business cards, or event photos. GPT Vision reads them and creates contact cards.
- **Smart upsert:** If the contact already exists, NSLens updates them rather than creating a duplicate.
- **Auto-tagging:** The AI suggests relevant tags (e.g., "founder", "investor", "defi", "infra") automatically in the background.

### 4.2 Memory Search (Chat)

Ask questions about your network in natural language and get answers grounded in your own contact and interaction data.

- "Who do I know building on Solana?"
- "What was the context behind my meeting with Alex?"
- "Who mentioned raising a seed round recently?"

The search combines keyword matching with semantic (meaning-based) search — so it finds the right person even if you don't use the exact words you wrote down. Answers cite specific contacts or interaction notes so you know exactly where the information came from.

### 4.3 Proactive Reminders

NSLens watches your contact list and flags relationships that are going quiet.

- Default threshold: **21 days** since last interaction (configurable per user)
- Delivers reminders via Telegram DM, Discord DM, or in-app notification
- Also surfaces follow-ups that are coming due
- Batches notifications so they don't feel spammy (max 3 per batch with a "see more" prompt)

### 4.4 Founders Hub

A shared space for NS members to post opportunities, projects, and announcements — with AI-powered routing that makes sure posts reach people they're relevant to.

- **Post creation:** Text, images, files, or links. AI enriches posts automatically (describes images, scrapes link previews).
- **Smart fan-out:** When you post, NSLens semantically matches your post against every member's contact network. If a member has a contact related to your post topic, they get notified.
- **Handle matching:** If you @mention someone's Telegram or Twitter handle in a post, NSLens automatically notifies anyone who has that person in their contacts.
- **Public links:** Every Hub post has a public URL that can be shared outside NSLens.

### 4.5 Follow-up Tracking

Create follow-up tasks tied to specific contacts. Set a due date and a note. NSLens reminds you when the date arrives — via the app, Telegram, or Discord. Follow-ups export to your calendar as a subscribable iCal feed (works with Google Calendar, Apple Calendar, Outlook).

### 4.6 Multi-Platform Bots

NSLens works where you already work. The Telegram bot and Discord bot have full feature parity with the web app. You can:
- Log contacts and interactions from a DM
- Ask memory questions
- Get reminders delivered to you
- Post to the Founders Hub
- List follow-ups and priority contacts

This means you don't have to open a separate app. NSLens comes to you.

### 4.7 Priority Contact Ranking

NSLens maintains a ranked view of your most important contacts based on:
- Whether they are starred (3× weight)
- Recency of last interaction (decays over 90 days)

This gives you a live dashboard of "who should I reach out to this week?"

---

## 5. How It Is Built

NSLens is a production-grade full-stack application built as a TypeScript monorepo.

### Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 7, Tailwind CSS v4, shadcn/ui, Framer Motion |
| Backend | Express 5 (TypeScript ESM), Node 22 |
| Database | PostgreSQL with pgvector extension |
| ORM | Drizzle ORM with auto-migrations |
| AI / LLM | OpenAI SDK (GPT-5.2 for all AI tasks) |
| Embeddings | OpenAI `text-embedding-3-small` (1536 dimensions, pgvector HNSW) |
| Discord Bot | discord.js v14 (Gateway / persistent WebSocket) |
| Telegram Bot | Telegram Bot API (webhook-based) |
| Object Storage | Google Cloud Storage (presigned URLs) |
| Auth | Discord OAuth2 + NS Auth verification + JWT |
| Deployment | Docker multi-stage build, Railway |
| State / Data Fetching | TanStack Query v5 |
| Code Generation | Orval (OpenAPI → TypeScript + React Query hooks + Zod types) |
| Build | esbuild (API), Vite (frontend) |
| Logging | Pino (structured JSON) |
| Security | Helmet, express-rate-limit, configurable CORS |

### Monorepo Layout

```
NSLens/
├── artifacts/
│   ├── api-server/        Express API + bots (TypeScript ESM)
│   └── web/               React frontend (Vite)
├── lib/
│   ├── db/                Drizzle schema, migrations, shared DB types
│   ├── api-spec/          OpenAPI 3.1 source of truth + Orval codegen config
│   ├── api-client-react/  Generated TanStack Query hooks
│   └── api-zod/           Generated Zod validation schemas
├── Dockerfile             Multi-stage Docker build
├── railway.toml           Railway deployment config
├── pnpm-workspace.yaml    Workspace config + catalog versions + supply-chain security
└── .env.example           Full environment variable documentation
```

### Package Manager & Security
- Uses **pnpm workspaces** with shared catalog versions
- Supply-chain security: `minimumReleaseAge: 1440` blocks any npm package published within the last 24 hours from being installed

---

## 6. Architecture Overview

### Request Flow

```
User (Web / Telegram / Discord)
        │
        ▼
Express API Server (api-server)
        │
        ├─── Auth Middleware (JWT verification)
        ├─── Rate Limiting (LLM routes)
        ├─── Route Handlers
        │       ├── /auth     — Discord OAuth + NS verification
        │       ├── /contacts — CRUD + priority ranking
        │       ├── /ingest   — AI entity extraction
        │       ├── /chat     — Hybrid memory search + RAG answers
        │       ├── /agent    — Intent classification + routing
        │       ├── /hub      — Founders Hub posts + fan-out
        │       ├── /reminders— Staleness detection + notification creation
        │       ├── /telegram — Webhook ingestion + command routing
        │       └── /calendar — iCal feed generation
        │
        ├─── PostgreSQL + pgvector (Drizzle ORM)
        ├─── OpenAI API (extraction, embeddings, chat, tagging)
        ├─── Google Cloud Storage (file uploads)
        └─── Bot Services
                ├── Discord Gateway (discord.js, persistent)
                └── Telegram Webhook (registered on startup)
```

### Authentication Flow

1. User clicks "Continue with Discord" on the login page
2. Redirected to Discord OAuth consent screen
3. Discord returns an auth code; server exchanges it for a user token
4. Server fetches Discord profile and calls the NS Auth API to verify active membership
5. Server upserts the user in the database (Discord user ID is the primary key)
6. Server issues a signed 7-day JWT
7. Frontend stores the JWT in `localStorage` and includes it in all API requests as `Authorization: Bearer <token>`

### Database Schema (simplified)

```
users           — NS member accounts (Discord ID as primary key)
contacts        — People you've met (with pgvector embedding for semantic search)
interactions    — Touch-point records per contact (notes, source tracking)
notifications   — Unified inbox + Telegram/Discord delivery queue
posts           — Founders Hub posts (attachments as JSONB)
friendships     — Social graph for Hub fan-out
followups       — Scheduled follow-up tasks
chatHistory     — Persisted conversation history (shared across web/Telegram/Discord)
```

---

## 7. The AI Brain

NSLens's intelligence is powered by OpenAI's APIs and a vector database. Here is how each AI capability works:

### Entity Extraction
When you paste text or upload an image, the AI (GPT-5.2) is prompted to extract structured data: name, company, project, role, context notes, and the date of interaction. The extraction handles messy, incomplete, or informal input — it works on everything from transcribed conversations to screenshots.

### Semantic Embeddings
Every contact and every interaction note is encoded into a 1536-dimensional vector using OpenAI's `text-embedding-3-small` model. These vectors are stored in PostgreSQL using the **pgvector** extension with an HNSW cosine similarity index. This enables fast nearest-neighbor search — finding semantically similar contacts even when the exact words don't match.

### Hybrid Memory Search
When you ask a question in the chat, NSLens runs two searches simultaneously:
1. **Keyword search** — case-insensitive ILIKE scan across contact fields and interaction notes
2. **Semantic search** — embed your query, find top-8 contacts and top-10 interactions with cosine similarity above 0.25

Both result sets are merged, deduplicated, and passed to the LLM as context. The LLM answers your question with citations pointing to specific contacts or interaction notes.

### Intent Classification (Agent Router)
When you send a message to the agent (on any surface), the LLM classifies your intent into one of:
- `INGEST` — you're describing a person or pasting contact info
- `QUERY` — you're asking a question about your network
- `POST` — you want to create a Founders Hub post
- `FOLLOWUP_SET` — you want to schedule a follow-up
- `FOLLOWUP_LIST` — you want to see your follow-ups
- `PRIORITY` — you want your top contacts
- `TAG_LIST` — you want contacts with a specific tag
- `UNKNOWN` — general conversation or unclear intent

The router then dispatches to the appropriate handler, making every surface of NSLens feel like a natural conversation.

### Auto-Tagging
After a contact is created or updated, a background job prompts the LLM to suggest relevant tags based on the contact's project, company, and context. The job uses an atomic guard — it only runs if the contact currently has no tags, and it never overwrites manually set tags.

### Hub Post Enrichment
When a new Hub post is created with attachments or links:
- Images are analyzed by GPT Vision and described in text
- Links are scraped for title, description, and preview image (OG metadata)
- All text is combined into a `searchableText` field used for semantic matching

---

## 8. Bot Integrations

### Discord Bot

The Discord bot runs as a persistent Gateway WebSocket connection using discord.js v14. It operates exclusively in **DMs** — no guild commands, no channel spam.

**How linking works:** When you send your first DM to the NSLens Discord bot, it automatically links your account because your Discord ID is your NSLens account ID. No codes or manual steps needed.

**Available commands in Discord DM:**
- `/help` — show available commands
- `/followups` — list your open follow-ups
- `/priority` — show your top contacts
- `/tag <name>` — list contacts with a specific tag
- `/reminders` — run staleness check now
- `/disconnect` — disconnect the bot
- Free text → routed through the AI agent
- `/post <text>` or attachments → create a Founders Hub post

**Notification delivery:** Reminders and Hub match notifications are delivered as Discord DMs. Batched in groups of max 3, with a "You have N more — reply YES to see them" gate.

### Telegram Bot

The Telegram bot is webhook-based. Telegram pushes incoming messages to NSLens's server endpoint. Each message is verified with a secret token to prevent spoofing.

**How linking works:** Run `/start <CODE>` where `<CODE>` is the linking code generated from your NSLens profile page. The code expires after a short window.

**Available commands in Telegram:**
- `/start <CODE>` — link your Telegram account
- `/help` — show available commands
- `/reminders` — run staleness check now
- `/unlink` — disconnect Telegram
- `/followups` — list your open follow-ups
- `/priority` — show your top contacts
- `/tag <name>` — list contacts with a specific tag
- Free text → routed through the AI agent
- Photos, videos, files → ingested as Hub post attachments

**Notification delivery:** Same batching model as Discord — max 3 per flush with an overflow gate.

### Feature Parity
Both bots share the same backend agent, the same chat history, and the same notification queue. A conversation started on Telegram continues seamlessly if you switch to Discord or the web app.

---

## 9. The Founders Hub

The Founders Hub is NSLens's community opportunity board. It is different from a typical bulletin board because it uses AI to route posts to the people most likely to care about them.

### How Posting Works
1. Write a post (text, images, files, links — all supported)
2. NSLens automatically enriches it: describes images via AI, scrapes link previews
3. The enriched content is embedded and compared against every member's contact network
4. Members whose contacts overlap semantically with your post get notified

### How Matching Works
There are two matching mechanisms:

**Semantic Matching**
The post content is embedded as a vector. NSLens searches every member's contact cards for contacts with cosine similarity above 0.2. A second LLM pass filters out weak matches. Relevant members get a `hub_match` notification.

**Handle-Based Identity Matching**
If your post includes a Twitter/X handle or Telegram username that belongs to someone in another member's contact book, that member is force-added to the notification list with maximum relevance score. This ensures that name drops and callouts always reach the right people.

### Public Posts
Every Hub post has a public URL at `/hub/p/:id` that can be shared with anyone — including people outside NSLens. No account is needed to view a public post link.

### Hub vs. Discord/Telegram Channels
The Hub is not a replacement for Discord or Telegram. It is a **structured, AI-routed** layer on top of them. When something matters enough to be a permanent record that should reach specific people, post it to the Hub. The bots deliver Hub notifications directly in Discord DM or Telegram — so members see them where they already are.

---

## 10. Benefits to the NS Community

### For Individual Members

**Never lose a connection again**
After every event, residency, or online session, you can dump all your notes into NSLens in seconds and have a clean, searchable record of every person you met.

**Actually follow up**
NSLens proactively reminds you when a relationship has gone quiet. The calendar export means follow-ups land in your existing calendar workflow — no new app to check.

**Find the right person, fast**
When you need to make an intro, find a collaborator, or remember what someone is building — ask NSLens. It searches your entire interaction history, not just names.

**Work where you work**
The Discord and Telegram bots bring NSLens to the tools NS members already use. You don't need to switch contexts to maintain your network.

### For the Community as a Whole

**Stronger network density**
When members remember each other and follow up, the NS network gets stronger over time. NSLens compounds the value of every in-person meeting.

**Opportunity flow**
The Founders Hub's AI routing means that opportunities, jobs, and introductions reach the people they're most relevant to — not just the most active posters or loudest voices.

**Community memory**
NSLens gives the NS community an institutional memory layer. Over time, members build a rich record of who met whom, what was built, and how relationships evolved.

**Verified access only**
Because access is gated behind NS membership verification, the trust level inside NSLens is high. Members can share context they wouldn't post publicly, knowing it stays within the verified community.

### Network Effects
The more NS members use NSLens, the more valuable the Hub fan-out becomes. Each new member increases the number of potential Hub match paths. Handle-based identity matching means even passive members benefit when someone posts about a person in their network.

---

## 11. Security & Privacy

### Access Control
- All data is scoped to the authenticated user. You can only see your own contacts, interactions, notifications, and follow-ups.
- JWT tokens expire after 7 days. The `SESSION_SECRET` is a 32-byte cryptographically random key.
- All API routes (except public Hub links and the iCal feed) require a valid JWT.

### Data Privacy
- Your contact data never becomes training data for the AI. Contacts are queried at runtime and returned to the LLM as context — not stored by OpenAI as training examples.
- Account deletion triggers a CASCADE delete on all associated data: contacts, interactions, notifications, follow-ups, chat history, Hub posts.

### Calendar Feed Privacy
- The iCal calendar feed is protected by an opaque per-user token in the URL. It does not require a login session.
- You can rotate the token at any time to invalidate old subscription URLs.

### Network Security
- Helmet provides standard HTTP security headers.
- Rate limiting on AI-intensive routes prevents abuse.
- SSRF protection on the link scraper blocks requests to private IP ranges (RFC 1918, loopback, link-local).
- Telegram webhook requests are validated with a secret token to prevent spoofing.
- Supply-chain security: the project blocks npm packages less than 24 hours old from being installed, reducing dependency hijacking risk.

### NS Membership Gate
Every login verifies active NS membership via the NS Auth API. Lapsed members lose access automatically when their JWT expires.

---

## 12. Getting Started

### Prerequisites
- Active NS membership
- Discord account (linked to your NS membership)

### Step 1: Log In
Visit the NSLens web app and click **Continue with Discord**. NSLens verifies your NS membership automatically. If your membership is active, you're in.

### Step 2: Add Your First Contacts
Three ways to add contacts:
1. **Paste notes:** Go to the Ingest page and paste your meeting notes, LinkedIn summary, or any text describing someone you met. NSLens extracts the contact automatically.
2. **Upload a screenshot:** Upload a LinkedIn profile screenshot, business card, or event photo. GPT Vision reads it and creates a contact card.
3. **Manual entry:** Create a contact card by filling in fields directly on the Contacts page.

### Step 3: Connect Your Bots
**Telegram:** Go to Profile → Telegram, generate a linking code, and send `/start <CODE>` to the NSLens Telegram bot. Once linked, you can interact with NSLens directly from Telegram.

**Discord:** Send a DM to the NSLens Discord bot. It auto-links because your Discord ID is your NSLens account. No code needed.

### Step 4: Explore the Founders Hub
Browse the Hub to see what NS members are building and posting. If you have something to share — a job, a project, looking for a collaborator — post it. The AI will route it to the right people.

### Step 5: Ask Your Network
Go to the Chat or Agent page and ask a question: "Who do I know building in AI?" or "What's the best way to reach the person I met at the Singapore event last month?" NSLens searches your contacts and interactions to answer.

---

## 13. FAQ — For PR / Community Use

**Q: Is NSLens only for NS members?**
Yes. NSLens requires verified NS membership to create an account. This is intentional — the product is built for a specific high-trust community, not the public internet.

**Q: Does NSLens replace Discord or Telegram?**
No. NSLens works alongside Discord and Telegram. The bots deliver NSLens functionality inside the tools NS members already use. NSLens does not host conversations — it helps you remember and act on the conversations you're already having.

**Q: Is my contact data shared with other NS members?**
No. Your contacts and interactions are private to your account. The only shared surface is the Founders Hub, where you choose what to post. Hub posts can be public (shareable links) or visible only to logged-in NS members.

**Q: What AI model powers NSLens?**
NSLens uses OpenAI's GPT-5.2 for extraction, chat, tagging, and intent classification, and `text-embedding-3-small` for semantic vector search.

**Q: Does NSLens store my chat history?**
Yes, chat history is persisted per user and shared across web, Telegram, and Discord — so your conversation continues seamlessly across surfaces. History is pruned to the last 100 messages per user.

**Q: Can I use NSLens on mobile?**
The web app is responsive. The Telegram and Discord bots provide a full mobile experience inside apps you already use.

**Q: What happens to my data if I delete my account?**
All data is permanently deleted: contacts, interactions, notifications, follow-ups, Hub posts, and chat history.

**Q: Can I export my follow-ups to my calendar?**
Yes. NSLens generates a subscribable iCal feed that works with Google Calendar, Apple Calendar, and Outlook. Follow-ups appear as calendar events.

**Q: Can I share a Founders Hub post with someone outside NSLens?**
Yes. Every Hub post has a public URL at `/hub/p/:id` that anyone can view — no account needed.

**Q: How does NSLens decide who to notify about a Hub post?**
It runs a semantic similarity search: the post content is matched against every member's contact cards using vector embeddings. Members whose contacts are semantically related to the post topic get notified. Handle-based matching adds people whose contacts are directly mentioned by handle.

**Q: How are reminder notifications delivered?**
Via Telegram DM, Discord DM, or the in-app notification inbox — depending on which platforms you've connected. Notifications are batched (max 3 per delivery) to avoid spam.

**Q: What is the staleness threshold for reminders?**
The default is 21 days since last interaction. You can change this in your profile settings.

**Q: How does NSLens know I'm an NS member?**
During login, after Discord OAuth, NSLens calls the NS Auth API to verify your membership status. If your membership is not active, login is rejected.

**Q: Can the Discord or Telegram bot create Hub posts?**
Yes. On Discord, prefix your message with `/post` or attach files. On Telegram, send any photo, video, or file to the bot, and it will be posted to the Hub.

**Q: Is NSLens open source?**
The codebase is maintained in a private repository accessible to the NSLens team and approved contributors.

---

## 14. Talking Points & Positioning

### Core Message
NSLens is the network memory every NS member deserves. It turns the high-value connections you make at NS into a living, queryable, proactive relationship system.

### Against "I just use Notion/Airtable"
Those tools require manual input and give nothing back. NSLens extracts contacts automatically from your notes, reminds you proactively, and answers questions about your network in natural language. It is active, not passive.

### Against "I just use my phone contacts"
Phone contacts don't have interaction history, don't remind you when a relationship is going cold, don't tell you who in your network is relevant to an opportunity, and don't route opportunities to you automatically. NSLens is a relationship intelligence layer, not an address book.

### Against "I'll just remember"
The NS community is dense and moves fast. NSLens is designed precisely because memory doesn't scale. Even the best networkers lose track without a system. NSLens is that system.

### Why NS-Exclusive Is a Feature
The membership gate is not a limitation — it's the reason the data inside NSLens is trustworthy and actionable. Every contact you add from NS, every Hub post you see, comes from a verified community member. That context changes how you act on information.

### The Compounding Value Argument
NSLens gets more valuable the longer you use it. Every interaction you log, every note you add, makes your memory search richer. Every follow-up you complete and every reminder you act on strengthens your network. The people who get the most value from NS are the ones who stay connected — NSLens is the infrastructure for that.

---

## 15. Glossary

| Term | Definition |
|------|-----------|
| **NS** | Network School — the exclusive community NSLens is built for |
| **Contact** | A person in your NSLens network — the basic unit of the CRM |
| **Interaction** | A logged touch-point with a contact — a note, meeting, message, etc. |
| **Ingest** | The AI process of extracting a contact from free text or an image |
| **Embedding** | A numerical vector representation of text, used for semantic search |
| **pgvector** | A PostgreSQL extension that stores and searches vectors efficiently |
| **HNSW** | Hierarchical Navigable Small World — the indexing algorithm for fast vector search |
| **Hub / Founders Hub** | The shared NS opportunity board with AI-powered routing |
| **Hub Match** | A notification triggered when a Hub post is semantically relevant to your contacts |
| **Agent** | The AI intent router that classifies your messages and dispatches to handlers |
| **Memory Search** | The hybrid keyword + semantic search across your contacts and interactions |
| **Staleness** | The state of a contact you haven't interacted with in longer than your threshold |
| **Reminder** | A proactive notification about a stale contact or due follow-up |
| **Follow-up** | A scheduled task tied to a contact with a due date and optional note |
| **Priority Score** | A computed ranking for contacts: (starred × 3) + recency decay over 90 days |
| **Auto-tag** | AI-suggested tags applied automatically based on contact context |
| **iCal Feed** | A calendar subscription URL compatible with Google, Apple, and Outlook calendars |
| **Handle Matching** | Identity matching in Hub fan-out using Telegram/Twitter handles |
| **Notification Batching** | Grouping up to 3 notifications per delivery to prevent spam |
| **NS Auth** | The NS membership verification API called during login |
| **JWT** | JSON Web Token — the 7-day session credential issued after login |
| **Gateway Bot** | A Discord bot connected via persistent WebSocket (vs. webhook-based) |
| **Webhook Bot** | A Telegram bot where Telegram pushes messages to NSLens's server |
| **GCS** | Google Cloud Storage — used for file uploads (Hub post attachments) |
| **Presigned URL** | A time-limited GCS URL that allows a client to upload directly to storage |
| **Drizzle** | The TypeScript ORM used for all database interactions |
| **Orval** | The code generator that produces TypeScript types and React Query hooks from the OpenAPI spec |
| **TanStack Query** | The frontend data-fetching and caching library (formerly React Query) |
| **Pino** | The structured JSON logger used in production |
