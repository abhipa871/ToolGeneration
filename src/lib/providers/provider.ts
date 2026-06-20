import type { ChatRequest, ProviderSummary, StreamEvent } from "@/lib/chat/types";

export interface ModelProvider {
  summary: ProviderSummary;
  stream(request: ChatRequest, signal: AbortSignal): AsyncGenerator<StreamEvent>;
}

export const event = {
  start: (requestId: string, model: string): StreamEvent => ({ version: 1, type: "start", requestId, model }),
  delta: (requestId: string, sequence: number, delta: string): StreamEvent => ({
    version: 1,
    type: "text-delta",
    requestId,
    sequence,
    delta,
  }),
  finish: (requestId: string, reason = "stop"): StreamEvent => ({
    version: 1,
    type: "finish",
    requestId,
    reason,
  }),
};
