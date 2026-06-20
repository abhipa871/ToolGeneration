import type { Conversation } from "@/lib/chat/types";
import { isConversation, isUuid } from "@/lib/chat/validation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type ConversationRow = {
  id: string;
  title: string;
  provider_id: string;
  model: string;
  created_at: string;
  updated_at: string;
  messages: Array<{
    id: string;
    role: Conversation["messages"][number]["role"];
    content: string;
    status: Conversation["messages"][number]["status"];
    created_at: string;
    position: number;
  }>;
};

async function authenticatedClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

export async function GET() {
  const { supabase, user } = await authenticatedClient();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase
    .from("conversations")
    .select("id,title,provider_id,model,created_at,updated_at,messages(id,role,content,status,created_at,position)")
    .order("updated_at", { ascending: false })
    .order("position", { referencedTable: "messages", ascending: true });
  if (error) return Response.json({ error: error.message }, { status: 503 });

  const conversations: Conversation[] = ((data ?? []) as ConversationRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    providerId: row.provider_id,
    model: row.model,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    messages: row.messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      status: message.status,
      createdAt: message.created_at,
    })),
  }));
  return Response.json({ conversations });
}

export async function PUT(request: Request) {
  let conversation: unknown;
  try {
    conversation = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!isConversation(conversation)) return Response.json({ error: "Invalid conversation" }, { status: 400 });
  const { supabase, user } = await authenticatedClient();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { error } = await supabase.rpc("save_conversation", { p_conversation: conversation });
  if (error) return Response.json({ error: error.message }, { status: 503 });
  return new Response(null, { status: 204 });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!isUuid(id)) return Response.json({ error: "Invalid conversation id" }, { status: 400 });
  const { supabase, user } = await authenticatedClient();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { error } = await supabase.from("conversations").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 503 });
  return new Response(null, { status: 204 });
}
