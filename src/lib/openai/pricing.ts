import type { ModelPricing } from "@/lib/chat/types";

// USD per 1M tokens. Models returned by the API but absent here are shown as
// unpriced and link to the canonical pricing page instead of guessing.
const PRICING: Array<{ prefix: string; input: number; output: number; cachedInput?: number }> = [
  { prefix: "gpt-5-nano", input: 0.05, output: 0.4, cachedInput: 0.005 },
  { prefix: "gpt-5-mini", input: 0.25, output: 2, cachedInput: 0.025 },
  { prefix: "gpt-5", input: 1.25, output: 10, cachedInput: 0.125 },
  { prefix: "gpt-4.1-nano", input: 0.1, output: 0.4, cachedInput: 0.025 },
  { prefix: "gpt-4.1-mini", input: 0.4, output: 1.6, cachedInput: 0.1 },
  { prefix: "gpt-4.1", input: 2, output: 8, cachedInput: 0.5 },
  { prefix: "gpt-4o-mini", input: 0.15, output: 0.6, cachedInput: 0.075 },
  { prefix: "gpt-4o", input: 2.5, output: 10, cachedInput: 1.25 },
];

export const OPENAI_PRICING_URL = "https://openai.com/api/pricing/";

export function pricingForModel(model: string): ModelPricing | undefined {
  const match = PRICING.find((entry) => model === entry.prefix || model.startsWith(`${entry.prefix}-`));
  if (!match) return undefined;
  return {
    inputPerMillion: match.input,
    outputPerMillion: match.output,
    cachedInputPerMillion: match.cachedInput,
    currency: "USD",
    sourceUrl: OPENAI_PRICING_URL,
  };
}
