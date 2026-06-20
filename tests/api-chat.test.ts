import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/chat/route";
import { parseEventStream } from "@/lib/chat/stream";
import type { StreamEvent } from "@/lib/chat/types";

describe("POST /api/chat", () => {
  it("streams normalized demo events through the route", async () => {
    const request = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerId: "demo",
        model: "aurora-demo",
        messages: [{ role: "user", content: "Hello" }],
      }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/x-ndjson");
    const events: StreamEvent[] = [];
    for await (const event of parseEventStream(response.body!)) events.push(event);
    expect(events[0].type).toBe("start");
    expect(events.some((event) => event.type === "text-delta")).toBe(true);
    expect(events.at(-1)?.type).toBe("finish");
  });

  it("rejects invalid requests before provider access", async () => {
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({ providerId: "demo", messages: [] }),
      }),
    );
    expect(response.status).toBe(400);
  });
});
