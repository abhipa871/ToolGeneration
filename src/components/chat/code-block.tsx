"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

const DEFAULT_FILENAMES: Record<string, string> = {
  bash: "terminal",
  sh: "terminal",
  shell: "terminal",
  javascript: "index.js",
  js: "index.js",
  typescript: "index.ts",
  ts: "index.ts",
  jsx: "Component.jsx",
  tsx: "Component.tsx",
  python: "main.py",
  py: "main.py",
  json: "data.json",
  html: "index.html",
  css: "styles.css",
  scss: "styles.scss",
  sql: "schema.sql",
  markdown: "README.md",
  md: "README.md",
  yaml: "config.yaml",
  yml: "config.yml",
  dockerfile: "Dockerfile",
  env: ".env",
  go: "main.go",
  rust: "main.rs",
  java: "Main.java",
  csharp: "Program.cs",
  cs: "Program.cs",
  cpp: "main.cpp",
  c: "main.c",
  php: "index.php",
  ruby: "main.rb",
  swift: "main.swift",
  kotlin: "Main.kt",
  text: "snippet.txt",
  plaintext: "snippet.txt",
};

export function codeFilename(language = "text", metadata = "") {
  const explicit = metadata.match(/(?:filename|file)=(?:"([^"]+)"|'([^']+)'|([^\s]+))/i);
  if (explicit) return explicit[1] ?? explicit[2] ?? explicit[3];
  const normalized = language.toLowerCase();
  return DEFAULT_FILENAMES[normalized] ?? `snippet.${normalized || "txt"}`;
}

export function CodeBlock({ code, language, metadata }: { code: string; language?: string; metadata?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <section className="code-block">
      <header className="code-block-header">
        <span title={codeFilename(language, metadata)}>{codeFilename(language, metadata)}</span>
        <button type="button" onClick={() => void copy()} aria-label={`Copy ${codeFilename(language, metadata)}`}>
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </header>
      <pre><code className={language ? `language-${language}` : undefined}>{code}</code></pre>
    </section>
  );
}
