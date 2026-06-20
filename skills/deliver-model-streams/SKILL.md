---
name: deliver-model-streams
description: Design, implement, and troubleshoot streaming delivery from local or hosted language models to chat clients. Use for Hugging Face Transformers, Ollama, vLLM, SGLang, OpenAI-compatible APIs, SSE or fetch streams, provider adapters, backpressure, cancellation, tool-call events, usage accounting, retries, timeouts, observability, and secure API proxying.
---

# Deliver Model Streams

## Workflow

1. Inspect the current provider APIs, runtime, deployment proxies, and client event contract.
2. Define one internal request model and one typed event protocol before adding adapters.
3. Normalize provider deltas into semantic events such as `start`, `text-delta`, `tool-call`, `usage`, `finish`, and `error`.
4. Keep credentials and provider SDKs server-side. Validate model IDs, parameters, payload size, and authorization.
5. Propagate cancellation from browser disconnect through the server to the provider or local generation loop.
6. Decode incrementally, respect backpressure, and avoid buffering the full completion.
7. Retry only before output becomes visible unless the protocol supports safe resume. Never silently duplicate partial output.
8. Record time-to-first-token, generation duration, terminal reason, provider/model, errors, and usage without logging sensitive prompts by default.
9. Test fragmented chunks, slow consumers, disconnects, provider errors, malformed events, concurrency, and proxy buffering.

Read [references/streaming-protocols.md](references/streaming-protocols.md) when selecting a transport or implementing an adapter.

## Guardrails

- Do not expose local model servers directly to untrusted networks.
- Do not assume all "OpenAI-compatible" servers emit identical fields or terminal events.
- Bound timeouts, concurrency, queue depth, context size, and generated tokens.
- Separate retryable transport failure from model refusal or application validation errors.
- Preserve finish reasons and tool-call structure instead of flattening everything to text.

## Deliverables

Provide the normalized contract, adapter implementation, cancellation and error behavior, configuration variables, observability points, and tests across at least one success and one interrupted stream.
