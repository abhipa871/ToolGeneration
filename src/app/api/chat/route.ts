import type { ChatRequest, StreamEvent } from "@/lib/chat/types";
import { getProvider } from "@/lib/providers/registry";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function isValidRequest(value: unknown): value is ChatRequest {
  if (!value || typeof value !== "object") return false;
  const request = value as Partial<ChatRequest>;
  return (
    typeof request.providerId === "string" &&
    typeof request.model === "string" &&
    request.model.length <= 200 &&
    Array.isArray(request.messages) &&
    request.messages.length > 0 &&
    request.messages.length <= 200 &&
    request.messages.every(
      (message) =>
        ["user", "assistant", "system"].includes(message.role) &&
        typeof message.content === "string" &&
        message.content.length <= 100_000,
    )
  );
}

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!isValidRequest(payload)) return Response.json({ error: "Invalid chat request" }, { status: 400 });
  const provider = getProvider(payload.providerId);
  if (!provider) return Response.json({ error: "Provider is not configured" }, { status: 404 });

  const encoder = new TextEncoder();
  const iterator = provider.stream(payload, request.signal);
  const requestId = crypto.randomUUID();
  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const next = await iterator.next();
        if (next.done) return controller.close();
        controller.enqueue(encoder.encode(`${JSON.stringify(next.value)}\n`));
      } catch (error) {
        const event: StreamEvent = {
          version: 1,
          type: "error",
          requestId,
          code: request.signal.aborted ? "aborted" : "provider_error",
          message: request.signal.aborted ? "Generation stopped" : error instanceof Error ? error.message : "Provider failed",
          retryable: !request.signal.aborted,
        };
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
        controller.close();
      }
    },
    async cancel() {
      await iterator.return(undefined);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
