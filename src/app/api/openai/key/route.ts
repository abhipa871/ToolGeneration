import { createClient } from "@/lib/supabase/server";
import { auditCredentialEvent, credentialStatus, deleteOpenAIKey, saveOpenAIKey } from "@/lib/openai/credentials";
import { listGPTModels } from "@/lib/openai/models";
import { hasSmallJsonBody, isSameOrigin } from "@/lib/security/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function userId() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

export async function GET() {
  const id = await userId();
  if (!id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return Response.json(await credentialStatus(id), { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return Response.json({ error: "OpenAI key storage is not configured" }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  const id = await userId();
  if (!id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid request origin" }, { status: 403 });
  if (!hasSmallJsonBody(request, 2048)) return Response.json({ error: "Request is too large" }, { status: 413 });

  let apiKey = "";
  try {
    const body = await request.json() as { apiKey?: unknown };
    if (typeof body.apiKey !== "string") return Response.json({ error: "An API key is required" }, { status: 400 });
    apiKey = body.apiKey.trim();
    if (apiKey.length < 20 || apiKey.length > 512 || /\s/.test(apiKey)) {
      return Response.json({ error: "The API key format is invalid" }, { status: 400 });
    }
    const models = await listGPTModels(apiKey, AbortSignal.timeout(10_000));
    if (!models.length) return Response.json({ error: "This key has no available GPT text models" }, { status: 400 });
    await saveOpenAIKey(id, apiKey);
    return Response.json({ configured: true, keyHint: `••••${apiKey.slice(-4)}`, models });
  } catch (error) {
    await auditCredentialEvent(id, "validation_failed");
    const message = error instanceof Error && error.message === "OpenAI rejected this API key"
      ? error.message
      : "The key could not be validated or securely stored";
    return Response.json({ error: message }, { status: 400 });
  } finally {
    apiKey = "";
  }
}

export async function DELETE(request: Request) {
  const id = await userId();
  if (!id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOrigin(request)) return Response.json({ error: "Invalid request origin" }, { status: 403 });
  try {
    await deleteOpenAIKey(id);
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "The encrypted key could not be deleted" }, { status: 503 });
  }
}
