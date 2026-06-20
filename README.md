# Luma Chat

Luma Chat is a provider-agnostic, ChatGPT-style web interface for streaming responses from local and hosted language models. It provides one server-side chat contract for a built-in demo, Ollama, vLLM, SGLang, Hugging Face endpoints, and arbitrary OpenAI-compatible APIs.

The application is built with Next.js 16, React 19, strict TypeScript, and Supabase Auth. Conversations are stored in Supabase under the signed-in user, while model credentials remain on the server.

## What the application does

- Streams model output into a stable assistant message.
- Switches between configured providers and their default models.
- Cancels an active generation with `AbortController`.
- Renders Markdown and GitHub Flavored Markdown.
- Supports personal email/password accounts and Google OAuth.
- Stores each conversation and its messages in Supabase with row-level user isolation.
- Lets each user securely connect an OpenAI API key and discover the GPT text models available to that key.
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
- A Supabase project with the included migrations applied

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
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key used for Auth and RLS-scoped data access. |
| `SUPABASE_SECRET_KEY` | Server-only Supabase secret key used exclusively for encrypted credential rows. Never prefix with `NEXT_PUBLIC_`. |
| `API_KEY_ACTIVE_VERSION` | Version used when encrypting newly submitted provider keys. |
| `API_KEY_ENCRYPTION_KEYS` | JSON keyring of version names to 32-byte base64 AES keys. Keep server-only. |

An optional provider is exposed by `GET /api/providers` only when its base URL is configured. The response contains safe provider metadata and never returns API keys.

### Adding a provider

Implement the `ModelProvider` interface in `src/lib/providers/`, translate the provider's native stream into normalized `StreamEvent` values, and register it in `registry.ts`. Keep provider-specific payloads, credentials, parsing, and errors inside the adapter. The UI should continue to use only the shared chat contract.

## Authentication and persistence

Apply both files in `supabase/migrations/`. Email/password authentication works with Supabase's email provider. For Google login, enable Google under **Authentication → Sign In / Providers** in the Supabase dashboard, add your Google OAuth client ID and secret, and configure `http://localhost:3000/auth/callback` plus the production callback URL in the redirect allow list.

The active `SupabaseConversationRepository` calls authenticated server routes. `conversations.user_id` references `auth.users`, messages cascade with their conversation, and RLS policies restrict every operation to the signed-in user. Ordinary conversation access uses the publishable key; only the encrypted BYOK vault uses the server secret described below.

### OpenAI BYOK setup

Apply migrations `003_encrypted_api_credentials.sql` and `004_deny_direct_credential_access.sql`, then add a Supabase server secret and an encryption keyring to `.env.local`. Generate a 32-byte encryption key without committing it:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Set that output as the `v1` value in `API_KEY_ENCRYPTION_KEYS`. The browser submits a key once over HTTPS; the backend validates it with OpenAI, encrypts it using AES-256-GCM with user/provider/version associated data, and stores only ciphertext, nonce, authentication tag, version, and a four-character hint. Credential tables revoke browser roles and have explicit deny policies. Decryption occurs only inside server code immediately before a fixed-host OpenAI request.

To rotate encryption keys, add a new version without removing the previous version, switch `API_KEY_ACTIVE_VERSION`, re-save/re-encrypt existing credentials, verify no rows use the retired version, and only then remove the old key. Database backups may retain old ciphertext according to the Supabase backup-retention policy.

Available GPT text models are fetched from OpenAI's Models API for the connected key. Known per-million-token prices are displayed from the server catalog; unknown or newly released models link to [official OpenAI API pricing](https://openai.com/api/pricing/) rather than showing a guessed price. Usage is billed directly to the user's OpenAI account.

When a message is sent, `memory.ts` creates read-only working context from up to eight other conversations and the twelve most recent non-streaming messages in each. Individual excerpts and total injected context are character-limited. The memory is sent to the model but is not added to the visible thread or persisted as a duplicate message. Deleting a conversation removes it from future cross-chat memory.

## Security and current boundaries

- API keys stay in server environment variables.
- User-supplied OpenAI keys are encrypted at rest, never returned to the browser, and excluded from logs, conversations, URLs, and browser storage.
- The chat route validates provider/model fields, message count, roles, and content length.
- Generated Markdown is rendered as React elements; raw HTML is not enabled.
- External links open in a new tab with `noopener` and `noreferrer`.
- Local model servers should not be exposed directly to untrusted networks.
- The app does not yet include rate limiting, password recovery, uploads, or tool calls.
- Production deployments should add distributed rate limits and spend alerts at the application and OpenAI project levels.

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
| `src/app/page.tsx` | Authenticated home page that selects the login or chat experience. |
| `src/app/globals.css` | Complete visual system: layout, sidebar, provider menu, transcript, Markdown, composer, responsive breakpoints, and reduced-motion behavior. |
| `src/app/api/providers/route.ts` | Dynamic `GET` endpoint that returns safe summaries of configured providers. |
| `src/app/api/chat/route.ts` | Dynamic `POST` endpoint that validates requests, selects an adapter, streams normalized NDJSON, handles cancellation, and maps failures to error events. |
| `src/app/api/openai/key/route.ts` | Authenticated, same-origin OpenAI key validation, encrypted storage, rotation, status, and deletion. |

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
| `src/lib/chat/repository.ts` | Defines the conversation repository interface and authenticated API implementation. |
| `src/lib/chat/memory.ts` | Builds bounded cross-conversation working context while excluding the active thread and preserving raw history. |
| `src/lib/security/api-key-crypto.ts` | Versioned AES-256-GCM encryption and decryption with tenant-bound associated data. |
| `src/lib/openai/credentials.ts` | Server-only encrypted credential persistence and metadata-only audit events. |

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
| `supabase/migrations/001_chat_memory.sql` | Base conversation and message schema. |
| `supabase/migrations/002_authenticated_conversations.sql` | Connects conversation ownership to Supabase Auth and installs RLS policies. |
| `supabase/migrations/003_encrypted_api_credentials.sql` | Adds server-only encrypted credential and audit tables. |
| `supabase/migrations/004_deny_direct_credential_access.sql` | Adds explicit deny policies for browser database roles. |

## Generated and local-only paths

The following may exist in a working copy but are not authored source files:

- `.env.local` contains local settings and secrets and is ignored by Git.
- `node_modules/` contains installed npm dependencies.
- `.next/` contains generated development and production build output.
- `coverage/` contains generated test coverage output when enabled.
- `*.log`, `.dev-server.*`, and similar files contain local process logs.

## Contribution conventions

Use `PascalCase` for React components and types, `camelCase` for functions and variables, and `kebab-case` for route and utility filenames. Keep provider data out of UI components, preserve stable message IDs and explicit roles, and add tests for behavior changes. Prefer focused Conventional Commits such as `feat: add Ollama streaming adapter`.
