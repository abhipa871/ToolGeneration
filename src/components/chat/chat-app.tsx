"use client";

import {
  ArrowUp,
  Bot,
  Check,
  ChevronDown,
  CircleStop,
  Copy,
  Database,
  LogOut,
  KeyRound,
  Menu,
  MessageSquareText,
  PanelLeftClose,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { parseEventStream } from "@/lib/chat/stream";
import { SupabaseConversationRepository } from "@/lib/chat/repository";
import { buildMessagesWithMemory } from "@/lib/chat/memory";
import { createClient as createSupabaseClient } from "@/lib/supabase/client";
import type { ChatMessage, Conversation, ProviderSummary } from "@/lib/chat/types";
import { MessageContent } from "./message-content";
import { OpenAIKeyDialog } from "./openai-key-dialog";

const suggestions = [
  { title: "Design a small API", detail: "with clear error handling" },
  { title: "Explain a concept", detail: "like I’m a curious beginner" },
  { title: "Improve this code", detail: "for readability and speed" },
  { title: "Plan a project", detail: "from idea to first release" },
];

const repository = new SupabaseConversationRepository();

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function newConversation(provider?: ProviderSummary): Conversation {
  const now = new Date().toISOString();
  return {
    id: createId(),
    title: "New conversation",
    providerId: provider?.id ?? "demo",
    model: provider?.defaultModel ?? "aurora-demo",
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

function shortTitle(content: string) {
  const title = content.trim().replace(/\s+/g, " ");
  return title.length > 42 ? `${title.slice(0, 42)}…` : title;
}

export function ChatApp({ userEmail }: { userEmail: string }) {
  const [providers, setProviders] = useState<ProviderSummary[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState("");
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "streaming" | "error">("idle");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [providerOpen, setProviderOpen] = useState(false);
  const [copiedId, setCopiedId] = useState("");
  const [initializationError, setInitializationError] = useState("");
  const [keyDialogOpen, setKeyDialogOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);

  const active = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId),
    [conversations, activeId],
  );
  const selectedProvider = providers.find((provider) => provider.id === active?.providerId) ?? providers[0];

  useEffect(() => {
    let cancelled = false;
    async function hydrate() {
      try {
        const response = await fetch("/api/providers");
        if (!response.ok) throw new Error(`Provider discovery returned ${response.status}`);
        const data = (await response.json()) as { providers: ProviderSummary[] };
        if (!data.providers?.length) throw new Error("No model providers are available");
        if (cancelled) return;
        setProviders(data.providers);
        const saved = await repository.list();
        const initial = saved.length ? saved : [newConversation(data.providers[0])];
        setConversations(initial);
        setActiveId(initial[0].id);
      } catch (error) {
        if (cancelled) return;
        const fallback: ProviderSummary = {
          id: "demo",
          name: "Studio Demo",
          description: "Built-in streaming preview",
          defaultModel: "aurora-demo",
          configured: true,
          local: true,
        };
        const conversation = newConversation(fallback);
        setProviders([fallback]);
        setConversations([conversation]);
        setActiveId(conversation.id);
        setInitializationError(error instanceof Error ? error.message : "Workspace initialization failed");
      }
    }
    void hydrate();
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
  }, []);

  async function refreshProviders() {
    const response = await fetch("/api/providers", { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to refresh providers");
    const data = await response.json() as { providers: ProviderSummary[] };
    setProviders(data.providers);
  }

  useEffect(() => {
    if (!active) return;
    const timeout = window.setTimeout(() => {
      void repository.save(active).catch((error) => {
        setInitializationError(error instanceof Error ? error.message : "Conversation could not be saved");
      });
    }, active.messages.some((message) => message.status === "streaming") ? 750 : 100);
    return () => window.clearTimeout(timeout);
  }, [active]);

  useEffect(() => {
    const element = transcriptRef.current;
    if (!element || status !== "streaming") return;
    const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
    if (distance < 180) element.scrollTo({ top: element.scrollHeight, behavior: "smooth" });
  }, [active?.messages, status]);

  function updateActive(transform: (conversation: Conversation) => Conversation) {
    setConversations((current) =>
      current.map((conversation) => (conversation.id === activeId ? transform(conversation) : conversation)),
    );
  }

  function createChat() {
    abortRef.current?.abort();
    const conversation = newConversation(selectedProvider ?? providers[0]);
    setConversations((current) => [conversation, ...current]);
    setActiveId(conversation.id);
    setStatus("idle");
    setDraft("");
    setSidebarOpen(false);
    requestAnimationFrame(() => composerRef.current?.focus());
  }

  function deleteChat(id: string) {
    void repository.remove(id).catch((error) => {
      setInitializationError(error instanceof Error ? error.message : "Conversation could not be deleted");
    });
    setConversations((current) => {
      const remaining = current.filter((conversation) => conversation.id !== id);
      if (id === activeId) {
        const next = remaining[0] ?? newConversation(providers[0]);
        setActiveId(next.id);
        return remaining.length ? remaining : [next];
      }
      return remaining;
    });
  }

  function chooseProvider(provider: ProviderSummary) {
    if (provider.id === "openai" && !provider.configured) {
      setProviderOpen(false);
      setKeyDialogOpen(true);
      return;
    }
    updateActive((conversation) => ({ ...conversation, providerId: provider.id, model: provider.defaultModel }));
    if (provider.id !== "openai") setProviderOpen(false);
  }

  function chooseModel(provider: ProviderSummary, model: string) {
    updateActive((conversation) => ({ ...conversation, providerId: provider.id, model }));
    setProviderOpen(false);
  }

  async function sendMessage(content = draft) {
    if (!active || !content.trim() || status === "streaming" || status === "submitting") return;
    const text = content.trim();
    setDraft("");
    setStatus("submitting");
    const userMessage: ChatMessage = {
      id: createId(),
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
      status: "complete",
    };
    const assistantId = createId();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: new Date().toISOString(),
      status: "streaming",
    };
    const history = [...active.messages, userMessage];
    updateActive((conversation) => ({
      ...conversation,
      title: conversation.messages.length ? conversation.title : shortTitle(text),
      messages: [...history, assistantMessage],
      updatedAt: new Date().toISOString(),
    }));

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: active.providerId,
          model: active.model,
          messages: buildMessagesWithMemory(conversations, active.id, history),
        }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) throw new Error((await response.text()) || "Unable to start generation");
      setStatus("streaming");
      for await (const event of parseEventStream(response.body)) {
        if (event.type === "text-delta") {
          updateActive((conversation) => ({
            ...conversation,
            updatedAt: new Date().toISOString(),
            messages: conversation.messages.map((message) =>
              message.id === assistantId ? { ...message, content: message.content + event.delta } : message,
            ),
          }));
        }
        if (event.type === "error") throw new Error(event.message);
      }
      updateActive((conversation) => ({
        ...conversation,
        messages: conversation.messages.map((message) =>
          message.id === assistantId ? { ...message, status: "complete" } : message,
        ),
      }));
      setStatus("idle");
    } catch (error) {
      const stopped = controller.signal.aborted;
      updateActive((conversation) => ({
        ...conversation,
        messages: conversation.messages.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content: message.content || (stopped ? "Generation stopped." : error instanceof Error ? error.message : "Something went wrong."),
                status: stopped ? "cancelled" : "error",
              }
            : message,
        ),
      }));
      setStatus(stopped ? "idle" : "error");
    } finally {
      abortRef.current = null;
    }
  }

  function stopGeneration() {
    abortRef.current?.abort();
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    void sendMessage();
  }

  function onComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  async function copyMessage(message: ChatMessage) {
    await navigator.clipboard.writeText(message.content);
    setCopiedId(message.id);
    window.setTimeout(() => setCopiedId(""), 1200);
  }

  async function signOut() {
    abortRef.current?.abort();
    await createSupabaseClient().auth.signOut();
    window.location.assign("/");
  }

  if (!active) {
    return (
      <main className="loading-screen">
        <div className="brand-mark"><Sparkles size={20} /></div>
        <span>Preparing your workspace…</span>
      </main>
    );
  }

  const hasMessages = active.messages.length > 0;
  const isBusy = status === "submitting" || status === "streaming";

  return (
    <div className="app-shell">
      {sidebarOpen && <button className="scrim" aria-label="Close sidebar" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="brand-lockup">
            <span className="brand-mark"><Sparkles size={17} /></span>
            <span>Luma</span>
          </div>
          <button className="icon-button mobile-only" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar"><X size={18} /></button>
        </div>
        <button className="new-chat" onClick={createChat}><Plus size={17} /> New conversation</button>
        <div className="history-label">Recent</div>
        <nav className="history" aria-label="Conversation history">
          {conversations.map((conversation) => (
            <div className={`history-row ${conversation.id === activeId ? "active" : ""}`} key={conversation.id}>
              <button className="history-item" onClick={() => { setActiveId(conversation.id); setSidebarOpen(false); }}>
                <MessageSquareText size={15} />
                <span>{conversation.title}</span>
              </button>
              <button className="history-delete" onClick={() => deleteChat(conversation.id)} aria-label={`Delete ${conversation.title}`}><Trash2 size={14} /></button>
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="storage-pill"><Database size={14} /><span>Cross-chat memory on · saved in Supabase</span></div>
          <div className="profile-row">
            <span className="avatar avatar-user">{userEmail.charAt(0).toUpperCase()}</span>
            <span><strong>{userEmail}</strong><small>Private workspace</small></span>
            <button className="profile-signout" onClick={() => void signOut()} aria-label="Sign out"><LogOut size={15} /></button>
          </div>
        </div>
      </aside>

      <main className="chat-panel">
        {initializationError && (
          <div className="init-banner" role="status">
            Running in preview mode: {initializationError}
            <button onClick={() => window.location.reload()}>Retry</button>
          </div>
        )}
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setSidebarOpen(true)} aria-label="Open sidebar"><Menu size={20} /></button>
          <button className="icon-button desktop-collapse" aria-label="Sidebar is open"><PanelLeftClose size={19} /></button>
          <div className="provider-wrap">
            <button className="provider-button" onClick={() => setProviderOpen((open) => !open)} aria-expanded={providerOpen}>
              <span className="provider-dot" />
              <span><strong>{selectedProvider?.name ?? "Provider"}</strong><small>{active.model}</small></span>
              <ChevronDown size={15} />
            </button>
            {providerOpen && (
              <div className="provider-menu">
                <div className="provider-menu-heading">Choose a runtime</div>
                {providers.map((provider) => (
                  <div className="provider-option" key={provider.id}>
                    <button onClick={() => chooseProvider(provider)}>
                      <span className={`runtime-icon ${provider.local ? "local" : "cloud"}`}><Bot size={16} /></span>
                      <span><strong>{provider.name}</strong><small>{provider.description}</small></span>
                      {provider.id === active.providerId && <Check size={16} />}
                    </button>
                    {provider.id === "openai" && provider.configured && active.providerId === "openai" && (
                      <div className="model-options" aria-label="Available OpenAI models">
                        <div className="model-options-heading"><span>Available GPT models</span><a href="https://openai.com/api/pricing/" target="_blank" rel="noreferrer">Official pricing</a></div>
                        {provider.models?.map((model) => (
                          <button className={`model-option ${active.model === model.id ? "selected" : ""}`} key={model.id} onClick={() => chooseModel(provider, model.id)}>
                            <span><strong>{model.name}</strong><small>{model.pricing ? `$${model.pricing.inputPerMillion}/M input · $${model.pricing.outputPerMillion}/M output` : "Pricing not listed · check official pricing"}</small></span>
                            {active.model === model.id && <Check size={14} />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="topbar-actions">
            <span className="status-chip"><span /> Workspace ready</span>
            <button className="icon-button" onClick={() => setKeyDialogOpen(true)} aria-label="Manage API keys"><KeyRound size={18} /></button>
            <button className="icon-button" onClick={createChat} aria-label="New conversation"><Plus size={19} /></button>
          </div>
        </header>

        <div className={`conversation ${hasMessages ? "has-messages" : ""}`} ref={transcriptRef}>
          {!hasMessages ? (
            <section className="welcome">
              <div className="welcome-orb"><Sparkles size={27} /></div>
              <p className="eyebrow">YOUR OPEN MODEL WORKSPACE</p>
              <h1>What are we making?</h1>
              <p className="welcome-copy">Think out loud, build something useful, or simply explore. Your models, your conversations, your space.</p>
              <div className="suggestion-grid">
                {suggestions.map((suggestion) => (
                  <button key={suggestion.title} onClick={() => void sendMessage(`${suggestion.title} ${suggestion.detail}`)}>
                    <span>{suggestion.title}</span><small>{suggestion.detail}</small><ArrowUp size={15} />
                  </button>
                ))}
              </div>
            </section>
          ) : (
            <div className="message-list" aria-live="polite">
              {active.messages.map((message) => (
                <article className={`message message-${message.role}`} key={message.id}>
                  <div className={`avatar ${message.role === "assistant" ? "avatar-bot" : "avatar-user"}`}>
                    {message.role === "assistant" ? <Sparkles size={15} /> : <UserRound size={15} />}
                  </div>
                  <div className="message-main">
                    <div className="message-meta"><strong>{message.role === "assistant" ? "Luma" : "You"}</strong>{message.status === "streaming" && <span>Thinking</span>}</div>
                    <div className="message-content"><MessageContent content={message.content} />{message.status === "streaming" && <span className="cursor" />}</div>
                    {message.role === "assistant" && message.content && message.status !== "streaming" && (
                      <div className="message-actions">
                        <button onClick={() => void copyMessage(message)}>{copiedId === message.id ? <Check size={14} /> : <Copy size={14} />}{copiedId === message.id ? "Copied" : "Copy"}</button>
                        {message.status === "error" && <button onClick={() => void sendMessage(active.messages.at(-2)?.content)}><RotateCcw size={14} />Retry</button>}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="composer-area">
          <form className={`composer ${isBusy ? "composer-busy" : ""}`} onSubmit={onSubmit}>
            <textarea
              ref={composerRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={onComposerKeyDown}
              placeholder="Ask anything…"
              rows={1}
              aria-label="Message"
            />
            <div className="composer-footer">
              <span className="model-hint"><span className="provider-dot" />{selectedProvider?.name} · {active.model}</span>
              {isBusy ? (
                <button type="button" className="send-button stop-button" onClick={stopGeneration} aria-label="Stop generation"><CircleStop size={18} /></button>
              ) : (
                <button type="submit" className="send-button" disabled={!draft.trim()} aria-label="Send message"><ArrowUp size={18} /></button>
              )}
            </div>
          </form>
          <p className="composer-note">Luma can make mistakes. Check important information.</p>
        </div>
      </main>
      <OpenAIKeyDialog open={keyDialogOpen} onClose={() => setKeyDialogOpen(false)} onChanged={refreshProviders} />
    </div>
  );
}
