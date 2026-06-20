import type { StreamEvent } from "./types";

export async function* parseEventStream(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<StreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.trim()) yield JSON.parse(line) as StreamEvent;
      }

      if (done) break;
    }
    if (buffer.trim()) yield JSON.parse(buffer) as StreamEvent;
  } finally {
    reader.releaseLock();
  }
}
