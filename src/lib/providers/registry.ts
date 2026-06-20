import type { ModelProvider } from "./provider";
import { demoProvider } from "./demo";
import { createOllamaProvider } from "./ollama";
import { createOpenAICompatibleProvider } from "./openai-compatible";

function optionalProvider(
  id: string,
  name: string,
  description: string,
  baseUrl: string | undefined,
  model: string,
  apiKey?: string,
  local = false,
): ModelProvider | undefined {
  if (!baseUrl) return undefined;
  return createOpenAICompatibleProvider({
    baseUrl,
    apiKey,
    summary: { id, name, description, defaultModel: model, configured: true, local },
  });
}

export function getProviders(): ModelProvider[] {
  return [
    demoProvider,
    createOllamaProvider(process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434", process.env.OLLAMA_MODEL ?? "llama3.2"),
    optionalProvider("vllm", "vLLM", "High-throughput local inference", process.env.VLLM_BASE_URL, process.env.VLLM_MODEL ?? "local-model", process.env.VLLM_API_KEY, true),
    optionalProvider("sglang", "SGLang", "Fast structured generation", process.env.SGLANG_BASE_URL, process.env.SGLANG_MODEL ?? "local-model", process.env.SGLANG_API_KEY, true),
    optionalProvider("huggingface", "Hugging Face", "Hosted or dedicated inference", process.env.HUGGINGFACE_BASE_URL, process.env.HUGGINGFACE_MODEL ?? "open-model", process.env.HUGGINGFACE_API_KEY),
    optionalProvider("api", "Custom API", "OpenAI-compatible remote endpoint", process.env.MODEL_API_BASE_URL, process.env.MODEL_API_MODEL ?? "default", process.env.MODEL_API_KEY),
  ].filter((provider): provider is ModelProvider => Boolean(provider));
}

export function getProvider(id: string) {
  return getProviders().find((provider) => provider.summary.id === id);
}
