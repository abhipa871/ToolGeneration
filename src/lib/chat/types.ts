export type MessageRole = "user" | "assistant" | "system";

export type ChatMessage = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  status?: "streaming" | "complete" | "error" | "cancelled";
};

export type Conversation = {
  id: string;
  title: string;
  providerId: string;
  model: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
};

export type ChatRequest = {
  providerId: string;
  model: string;
  messages: Array<Pick<ChatMessage, "role" | "content">>;
};

export type StreamEvent =
  | { version: 1; type: "start"; requestId: string; model: string }
  | { version: 1; type: "text-delta"; requestId: string; sequence: number; delta: string }
  | { version: 1; type: "usage"; requestId: string; inputTokens?: number; outputTokens?: number }
  | { version: 1; type: "finish"; requestId: string; reason: string }
  | { version: 1; type: "error"; requestId: string; code: string; message: string; retryable: boolean };

export type ProviderSummary = {
  id: string;
  name: string;
  description: string;
  defaultModel: string;
  configured: boolean;
  local: boolean;
  models?: ModelSummary[];
};

export type ModelPricing = {
  inputPerMillion: number;
  outputPerMillion: number;
  cachedInputPerMillion?: number;
  currency: "USD";
  sourceUrl: string;
};

export type ModelSummary = {
  id: string;
  name: string;
  pricing?: ModelPricing;
};
