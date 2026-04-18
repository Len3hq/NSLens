# Phase 4: Integrations (Telegram & Discord Agents)

## Goal
Bring the Personal CRM directly to the user's pocket. Deploy chat bots that tie deeply into the Phase 1 & 2 infrastructure so users do not always need to open the web app.

## Architecture
- **Bot Frameworks:** `telegraf` (for Telegram), `discord.js` (for Discord).
- **Hosting / Routing:** API routes exposed as secure webhooks in Next.js (`/api/webhooks/telegram`).
- **Account Linking:** Transient token validation.

## Implementation Steps
1. **Bot Registration:**
   - Create bots using BotFather (Telegram) and Discord Dev Portal. Gather secure API keys.
2. **Account Linking Protocol:**
   - When a user interacts with the bot (`/start`), generate a secure, short-lived magic url linking back to the Web App.
   - Once clicked, connect the web user's ID with their `chat_id` inside the database.
3. **Intent Routing Pipeline:**
   - When a message arrives at the webhook, use an LLM router to classify the intent:
     a) **INGEST:** Pass payload to Phase 1 APIs (adding notes to a contact).
     b) **QUERY:** Pass payload to Phase 2 APIs (asking for context/history).
     c) **POST:** Pass payload to Founders Hub (Phase 5).
   - Format the API response and push a message natively back to the `chat_id`.

## Testing Strategy
- **Webhook E2E:** Abstract the incoming webhook payload. Send fake payload JSON arrays to your local development environment using tools like ngrok to verify HTTP handling.
- **Multi-Tenant Security:** Rigorously verify that incoming queries use the correct `chat_id` -> `user_id` mapping. Ensure a user cannot query another user's CRM memory space.
