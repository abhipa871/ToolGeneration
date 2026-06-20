# Luma Chat

Luma Chat is a provider-agnostic, ChatGPT-style web interface for streaming responses from local and hosted language models. It provides one server-side chat contract for a built-in demo, Ollama, vLLM, SGLang, Hugging Face endpoints, and arbitrary OpenAI-compatible APIs.

The application is built with Next.js 16, React 19, and strict TypeScript. Conversations are saved in the browser by default, model credentials remain on the server, and an optional Supabase migration provides a foundation for shared authenticated history.

## What the application does

- Streams model output into a stable assistant message.
- Switches between configured providers and their default models.
- Cancels an active generation with `AbortController`.
- Renders Markdown and GitHub Flavored Markdown.
- Saves up to 100 conversations in browser `localStorage`.
- Supplies bounded excerpts from other saved conversations as cross-chat memory.
- Supports responsive desktop and mobile layouts.
- Normalizes different provider protocols into versioned NDJSON events.
- Includes request validation and tests that do not require a GPU or paid API.

## Request flow

```text
ChatApp
  -> POST /api/chat
  -> provider registry
  -> selected provider adapter
  -> Ollama or OpenAI-compatible model server
  -> normalized NDJSON stream
  -> parseEventStream
  -> live assistant message
```

The browser sends a common request. Before sending, it prepends a bounded system context built from the eight most recently updated conversations other than the active thread:

```ts
{
  providerId: string;
  model: string;
  messages: Array<{
    role: "user" | "assistant" | "system";
    content: string;
  }>;
}
```

The server returns newline-delimited JSON events. The event union includes `start`, `text-delta`, `usage`, `finish`, and `error`. Each event is versioned and associated with a request ID; text deltas also carry a sequence number.

## Requirements

- Node.js 20.9 or newer (the minimum supported by Next.js 16)
- npm
- Optional: Ollama or another compatible model server
- Optional: a Supabase project for future shared persistence

## Run locally

Install dependencies and create local configuration:

```bash
npm install
cp .env.example .env.local
npm run dev
```

On PowerShell, copy the environment file with:

```powershell
Copy-Item .env.example .env.local
```

Open [http://localhost:3000](http://localhost:3000). The built-in **Studio Demo** works without a model server. Ollama also appears by default, but requests to it require Ollama to be running with the configured model available.

For example:

```bash
ollama serve
ollama pull llama3.2
```

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server. |
| `npm run build` | Create a production build and run framework/type checks. |
| `npm run start` | Serve an existing production build. |
| `npm run lint` | Run ESLint across the repository. |
| `npm test` | Run the Vitest unit and integration suite once. |

## Provider configuration

All provider settings are read only on the server. Variables containing keys must never use the `NEXT_PUBLIC_` prefix.

| Variable | Description |
| --- | --- |
| `OLLAMA_BASE_URL` | Ollama server URL; defaults to `http://127.0.0.1:11434`. |
| `OLLAMA_MODEL` | Default Ollama model; defaults to `llama3.2`. |
| `VLLM_BASE_URL`, `VLLM_MODEL`, `VLLM_API_KEY` | vLLM OpenAI-compatible endpoint settings. Include `/v1` in the base URL when required. |
| `SGLANG_BASE_URL`, `SGLANG_MODEL`, `SGLANG_API_KEY` | SGLang OpenAI-compatible endpoint settings. |
| `HUGGINGFACE_BASE_URL`, `HUGGINGFACE_MODEL`, `HUGGINGFACE_API_KEY` | Hugging Face hosted or dedicated OpenAI-compatible endpoint settings. |
| `MODEL_API_BASE_URL`, `MODEL_API_MODEL`, `MODEL_API_KEY` | Settings for any other OpenAI-compatible API. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Placeholder client configuration for a future Supabase integration. |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged Supabase key; keep server-only. It is not currently consumed by application code. |

An optional provider is exposed by `GET /api/providers` only when its base URL is configured. The response contains safe provider metadata and never returns API keys.

### Adding a provider

Implement the `ModelProvider` interface in `src/lib/providers/`, translate the provider's native stream into normalized `StreamEvent` values, and register it in `registry.ts`. Keep provider-specific payloads, credentials, parsing, and errors inside the adapter. The UI should continue to use only the shared chat contract.

## Persistence

The active implementation is `BrowserConversationRepository`. It stores conversations under a versioned `localStorage` key, sorts them by most recent update, and retains the newest 100. This is private to one browser profile and is not synchronized between devices.

When a message is sent, `memory.ts` creates read-only working context from up to eight other conversations and the twelve most recent non-streaming messages in each. Individual excerpts and total injected context are character-limited. The memory is sent to the model but is not added to the visible thread or persisted as a duplicate message. Deleting a conversation removes it from future cross-chat memory.

`supabase/migrations/001_chat_memory.sql` is an optional database foundation rather than an active runtime dependency. It creates conversations and messages, ownership indexes, row-level security policies, and a trigger that updates a conversation when one of its messages changes. A production Supabase integration still needs authentication and a server-side repository implementation.

## Security and current boundaries

- API keys stay in server environment variables.
- The chat route validates provider/model fields, message count, roles, and content length.
- Generated Markdown is rendered as React elements; raw HTML is not enabled.
- External links open in a new tab with `noopener` and `noreferrer`.
- Local model servers should not be exposed directly to untrusted networks.
- The current app has no authentication, rate limiting, upload support, tool calls, or server-side conversation storage.

## Testing

Run the complete local verification set before submitting changes:

```bash
npm test
npm run lint
npm run build
```

The existing tests cover stream parsing across arbitrary byte boundaries, successful demo streaming through the API route, and rejection of malformed chat requests. Future adapters should add mocked success, cancellation, malformed response, unavailable model, timeout, and context-limit tests. Browser coverage should include sending, stopping, provider switching, retrying, responsive behavior, and history restoration.

## Repository map

### Root files

| File | Responsibility |
| --- | --- |
| `.env.example` | Safe configuration template for all supported providers and optional Supabase settings. |
| `.gitignore` | Excludes dependencies, Next.js output, coverage, secrets, and runtime logs. |
| `AGENTS.md` | Repository conventions for architecture, testing, security, naming, and contributions. |
| `README.md` | This project overview, setup guide, architecture reference, and file map. |
| `package.json` | Project identity, npm scripts, runtime packages, and development dependencies. |
| `package-lock.json` | npm-generated dependency lockfile for reproducible installs. Do not edit it manually. |
| `next.config.ts` | Next.js configuration; currently enables React Strict Mode. |
| `next-env.d.ts` | Next.js-generated TypeScript declarations. Do not edit it manually. |
| `tsconfig.json` | Strict TypeScript settings, Next.js integration, and the `@/* -> src/*` import alias. |
| `eslint.config.mjs` | ESLint flat configuration using Next.js Core Web Vitals and TypeScript rules. |
| `vitest.config.ts` | Vitest configuration using jsdom and the same `@` source alias as the app. |

### Application routes and styling

| File | Responsibility |
| --- | --- |
| `src/app/layout.tsx` | Root App Router layout, global stylesheet import, page title, and description metadata. |
| `src/app/page.tsx` | Home page that renders the interactive chat application. |
| `src/app/globals.css` | Complete visual system: layout, sidebar, provider menu, transcript, Markdown, composer, responsive breakpoints, and reduced-motion behavior. |
| `src/app/api/providers/route.ts` | Dynamic `GET` endpoint that returns safe summaries of configured providers. |
| `src/app/api/chat/route.ts` | Dynamic `POST` endpoint that validates requests, selects an adapter, streams normalized NDJSON, handles cancellation, and maps failures to error events. |

### Chat UI

| File | Responsibility |
| --- | --- |
| `src/components/chat/chat-app.tsx` | Main client component. Owns provider loading, conversation state, local persistence, send/stop/retry/copy actions, stream updates, scrolling, sidebar behavior, and responsive UI composition. |
| `src/components/chat/message-content.tsx` | Renders assistant and user content with `react-markdown` and GFM support; hardens external links. |

### Shared chat logic

| File | Responsibility |
| --- | --- |
| `src/lib/chat/types.ts` | Shared message, conversation, request, provider-summary, and versioned stream-event types. |
| `src/lib/chat/stream.ts` | Incrementally decodes and parses newline-delimited stream events, including events split across network chunks. |
| `src/lib/chat/repository.ts` | Defines the replaceable conversation repository interface and its browser `localStorage` implementation. |
| `src/lib/chat/memory.ts` | Builds bounded cross-conversation working context while excluding the active thread and preserving raw history. |

### Provider layer

| File | Responsibility |
| --- | --- |
| `src/lib/providers/provider.ts` | Defines the provider interface and helpers for constructing normalized start, delta, and finish events. |
| `src/lib/providers/registry.ts` | Builds the configured provider list from environment variables and resolves providers by ID. |
| `src/lib/providers/demo.ts` | Dependency-free streaming preview used for setup, UI development, and tests. |
| `src/lib/providers/ollama.ts` | Calls Ollama's native `/api/chat` endpoint and translates streamed JSON lines into shared events. |
| `src/lib/providers/openai-compatible.ts` | Calls `/chat/completions` with streaming enabled and translates OpenAI-style SSE data lines for vLLM, SGLang, Hugging Face, and custom APIs. |

### Tests and database

| File | Responsibility |
| --- | --- |
| `tests/stream.test.ts` | Verifies that fragmented, multibyte NDJSON streams are reconstructed correctly. |
| `tests/api-chat.test.ts` | Exercises the chat route with the demo provider and verifies invalid-request rejection. |
| `tests/memory.test.ts` | Verifies cross-chat context injection, active-thread isolation, and conversation limits. |
| `supabase/migrations/001_chat_memory.sql` | Optional Postgres schema for authenticated conversations/messages, indexes, RLS ownership policies, idempotency, and update timestamps. |

### Repository-local Codex skills

These files are development guidance for coding agents; they are not bundled into the web application.

| File | Responsibility |
| --- | --- |
| `skills/build-nextjs-chat-ui/SKILL.md` | Workflow and guardrails for building the accessible Next.js chat interface. |
| `skills/build-nextjs-chat-ui/references/chat-ui-patterns.md` | Detailed component, state, transcript, composer, responsive, and test patterns. |
| `skills/build-nextjs-chat-ui/agents/openai.yaml` | Display metadata and default prompt for the UI-building skill. |
| `skills/debug-nextjs-frontend/SKILL.md` | Reproduction-first workflow for diagnosing Next.js and React defects. |
| `skills/debug-nextjs-frontend/references/diagnostic-playbook.md` | Symptom-specific checks for hydration, state, streams, routing, layout, and performance. |
| `skills/debug-nextjs-frontend/agents/openai.yaml` | Display metadata and default prompt for the frontend-debugging skill. |
| `skills/deliver-model-streams/SKILL.md` | Workflow and guardrails for reliable, cancellable model streaming. |
| `skills/deliver-model-streams/references/streaming-protocols.md` | Transport choices, event design, adapter notes, robust parsing, and operational guidance. |
| `skills/deliver-model-streams/agents/openai.yaml` | Display metadata and default prompt for the model-streaming skill. |
| `skills/design-chat-memory/SKILL.md` | Workflow and guardrails for durable chat history and derived memory architecture. |
| `skills/design-chat-memory/references/architecture.md` | Storage-layer choices, baseline schema, Supabase safety, and memory lifecycle guidance. |
| `skills/design-chat-memory/agents/openai.yaml` | Display metadata and default prompt for the chat-memory skill. |

## Generated and local-only paths

The following may exist in a working copy but are not authored source files:

- `.env.local` contains local settings and secrets and is ignored by Git.
- `node_modules/` contains installed npm dependencies.
- `.next/` contains generated development and production build output.
- `coverage/` contains generated test coverage output when enabled.
- `*.log`, `.dev-server.*`, and similar files contain local process logs.

## Contribution conventions

Use `PascalCase` for React components and types, `camelCase` for functions and variables, and `kebab-case` for route and utility filenames. Keep provider data out of UI components, preserve stable message IDs and explicit roles, and add tests for behavior changes. Prefer focused Conventional Commits such as `feat: add Ollama streaming adapter`.
