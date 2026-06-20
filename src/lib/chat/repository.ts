import type { Conversation } from "./types";

export interface ConversationRepository {
  list(): Conversation[];
  save(conversation: Conversation): void;
  remove(id: string): void;
}

const STORAGE_KEY = "local-chat-studio:conversations:v1";

export class BrowserConversationRepository implements ConversationRepository {
  list(): Conversation[] {
    if (typeof window === "undefined") return [];
    try {
      const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "[]") as Conversation[];
      return parsed.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    } catch {
      return [];
    }
  }

  save(conversation: Conversation): void {
    const conversations = this.list().filter((item) => item.id !== conversation.id);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([conversation, ...conversations].slice(0, 100)));
  }

  remove(id: string): void {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(this.list().filter((item) => item.id !== id)),
    );
  }
}
