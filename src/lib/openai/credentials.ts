import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { decryptApiKey, encryptApiKey, type EncryptedSecret } from "@/lib/security/api-key-crypto";

type CredentialRow = {
  encrypted_key: string;
  encryption_iv: string;
  auth_tag: string;
  key_version: string;
  key_hint: string;
  validated_at: string;
  updated_at: string;
};

export async function credentialStatus(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_api_credentials")
    .select("key_hint,validated_at,updated_at")
    .eq("user_id", userId)
    .eq("provider", "openai")
    .maybeSingle();
  if (error) throw new Error("Unable to read OpenAI credential status");
  return data ? { configured: true, keyHint: data.key_hint, validatedAt: data.validated_at, updatedAt: data.updated_at } : { configured: false };
}

export async function saveOpenAIKey(userId: string, apiKey: string) {
  const admin = createAdminClient();
  const encrypted = encryptApiKey(apiKey, userId, "openai");
  const existing = await credentialStatus(userId);
  const { error } = await admin.from("user_api_credentials").upsert({
    user_id: userId,
    provider: "openai",
    encrypted_key: encrypted.encryptedKey,
    encryption_iv: encrypted.encryptionIv,
    auth_tag: encrypted.authTag,
    key_version: encrypted.keyVersion,
    key_hint: `••••${apiKey.slice(-4)}`,
    validated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,provider" });
  if (error) throw new Error("Unable to store the encrypted OpenAI key");
  await auditCredentialEvent(userId, existing.configured ? "rotated" : "created");
}

export async function deleteOpenAIKey(userId: string) {
  const admin = createAdminClient();
  const { error } = await admin.from("user_api_credentials").delete().eq("user_id", userId).eq("provider", "openai");
  if (error) throw new Error("Unable to delete the OpenAI key");
  await auditCredentialEvent(userId, "deleted");
}

export async function getOpenAIKey(userId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("user_api_credentials")
    .select("encrypted_key,encryption_iv,auth_tag,key_version,key_hint,validated_at,updated_at")
    .eq("user_id", userId)
    .eq("provider", "openai")
    .maybeSingle<CredentialRow>();
  if (error) throw new Error("Unable to retrieve the encrypted OpenAI key");
  if (!data) return undefined;
  const envelope: EncryptedSecret = {
    encryptedKey: data.encrypted_key,
    encryptionIv: data.encryption_iv,
    authTag: data.auth_tag,
    keyVersion: data.key_version,
  };
  return decryptApiKey(envelope, userId, "openai");
}

export async function auditCredentialEvent(userId: string, eventType: "created" | "rotated" | "deleted" | "validation_failed" | "used") {
  try {
    await createAdminClient().from("api_credential_events").insert({ user_id: userId, provider: "openai", event_type: eventType });
  } catch {
    // Audit failure must not expose credentials or override the primary result.
  }
}
