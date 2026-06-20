"use client";

import { ExternalLink, KeyRound, ShieldCheck, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

type KeyStatus = { configured: boolean; keyHint?: string; validatedAt?: string };

export function OpenAIKeyDialog({ open, onClose, onChanged }: { open: boolean; onClose: () => void; onChanged: () => Promise<void> }) {
  const [status, setStatus] = useState<KeyStatus>({ configured: false });
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    void fetch("/api/openai/key", { cache: "no-store" })
      .then(async (response) => {
        setApiKey("");
        setError("");
        const body = await response.json() as KeyStatus & { error?: string };
        if (!response.ok) throw new Error(body.error ?? "Unable to read key status");
        setStatus(body);
      })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Unable to read key status"));
  }, [open]);

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/openai/key", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });
      const body = await response.json() as KeyStatus & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "Unable to save the key");
      setApiKey("");
      setStatus(body);
      await onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to save the key");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/openai/key", { method: "DELETE" });
      if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? "Unable to delete the key");
      setStatus({ configured: false });
      setApiKey("");
      await onChanged();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to delete the key");
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;
  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="key-dialog" role="dialog" aria-modal="true" aria-labelledby="openai-key-title">
        <header>
          <span className="key-dialog-icon"><KeyRound size={18} /></span>
          <span><strong id="openai-key-title">OpenAI API key</strong><small>Bring your own key</small></span>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>

        <div className="key-security-note">
          <ShieldCheck size={17} />
          <p><strong>Encrypted before storage</strong><span>Your key crosses only this HTTPS request, is encrypted with AES-256-GCM on the server, and is never returned to the browser.</span></p>
        </div>

        {status.configured && (
          <div className="key-current">
            <span><strong>Connected</strong><small>{status.keyHint} · validated {status.validatedAt ? new Date(status.validatedAt).toLocaleDateString() : "recently"}</small></span>
            <button onClick={() => void remove()} disabled={busy}><Trash2 size={14} /> Remove</button>
          </div>
        )}

        <form onSubmit={save}>
          <label>{status.configured ? "Replace API key" : "API key"}
            <input type="password" autoComplete="off" spellCheck={false} value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="sk-…" required />
          </label>
          <p className="key-helper">The key is validated directly with OpenAI before it is stored. It is held in this field only until submission.</p>
          {error && <p className="key-error" role="alert">{error}</p>}
          <button className="key-save" disabled={busy || !apiKey.trim()}>{busy ? "Securing key…" : status.configured ? "Validate & replace" : "Validate & save securely"}</button>
        </form>

        <footer>
          <span>Usage is billed to your OpenAI account.</span>
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer noopener">Create a key <ExternalLink size={11} /></a>
        </footer>
      </section>
    </div>
  );
}
