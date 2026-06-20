import { getProviders } from "@/lib/providers/registry";
import { createClient } from "@/lib/supabase/server";
import { credentialStatus, getOpenAIKey } from "@/lib/openai/credentials";
import { listGPTModels } from "@/lib/openai/models";
import type { ProviderSummary } from "@/lib/chat/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const providers = getProviders().map((provider) => provider.summary);
  if (!user) return Response.json({ providers });

  let openai: ProviderSummary = {
    id: "openai",
    name: "OpenAI",
    description: "Add your API key to unlock GPT models",
    defaultModel: "gpt-5",
    configured: false,
    local: false,
    models: [],
  };
  try {
    const status = await credentialStatus(user.id);
    if (status.configured) {
      let key = await getOpenAIKey(user.id);
      if (key) {
        try {
          const models = await listGPTModels(key, AbortSignal.timeout(10_000));
          openai = {
            ...openai,
            configured: true,
            description: `Encrypted key ${status.keyHint}`,
            defaultModel: models.find((model) => model.id === "gpt-5")?.id ?? models[0]?.id ?? "gpt-5",
            models,
          };
        } finally {
          key = "";
        }
      }
    }
  } catch {
    // Keep OpenAI visible but unconfigured when secure server storage is unavailable.
  }
  return Response.json({ providers: [...providers, openai] }, { headers: { "Cache-Control": "private, no-store" } });
}
