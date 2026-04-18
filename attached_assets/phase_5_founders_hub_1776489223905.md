# Phase 5: The Founders Hub & Network Ecosystem

## Goal
Build the public "multiplayer" feature. Founders can post progress updates to the Hub. An automated agent reads these posts, cross-references CRM graphs, and generates smart push notifications to relevant contacts.

## Architecture
- **Frontend Feed:** Server-side generated infinite-scroll Next.js layout.
- **Fan-out Architecture:** Job Queue logic (e.g. BullMQ or Inngest) to handle dispatching dozens/hundreds of webhooks seamlessly.

## Implementation Steps
1. **Dual Posting Capabilities:**
   - Build a `Post` model in the DB (ID, content, author_id, timestamp).
   - Build UI in the web app under `/hub` allowing forms to hit `POST /api/hub`.
   - Enhance the Telegram agent (Phase 4) with a `/post` command routing to the same API.
2. **Feed Subsystem:**
   - Build the chronological public feed in the Web App (`/hub/page.tsx`).
3. **Smart Notification Engine (Webhook Fan-out):**
   - Once a `Post` triggers, identify which `User`s have the post author in their `Contact` list.
   - Instruct the AI: *"Summarize this post for [Subscriber Name]. Make it conversational."*
   - Push the resulting string via the Telegram/Discord API directly to the subscriber's personal agent inbox. 

## Testing Strategy
- **Simulation:** Publish a mock post from Founder A. 
- **Graph Coverage Test:** Ensure User B (who has Founder A in the CRM) receives the Telegram payload. Ensure User C (who does NOT have Founder A) is excluded safely.
- **Concurrent DB Locks:** With fan-out logic, verify that pushing 100 simultaneous notifications doesn't overload connection pools. Using a queued background processing architecture handles this efficiently.
