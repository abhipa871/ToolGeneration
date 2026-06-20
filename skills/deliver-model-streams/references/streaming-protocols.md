# Model Streaming Protocols

## Transport Choice

- Use streaming `fetch` responses for POST requests, custom headers, and simple one-way token delivery.
- Use SSE framing when named events, IDs, and interoperable text framing are useful. Native `EventSource` is GET-oriented and has limited header control.
- Use WebSockets only when the application truly needs long-lived bidirectional events beyond request cancellation and tool-result submission.

## Internal Event Shape

Every event should carry a request/message ID and monotonic sequence. Define variants for start metadata, text deltas, reasoning deltas if intentionally exposed, structured tool-call deltas, usage, finish reason, and normalized error. Version the wire protocol.

## Adapter Notes

- Ollama: support its native streamed JSON format and optionally its compatibility endpoints; confirm behavior from the running version.
- vLLM and SGLang: prefer their OpenAI-compatible servers, but feature-detect models, tool calls, usage, and finish events.
- Hugging Face Transformers: run generation off the request loop, use a streamer or callback bridge, and stop generation when the client aborts.
- External APIs: preserve provider request IDs and rate-limit metadata while mapping errors into stable application categories.

## Robust Parsing

Use an incremental UTF-8 decoder. Buffer incomplete lines/frames between chunks. Accept multiple events in one chunk and one event split across many chunks. Treat clean EOF, explicit finish, abort, timeout, and parse failure as distinct terminal outcomes.

## Operations

Set separate connect, first-token, idle-stream, and total-generation timeouts. Limit concurrent generations per user and per backend. Expose readiness separately from process liveness. Disable proxy buffering and compression only where they impede low-latency streaming, then verify behavior through the production path.
