# Repository Guidelines

## Project Purpose

Build a ChatGPT-style interface that streams responses from local or remote models. Keep the UI provider-agnostic: Hugging Face Transformers, vLLM, SGLang, Ollama, and external APIs must share one server-side chat contract.

## Project Structure & Module Organization

The repository is currently a scaffold. Organize new code consistently:

- `src/app/` for pages, layouts, and server endpoints.
- `src/components/chat/` for messages, composer, model picker, and controls.
- `src/lib/providers/` for provider adapters such as `ollama.ts`, `vllm.ts`, and `huggingface.ts`.
- `src/lib/chat/` for message types, streaming, persistence, and normalization.
- `tests/` for unit and integration tests mirroring `src/`.
- `public/` for static assets; `scripts/` for setup and model-launch helpers.

Keep model-specific logic out of UI components. Every adapter must support chat completion, streaming, cancellation, and normalized errors. Prefer OpenAI-compatible endpoints for vLLM and SGLang.

## Build, Test, and Development Commands

No toolchain is configured yet. Once the application is initialized, expose these root-level commands:

- `npm run dev` — start the web application locally.
- `npm run build` — create a production build and catch type errors.
- `npm test` — run unit and integration tests.
- `npm run lint` — run formatting and static analysis.

Document model-server commands separately, such as `ollama serve`. The frontend must not launch model processes.

## Coding Style & Naming Conventions

Use strict TypeScript and the configured formatter. Use `PascalCase` for React components and types, `camelCase` for functions and variables, and `kebab-case` for route and utility files. Keep components accessible and keyboard-friendly. Messages require explicit roles and stable IDs; provider-shaped data stays inside adapters.

## Testing Guidelines

Test adapters with mocked streams and HTTP responses. Cover streaming, cancellation, malformed responses, unavailable models, timeouts, and context limits. Name tests `*.test.ts` or `*.test.tsx`. Add browser tests for messaging, switching providers, stopping generation, and retaining history. Tests must not require a GPU or paid API.

## Security & Configuration

Read base URLs, model IDs, and API keys from environment variables validated on startup. Provide `.env.example`; never commit secrets or expose keys to browser bundles. Validate URLs, request sizes, uploads, and generated Markdown. Sanitize rendered HTML.

## Commit & Pull Request Guidelines

Use focused, imperative commits, preferably Conventional Commits (for example, `feat: add Ollama streaming adapter`). Pull requests should describe the user-visible change, providers tested, commands run, and relevant configuration. Include screenshots for UI changes and link related issues.
