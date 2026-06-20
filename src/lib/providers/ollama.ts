import type { ChatRequest, StreamEvent } from "@/lib/chat/types";
import { event, type ModelProvider } from "./provider";

export function createOllamaProvider(baseUrl: string, model: string): ModelProvider {
  return {
    summary: {
      id: "ollama",
      name: "Ollama",
      description: "Local Ollama runtime",
      defaultModel: model,
      configured: true,
      local: true,
    },
    async *stream(request: ChatRequest, signal: AbortSignal): AsyncGenerator<StreamEvent> {
      const requestId = crypto.randomUUID();
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: request.model, messages: request.messages, stream: true }),
        signal,
      });
      if (!response.ok || !response.body) throw new Error(`Ollama returned ${response.status}`);
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
          if (!line.trim()) continue;
          const parsed = JSON.parse(line) as { message?: { content?: string }; done?: boolean; done_reason?: string };
          if (parsed.message?.content) yield event.delta(requestId, sequence++, parsed.message.content);
          if (parsed.done) yield event.finish(requestId, parsed.done_reason);
        }
        if (done) break;
      }
    },
  };
}
