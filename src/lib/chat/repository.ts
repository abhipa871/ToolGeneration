import type { Conversation } from "./types";

export interface ConversationRepository {
  list(): Promise<Conversation[]>;
  save(conversation: Conversation): Promise<void>;
  remove(id: string): Promise<void>;
}

export class SupabaseConversationRepository implements ConversationRepository {
  async list(): Promise<Conversation[]> {
    const response = await fetch("/api/conversations", { cache: "no-store" });
    if (!response.ok) throw new Error((await response.text()) || "Unable to load conversations");
    return ((await response.json()) as { conversations: Conversation[] }).conversations;
  }

  async save(conversation: Conversation): Promise<void> {
    const response = await fetch("/api/conversations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(conversation),
    });
    if (!response.ok) throw new Error((await response.text()) || "Unable to save conversation");
  }

  async remove(id: string): Promise<void> {
    const response = await fetch(`/api/conversations?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!response.ok) throw new Error((await response.text()) || "Unable to delete conversation");
  }
}
