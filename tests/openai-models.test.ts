import { describe, expect, it } from "vitest";
import { isGPTTextModel } from "@/lib/openai/models";
import { pricingForModel } from "@/lib/openai/pricing";

describe("OpenAI model catalog", () => {
  it("keeps GPT text models and excludes incompatible modalities", () => {
    expect(isGPTTextModel("gpt-5")).toBe(true);
    expect(isGPTTextModel("gpt-4.1-mini-2025-04-14")).toBe(true);
    expect(isGPTTextModel("gpt-4o-realtime-preview")).toBe(false);
    expect(isGPTTextModel("o3")).toBe(false);
  });

  it("inherits base-model prices for dated snapshots", () => {
    expect(pricingForModel("gpt-4.1-mini-2025-04-14")?.inputPerMillion).toBe(0.4);
    expect(pricingForModel("unknown-model")).toBeUndefined();
  });
});
