---
name: design-chat-memory
description: Design and implement storage, persistence, and memory architecture for AI chat applications. Use for choosing databases such as Supabase/Postgres, modeling users and conversations, tenant isolation, row-level security, message history, summaries, semantic memory, retention, migrations, and scaling shared chat data.
---

# Design Chat Memory

## Workflow

1. Inspect the existing authentication, deployment, data-access, and message types before proposing a store.
2. Separate durable conversation history from derived memory. Treat messages as the source of truth; treat summaries, embeddings, and extracted facts as replaceable indexes.
3. Identify tenancy, expected traffic, latency, offline behavior, retention, search, and compliance requirements.
4. Select the least complex database that satisfies those requirements. Prefer Postgres/Supabase when relational integrity, shared access, authentication, and row-level security matter.
5. Define ownership and authorization before writing queries. Enforce access in the database as well as the application.
6. Design idempotent writes, pagination, indexes, migrations, deletion, export, and recovery.
7. Implement behind a repository interface so UI and model-provider code do not depend on a database SDK.
8. Test cross-user isolation, concurrent updates, retries, long conversations, and deletion cascades.

Read [references/architecture.md](references/architecture.md) when choosing a store, schema, memory strategy, or Supabase policy.

## Guardrails

- Never store API keys or provider credentials in conversation records.
- Never trust a client-supplied user ID; derive identity from the verified session.
- Preserve raw messages before generating summaries or embeddings.
- Keep vector retrieval optional and measurable; do not call all chat history “memory.”
- State assumptions and operational tradeoffs with every architecture recommendation.

## Deliverables

Provide the selected architecture, schema or migration, authorization model, access interface, retention behavior, indexes, and verification steps. Include a rollback path for destructive migrations.
