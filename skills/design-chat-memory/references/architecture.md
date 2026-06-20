# Chat Memory Architecture Reference

## Layers

| Layer | Purpose | Typical storage |
|---|---|---|
| Conversation history | Exact threads and messages | Postgres/Supabase |
| Working context | Recent turns sent to the model | Application logic/cache |
| Summaries | Compressed older context | Postgres, linked to source range |
| Semantic memory | Similarity retrieval | `pgvector` or vector service |
| User preferences | Explicit, editable facts | Relational table with provenance |

## Database Choice

- Choose Supabase/Postgres for shared multi-user applications, relational queries, RLS, realtime updates, and vector search in one system.
- Choose local SQLite for single-user/offline prototypes; add a repository boundary before later migration.
- Add Redis only for ephemeral coordination, rate limits, queues, or hot caches—not as the sole durable history store.

## Baseline Schema

Use `profiles`, `conversations`, `messages`, and optionally `memories` and `conversation_summaries`. Give every row a stable UUID and timestamps. Put `user_id` on ownership roots; enforce child access through ownership joins or denormalized ownership with consistency constraints. Store message role, content parts, model/provider metadata, status, token usage, and an idempotency key. Order messages with a server-assigned sequence rather than timestamps alone.

## Supabase Safety

Enable RLS on every client-accessible table. Write policies around `auth.uid()`, test anonymous and cross-tenant access, and keep service-role credentials server-only. Use migrations as the schema authority. Generate application types after schema changes.

## Memory Lifecycle

Create derived memory asynchronously after persisting a completed message. Record provenance, confidence, and source message IDs. Allow users to inspect, edit, forget, export, and delete memories. Rebuild summaries and embeddings after model or chunking changes.
