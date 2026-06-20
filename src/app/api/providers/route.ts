import { getProviders } from "@/lib/providers/registry";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ providers: getProviders().map((provider) => provider.summary) });
}
