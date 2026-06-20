import { describe, expect, it } from "vitest";
import { buildConversationMemory, buildMessagesWithMemory } from "@/lib/chat/memory";
import type { ChatMessage, Conversation } from "@/lib/chat/types";

function message(id: string, role: ChatMessage["role"], content: string): ChatMessage {
  return { id, role, content, createdAt: "2026-01-01T00:00:00.000Z", status: "complete" };
}

function conversation(id: string, title: string, messages: ChatMessage[], updatedAt = "2026-01-01T00:00:00.000Z"): Conversation {
  return {
    id,
    title,
    providerId: "demo",
    model: "aurora-demo",
    messages,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt,
  };
}

describe("cross-conversation memory", () => {
  it("adds other conversations before the active thread", () => {
    const activeMessages = [message("m1", "user", "What was my preferred color?")];
    const conversations = [
      conversation("active", "Current", activeMessages),
      conversation("previous", "Preferences", [
        message("m2", "user", "My preferred color is green."),
        message("m3", "assistant", "I will remember that."),
      ]),
    ];

    const result = buildMessagesWithMemory(conversations, "active", activeMessages);

    expect(result).toHaveLength(2);
    expect(result[0].role).toBe("system");
    expect(result[0].content).toContain("Conversation: Preferences");
    expect(result[0].content).toContain("My preferred color is green.");
    expect(result[1]).toEqual({ role: "user", content: "What was my preferred color?" });
  });

  it("does not leak the active thread into its own memory", () => {
    const active = conversation("active", "Private active title", [message("m1", "user", "active-only text")]);

    expect(buildConversationMemory([active], "active")).toBeUndefined();
  });

  it("keeps only the eight most recently updated conversations", () => {
    const conversations = Array.from({ length: 10 }, (_, index) =>
      conversation(
        `conversation-${index}`,
        `Memory ${index}`,
        [message(`message-${index}`, "user", `detail-${index}`)],
        `2026-01-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`,
      ),
    );

    const memory = buildConversationMemory(conversations, "active");

    expect(memory?.content).toContain("Memory 9");
    expect(memory?.content).toContain("Memory 2");
    expect(memory?.content).not.toContain("Conversation: Memory 1\n");
    expect(memory?.content).not.toContain("Conversation: Memory 0\n");
  });
});
