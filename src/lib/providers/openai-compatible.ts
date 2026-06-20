import type { ChatRequest, ProviderSummary, StreamEvent } from "@/lib/chat/types";
import { event, type ModelProvider } from "./provider";

type OpenAIProviderOptions = {
  summary: ProviderSummary;
  baseUrl: string;
  apiKey?: string;
};

export function createOpenAICompatibleProvider(options: OpenAIProviderOptions): ModelProvider {
  return {
    summary: options.summary,
    async *stream(request: ChatRequest, signal: AbortSignal): AsyncGenerator<StreamEvent> {
      const requestId = crypto.randomUUID();
      const response = await fetch(`${options.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
        },
        body: JSON.stringify({ model: request.model, messages: request.messages, stream: true }),
        signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Provider returned ${response.status}: ${(await response.text()).slice(0, 240)}`);
      }

      yield event.start(requestId, request.model);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let sequence = 0;

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const payload = line.replace(/^data:\s*/, "").trim();
          if (!payload || payload === "[DONE]") continue;
          const parsed = JSON.parse(payload) as {
            choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }>;
          };
          const choice = parsed.choices?.[0];
          if (choice?.delta?.content) yield event.delta(requestId, sequence++, choice.delta.content);
          if (choice?.finish_reason) yield event.finish(requestId, choice.finish_reason);
        }
        if (done) break;
      }
    },
  };
}
