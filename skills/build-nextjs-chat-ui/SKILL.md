---
name: build-nextjs-chat-ui
description: Build and modify production-quality Next.js chat frontends using TypeScript and React. Use for ChatGPT-style layouts, App Router architecture, server/client boundaries, responsive chat components, streaming message rendering, model selectors, conversation sidebars, Markdown, accessibility, state management, and frontend tests.
---

# Build Next.js Chat UI

## Workflow

1. Inspect the existing Next.js version, router, package manager, styling system, component library, and tests.
2. Preserve established conventions. Add dependencies only when they remove meaningful complexity.
3. Define the message and stream-event contract before building components.
4. Keep data loading and secrets on the server. Add `use client` only at interactive boundaries.
5. Compose the interface from focused pieces: shell, sidebar, transcript, message, composer, model picker, and status controls.
6. Stream into a stable assistant message instead of appending one component per token.
7. Implement loading, empty, reconnecting, cancelled, and error states deliberately.
8. Verify keyboard operation, focus behavior, responsive layout, reduced motion, and screen-reader announcements.
9. Run type checks, linting, unit tests, and browser tests. Inspect the rendered interface at narrow and wide widths.

Read [references/chat-ui-patterns.md](references/chat-ui-patterns.md) for component boundaries, streaming state, and accessibility checks.

## Guardrails

- Do not expose provider keys or privileged database clients to browser code.
- Do not duplicate server-fetched state into multiple client stores without need.
- Sanitize model-generated HTML; configure Markdown links and code blocks safely.
- Preserve user input when requests fail and make retry/stop actions explicit.
- Avoid visual imitation that sacrifices semantics, accessibility, or responsiveness.

## Deliverables

Implement complete states, update relevant tests, and report changed routes/components, commands run, and any remaining backend contract assumptions.
