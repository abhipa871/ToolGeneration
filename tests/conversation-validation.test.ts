import { describe, expect, it } from "vitest";
import { isConversation } from "@/lib/chat/validation";

const conversation = {
  id: "01976a20-e10c-7b4d-98c4-a287725f9c59",
  title: "One separate chat",
  providerId: "demo",
  model: "aurora-demo",
  createdAt: "2026-06-20T12:00:00.000Z",
  updatedAt: "2026-06-20T12:00:00.000Z",
  messages: [{
    id: "01976a20-f608-7f2e-8fa7-a34eaa7f6aae",
    role: "user",
    content: "Hello",
    status: "complete",
    createdAt: "2026-06-20T12:00:00.000Z",
  }],
};

describe("conversation persistence validation", () => {
  it("accepts a complete conversation", () => {
    expect(isConversation(conversation)).toBe(true);
  });

  it("rejects malformed identifiers and oversized messages", () => {
    expect(isConversation({ ...conversation, id: "shared-session" })).toBe(false);
    expect(isConversation({ ...conversation, messages: [{ ...conversation.messages[0], content: "x".repeat(100_001) }] })).toBe(false);
  });
});
