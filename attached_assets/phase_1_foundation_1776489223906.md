# Phase 1: Foundation, Auth & Data Ingestion

## Goal
Establish the Next.js fullstack application, implement passwordless authentication (Magic Links), and configure the foundational PostgreSQL database. Construct the ingestion endpoints enabling the AI to extract structured profiles from unstructured text and screenshots.

## Architecture
- **Web Framework:** Next.js (App Router)
- **Database:** PostgreSQL (with `pgvector` extension)
- **ORM:** Prisma or Drizzle
- **Auth:** NextAuth (Auth.js) combined with Resend or Nodemailer for Magic Links.
- **AI Processing:** OpenAI SDK (GPT-4o) for OCR and Entity Extraction.

## Implementation Steps
1. **Database Setup:**
   - Spin up PostgreSQL via Supabase, Neon, or local Docker.
   - Define core models: `User`, `Contact`, `Interaction` (meetings, chat logs), and `Settings`.
   - Enable `pgvector`. Modify the `Contact` and `Interaction` models to support `vector(1536)` columns.
2. **Authentication Flow:**
   - Install NextAuth.
   - Set up an EmailProvider. When a user logs in, they receive an email link that securely drops an authentication cookie without ever handling passwords.
3. **Data Ingestion API (`/api/ingest`):**
   - **Text Ingestion:** Accept unstructured text (e.g. notes from a dinner). Use an LLM with strict JSON formatting to extract: `[Name, Project, Context, Date]`.
   - **Vision Ingestion:** Accept an image upload (e.g. LinkedIn screenshot). Pass the base64 string to GPT-4o-Vision to extract the same fields.
   - **Storage:** Upsert the identified entity into the `Contact` table.

## Testing Strategy
- **Database Migrations:** Ensure ORM syncs cleanly against the Postgres instance.
- **Unit Testing (Jest/Vitest):** Mock the LLM JSON output to verify mapping into the ORM structures remains robust.
- **Auth E2E:** Cycle a magic link manually or via Playwright to ensure secure session states.
