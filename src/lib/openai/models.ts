import "server-only";

import { pricingForModel } from "./pricing";
import type { ModelSummary } from "@/lib/chat/types";

const NON_TEXT_MODEL = /(audio|realtime|transcribe|tts|image|search|computer-use|instruct)/i;

export function isGPTTextModel(id: string) {
  return /^gpt-[a-z0-9][a-z0-9._-]*$/i.test(id) && !NON_TEXT_MODEL.test(id);
}

export async function listGPTModels(apiKey: string, signal?: AbortSignal): Promise<ModelSummary[]> {
  const response = await fetch("https://api.openai.com/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(response.status === 401 ? "OpenAI rejected this API key" : "OpenAI model discovery failed");
  const payload = await response.json() as { data?: Array<{ id?: string }> };
  return (payload.data ?? [])
    .flatMap((model) => model.id && isGPTTextModel(model.id) ? [{ id: model.id, name: model.id, pricing: pricingForModel(model.id) }] : [])
    .sort((a, b) => b.id.localeCompare(a.id, undefined, { numeric: true }));
}
