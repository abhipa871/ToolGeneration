import { AuthScreen } from "@/components/auth/auth-screen";
import { ChatApp } from "@/components/chat/chat-app";
import { createClient } from "@/lib/supabase/server";
import { getAuthCapabilities } from "@/lib/supabase/auth-capabilities";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const [{ data: { user } }, capabilities] = await Promise.all([
    supabase.auth.getUser(),
    getAuthCapabilities(),
  ]);
  return user ? <ChatApp userEmail={user.email ?? "Signed in"} /> : <AuthScreen capabilities={capabilities} />;
}
