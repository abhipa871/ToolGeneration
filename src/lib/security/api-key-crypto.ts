import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export type EncryptedSecret = {
  encryptedKey: string;
  encryptionIv: string;
  authTag: string;
  keyVersion: string;
};

function keyring() {
  const raw = process.env.API_KEY_ENCRYPTION_KEYS;
  const activeVersion = process.env.API_KEY_ACTIVE_VERSION;
  if (!raw || !activeVersion) throw new Error("API key encryption is not configured");

  let encodedKeys: Record<string, string>;
  try {
    encodedKeys = JSON.parse(raw) as Record<string, string>;
  } catch {
    throw new Error("API_KEY_ENCRYPTION_KEYS must be valid JSON");
  }
  const keys = new Map<string, Buffer>();
  for (const [version, encoded] of Object.entries(encodedKeys)) {
    const key = Buffer.from(encoded, "base64");
    if (key.length !== 32) throw new Error(`Encryption key ${version} must decode to exactly 32 bytes`);
    keys.set(version, key);
  }
  if (!keys.has(activeVersion)) throw new Error("API_KEY_ACTIVE_VERSION is missing from the encryption keyring");
  return { keys, activeVersion };
}

function aad(userId: string, provider: string, version: string) {
  return Buffer.from(`luma-api-key:${userId}:${provider}:${version}`, "utf8");
}

export function encryptApiKey(secret: string, userId: string, provider: string): EncryptedSecret {
  const { keys, activeVersion } = keyring();
  const key = keys.get(activeVersion)!;
  const iv = randomBytes(12);
  const plaintext = Buffer.from(secret, "utf8");
  try {
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    cipher.setAAD(aad(userId, provider, activeVersion));
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return {
      encryptedKey: ciphertext.toString("base64"),
      encryptionIv: iv.toString("base64"),
      authTag: cipher.getAuthTag().toString("base64"),
      keyVersion: activeVersion,
    };
  } finally {
    plaintext.fill(0);
  }
}

export function decryptApiKey(secret: EncryptedSecret, userId: string, provider: string) {
  const { keys } = keyring();
  const key = keys.get(secret.keyVersion);
  if (!key) throw new Error(`Encryption key version ${secret.keyVersion} is unavailable`);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(secret.encryptionIv, "base64"));
  decipher.setAAD(aad(userId, provider, secret.keyVersion));
  decipher.setAuthTag(Buffer.from(secret.authTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(secret.encryptedKey, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
