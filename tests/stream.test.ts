import { describe, expect, it } from "vitest";
import { parseEventStream } from "@/lib/chat/stream";
import type { StreamEvent } from "@/lib/chat/types";

function fragmentedStream(text: string, cuts: number[]) {
  const encoder = new TextEncoder();
  let offset = 0;
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const cut of cuts) {
        controller.enqueue(encoder.encode(text.slice(offset, cut)));
        offset = cut;
      }
      controller.enqueue(encoder.encode(text.slice(offset)));
      controller.close();
    },
  });
}

describe("parseEventStream", () => {
  it("parses multiple events fragmented across arbitrary chunks", async () => {
    const events: StreamEvent[] = [
      { version: 1, type: "start", requestId: "r1", model: "demo" },
      { version: 1, type: "text-delta", requestId: "r1", sequence: 0, delta: "Hello 🌿" },
      { version: 1, type: "finish", requestId: "r1", reason: "stop" },
    ];
    const wire = events.map((event) => JSON.stringify(event)).join("\n");
    const received: StreamEvent[] = [];
    for await (const event of parseEventStream(fragmentedStream(wire, [1, 8, 31, 77]))) received.push(event);
    expect(received).toEqual(events);
  });
});
