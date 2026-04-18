# Phase 3: Proactive Agents & Reminders

## Goal
Make the CRM proactive. The system will operate in the background, analyzing relationship velocity and pushing notifications or auto-drafting follow-up emails, eliminating manual contact-checking.

## Architecture
- **Job Scheduler:** Vercel Cron or a robust background runner (Trigger.dev / Inngest).
- **Trigger Logic:** SQL-based freshness calculations.
- **Generative AI:** Specialized LLM logic optimized for conversational drafting.

## Implementation Steps
1. **Background Job Configuration:**
   - Setup a daily recurring job endpoint (`/api/cron/reminders`).
2. **Stale Contact Evaluation:**
   - Write a DB query to identify critical network nodes where `last_interaction_date < (NOW() - user_preference_days)`.
3. **Drafting Auto-Follow-ups:**
   - For flagged contacts, query the RAG layer for the last known context.
   - Instruct the LLM to draft a personalized follow-up: *"You haven't spoken to Alice in 3 weeks. Last time you discussed DeFi. Suggested message: 'Hey Alice...'"*.
4. **Dashboard Integration:**
   - Store these alerts in a `Notification` list. Render them in the CRM view of the Web App as actionable items.

## Testing Strategy
- **Cron Trigger Testing:** Bypass the chronometer by hitting the endpoint manually using cURL or Postman. Check if the ORM returns exactly the correct "stale" records.
- **Draft Quality:** Check the tone and contextual accuracy of the generated drafts. Ensure it does not hallucinate new, non-existent meetings.
