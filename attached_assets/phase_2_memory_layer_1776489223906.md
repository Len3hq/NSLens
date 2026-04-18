# Phase 2: Querying & The Assistant (The Memory Layer)

## Goal
Implement a Retrieval-Augmented Generation (RAG) architecture. Users can interact with their Personal CRM via a natural language chat interface that knows their contacts, contexts, and history.

## Architecture
- **Embedding Generation:** OpenAI `text-embedding-3-small`.
- **Search System:** Postgres `pgvector` native distance operators (`<->`).
- **UI Streaming:** Vercel AI SDK (`ai` and `@ai-sdk/react`).

## Implementation Steps
1. **Vectorizing Records:**
   - Create a utility hook. Whenever a `Contact` or `Interaction` is added or updated (from Phase 1), compile text (e.g. *"Dave, Founder of Solana app, met at dinner on March 12"*) and generate its embedding. Store this in the `vector` column.
2. **Semantic Search Endpoint (`/api/chat`):**
   - Accept the user's natural language query.
   - Generate an embedding for the query.
   - Run a SQL similarity search over the `Interaction` and `Contact` tables. Return the top 5 most relevant results.
3. **RAG Context Synthesis:**
   - Inject the top 5 results into a System Prompt: *"You are a CRM assistant. Base your answers on this data: {results}."*
   - Stream the finalized answer back to the frontend using the `streamText` function from Vercel AI SDK.

## Testing Strategy
- **Embedding Consistency:** Validate that functionally similar phrases result in vectors with high cosine similarity.
- **RAG E2E:** Seed the database with 5 distinct contacts. Query *"Who works in Web3?"* and assert the LLM successfully pulls the Web3 dev without returning the others.
- **Prompt Injection Checks:** Feed malicious queries and ensure the agent stays strictly within the boundaries of the provided context.
