"use client";

import { ArrowRight, Eye, EyeOff, Sparkles } from "lucide-react";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AuthCapabilities } from "@/lib/supabase/auth-capabilities";

export function AuthScreen({ capabilities }: { capabilities: AuthCapabilities }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    const supabase = createClient();
    const result = mode === "signup"
      ? await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        })
      : await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (result.error) return setError(result.error.message);
    if (mode === "signup" && !result.data.session) {
      setMessage("Check your inbox to confirm your email, then come back to sign in.");
      return;
    }
    window.location.assign("/");
  }

  async function continueWithGoogle() {
    if (!capabilities.google) {
      setError("Google sign-in has not been enabled for this Supabase project yet. You can still use email and password.");
      return;
    }
    setBusy(true);
    setError("");
    const { error: oauthError } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) {
      setBusy(false);
      setError(oauthError.message);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-story" aria-label="About Luma">
        <div className="auth-brand"><span className="brand-mark"><Sparkles size={17} /></span><span>Luma</span></div>
        <div className="auth-story-copy">
          <p className="eyebrow">YOUR OPEN MODEL WORKSPACE</p>
          <h1>Ideas deserve<br />a place to unfold.</h1>
          <p>Keep every conversation close, move between models, and return whenever inspiration finds you.</p>
        </div>
        <div className="auth-quote">Private conversations. Thoughtful tools. Your space.</div>
      </section>

      <section className="auth-panel">
        <div className="auth-card">
          <div className="auth-mobile-brand"><span className="brand-mark"><Sparkles size={17} /></span><span>Luma</span></div>
          <p className="auth-kicker">{mode === "login" ? "WELCOME BACK" : "CREATE YOUR SPACE"}</p>
          <h2>{mode === "login" ? "Continue your thinking" : "Start something meaningful"}</h2>
          <p className="auth-subtitle">{mode === "login" ? "Sign in to return to your conversations." : "Create an account with your personal email."}</p>

          <button suppressHydrationWarning className="google-button" type="button" onClick={continueWithGoogle} disabled={busy || !capabilities.google}>
            <svg aria-hidden="true" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.55h3.24c1.9-1.75 2.98-4.33 2.98-7.42Z"/><path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.35l-3.24-2.55c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.93A6.02 6.02 0 0 1 6.07 12c0-.67.12-1.32.32-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.38 3.14 1.04 4.55l3.35-2.62Z"/><path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.82 1.5l2.88-2.88A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z"/></svg>
            {capabilities.google ? "Continue with Google" : "Google sign-in unavailable"}
          </button>
          {!capabilities.google && <p className="provider-note">Enable Google in Supabase Authentication → Providers to use this option.</p>}

          <div className="auth-divider"><span>or continue with email</span></div>
          <form onSubmit={submit} className="auth-form">
            <label>Email address<input suppressHydrationWarning type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label>
            <label>Password
              <span className="password-field">
                <input suppressHydrationWarning type={showPassword ? "text" : "password"} autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={6} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" />
                <button suppressHydrationWarning type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
              </span>
            </label>
            {error && <p className="auth-feedback auth-error" role="alert">{error}</p>}
            {message && <p className="auth-feedback auth-success" role="status">{message}</p>}
            <button suppressHydrationWarning className="auth-submit" disabled={busy}>{busy ? "One moment…" : mode === "login" ? "Sign in" : "Create account"}<ArrowRight size={17} /></button>
          </form>
          <p className="auth-switch">{mode === "login" ? "New to Luma?" : "Already have an account?"}<button suppressHydrationWarning onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setMessage(""); }}>{mode === "login" ? "Create an account" : "Sign in"}</button></p>
          <p className="auth-terms">By continuing, you agree to use Luma responsibly.</p>
        </div>
      </section>
    </main>
  );
}
