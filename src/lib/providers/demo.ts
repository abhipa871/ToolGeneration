import type { ModelProvider } from "./provider";
import { event } from "./provider";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const demoProvider: ModelProvider = {
  summary: {
    id: "demo",
    name: "Studio Demo",
    description: "Built-in streaming preview",
    defaultModel: "aurora-demo",
    configured: true,
    local: true,
  },
  async *stream(request, signal) {
    const requestId = crypto.randomUUID();
    const prompt = request.messages.at(-1)?.content ?? "";
    const response = `You’re connected to the built-in streaming preview. I received: “${prompt.slice(0, 180)}”\n\nConnect Ollama, vLLM, SGLang, Hugging Face, or another OpenAI-compatible endpoint in your environment file to replace this demo response.`;
    yield event.start(requestId, request.model);
    let sequence = 0;
    for (const token of response.match(/\S+\s*/g) ?? []) {
      if (signal.aborted) return;
      await sleep(22);
      yield event.delta(requestId, sequence++, token);
    }
    yield event.finish(requestId);
  },
};
