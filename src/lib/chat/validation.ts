import type { Conversation } from "./types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function isConversation(value: unknown): value is Conversation {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Conversation>;
  return (
    isUuid(item.id) &&
    typeof item.title === "string" && item.title.length > 0 && item.title.length <= 200 &&
    typeof item.providerId === "string" && item.providerId.length > 0 && item.providerId.length <= 100 &&
    typeof item.model === "string" && item.model.length > 0 && item.model.length <= 200 &&
    typeof item.createdAt === "string" && !Number.isNaN(Date.parse(item.createdAt)) &&
    typeof item.updatedAt === "string" && !Number.isNaN(Date.parse(item.updatedAt)) &&
    Array.isArray(item.messages) && item.messages.length <= 500 &&
    item.messages.every((message) =>
      isUuid(message.id) &&
      ["system", "user", "assistant"].includes(message.role) &&
      typeof message.content === "string" && message.content.length <= 100_000 &&
      typeof message.createdAt === "string" && !Number.isNaN(Date.parse(message.createdAt)) &&
      (!message.status || ["streaming", "complete", "error", "cancelled"].includes(message.status)),
    )
  );
}
