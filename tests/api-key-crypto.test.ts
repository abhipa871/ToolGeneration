import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decryptApiKey, encryptApiKey } from "@/lib/security/api-key-crypto";

describe("API key encryption", () => {
  beforeEach(() => {
    process.env.API_KEY_ACTIVE_VERSION = "test-v1";
    process.env.API_KEY_ENCRYPTION_KEYS = JSON.stringify({ "test-v1": Buffer.alloc(32, 7).toString("base64") });
  });

  afterEach(() => {
    delete process.env.API_KEY_ACTIVE_VERSION;
    delete process.env.API_KEY_ENCRYPTION_KEYS;
  });

  it("round-trips with AES-GCM without storing plaintext", () => {
    const encrypted = encryptApiKey("sk-example-secret", "user-1", "openai");
    expect(encrypted.encryptedKey).not.toContain("sk-example-secret");
    expect(decryptApiKey(encrypted, "user-1", "openai")).toBe("sk-example-secret");
  });

  it("rejects ciphertext moved to another user", () => {
    const encrypted = encryptApiKey("sk-example-secret", "user-1", "openai");
    expect(() => decryptApiKey(encrypted, "user-2", "openai")).toThrow();
  });
});
