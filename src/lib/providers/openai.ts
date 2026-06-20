import type { ChatRequest, ProviderSummary, StreamEvent } from "@/lib/chat/types";
import { event, type ModelProvider } from "./provider";

export function createOpenAIProvider(apiKey: string, summary?: ProviderSummary): ModelProvider {
  return {
    summary: summary ?? {
      id: "openai",
      name: "OpenAI",
      description: "Your encrypted API key",
      defaultModel: "gpt-5",
      configured: true,
      local: false,
    },
    async *stream(request: ChatRequest, signal: AbortSignal): AsyncGenerator<StreamEvent> {
      const requestId = crypto.randomUUID();
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: request.model,
          input: request.messages.map((message) => ({ role: message.role, content: message.content })),
          stream: true,
        }),
        signal,
      });
      if (!response.ok || !response.body) throw new Error(`OpenAI request failed (${response.status})`);

      yield event.start(requestId, request.model);
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let sequence = 0;
      let finished = false;

      while (true) {
        const { done, value } = await reader.read();
        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;
          const payload = JSON.parse(data) as {
            type?: string;
            delta?: string;
            message?: string;
            response?: {
              status?: string;
              error?: { message?: string };
              usage?: { input_tokens?: number; output_tokens?: number };
            };
          };
          if (payload.type === "response.output_text.delta" && payload.delta) {
            yield event.delta(requestId, sequence++, payload.delta);
          } else if (payload.type === "response.completed") {
            if (payload.response?.usage) {
              yield {
                version: 1,
                type: "usage",
                requestId,
                inputTokens: payload.response.usage.input_tokens,
                outputTokens: payload.response.usage.output_tokens,
              };
            }
            yield event.finish(requestId, payload.response?.status ?? "completed");
            finished = true;
          } else if (payload.type === "response.failed" || payload.type === "error") {
            throw new Error("OpenAI could not complete this response");
          }
        }
        if (done) break;
      }
      if (!finished) yield event.finish(requestId);
    },
  };
}
