"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SendHorizonal, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Citation } from "@/lib/types";

interface Msg {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  followUps?: string[];
  error?: boolean;
}

const STARTERS = ["Explain this in simpler language", "Why is this important for India?", "How does this affect the stock market?", "What happened before this?", "What are the opposing viewpoints?", "What should I read next?"];
const GENERIC = ["What matters most in today's news?", "How is India's inflation trending?", "Explain what the RBI's repo rate does", "Which stories today connect to oil prices?"];

function sessionKey(storyId: string | null) {
  return `curio:${storyId ?? "global"}`;
}

function renderMd(md: string) {
  // Minimal, safe markdown: paragraphs, bullets, bold, citations [n].
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const inline = (s: string) =>
    esc(s)
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\[(\d+)\]/g, '<sup class="text-rust font-semibold">[$1]</sup>');
  const blocks = md.split(/\n{2,}/);
  return blocks
    .map((b) => {
      const lines = b.split("\n");
      if (lines.every((l) => /^\s*[-*•]\s+/.test(l))) return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*[-*•]\s+/, ""))}</li>`).join("")}</ul>`;
      if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) return `<ol>${lines.map((l) => `<li>${inline(l.replace(/^\s*\d+[.)]\s+/, ""))}</li>`).join("")}</ol>`;
      return `<p>${lines.map(inline).join("<br/>")}</p>`;
    })
    .join("");
}

export function CurioChat({ storyId, storyTitle, aiConfigured, compact }: { storyId: string | null; storyTitle: string | null; aiConfigured: boolean; compact?: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const key = sessionKey(storyId);
    let sid = "";
    try {
      sid = localStorage.getItem(key) ?? "";
      if (!sid) {
        sid = `s_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
        localStorage.setItem(key, sid);
      }
    } catch {
      sid = `s_${Date.now()}`;
    }
    setSessionId(sid);
    fetch(`/api/curio?session=${sid}`)
      .then((r) => r.json())
      .then((d: { messages?: Msg[] }) => setMsgs(d.messages ?? []))
      .catch(() => {});
  }, [storyId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [msgs, busy]);

  const ask = async (q: string) => {
    const question = q.trim();
    if (!question || busy) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", content: question }]);
    setBusy(true);
    try {
      const r = await fetch("/api/curio", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question, storyId, sessionId }) });
      const d = (await r.json()) as { answer?: string; followUps?: string[]; citations?: Citation[]; error?: string };
      if (!r.ok || d.error) setMsgs((m) => [...m, { role: "assistant", content: d.error ?? "Something went wrong.", error: true }]);
      else setMsgs((m) => [...m, { role: "assistant", content: d.answer ?? "", citations: d.citations, followUps: d.followUps }]);
    } catch {
      setMsgs((m) => [...m, { role: "assistant", content: "Could not reach Curio. Check your connection and try again.", error: true }]);
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    setMsgs([]);
    await fetch(`/api/curio?session=${sessionId}`, { method: "DELETE" }).catch(() => {});
  };

  const starters = storyId ? STARTERS : GENERIC;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", !compact && "card")}>
      {storyTitle && (
        <div className="border-b border-line px-4 py-2 text-[12px] text-muted">
          Context: <span className="font-medium text-ink/80">{storyTitle}</span>
        </div>
      )}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {!aiConfigured && (
          <div className="rounded-2xl bg-butter/60 p-4 text-[13px] leading-relaxed dark:bg-butter/15">
            <strong>Curio needs an API key.</strong> Add <code>NVIDIA_API_KEY</code> (free developer key) or <code>ANTHROPIC_API_KEY</code> to <code>.env</code> and restart the server. Until then, search still works and every story links to its sources.
            <div className="mt-2">
              <Link href="/explore" className="font-semibold text-rust underline">Open Search &amp; Explore →</Link>
            </div>
          </div>
        )}
        {msgs.length === 0 && aiConfigured && (
          <div>
            <p className="text-[14px] leading-relaxed text-ink/80">
              Hi, I&rsquo;m Curio ✨ — your research companion. I answer from the stories and official data on this platform and show my sources. {storyTitle ? "Ask me anything about this story." : "What are you curious about?"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {starters.map((s) => (
                <button key={s} type="button" onClick={() => ask(s)} className="rounded-full border border-line bg-card px-3 py-1.5 text-[12.5px] hover:border-ink/50">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn("max-w-[92%] rounded-2xl px-4 py-3 text-[14px]", m.role === "user" ? "bg-ink text-paper" : m.error ? "bg-coral/40 dark:bg-coral/15" : "bg-card shadow-card")}>
              {m.role === "assistant" ? <div className="md" dangerouslySetInnerHTML={{ __html: renderMd(m.content) }} /> : m.content}
              {m.citations && m.citations.length > 0 && (
                <div className="mt-3 border-t border-line pt-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Sources</p>
                  <ul className="mt-1 space-y-1 text-[12px]">
                    {m.citations.map((c) => (
                      <li key={c.n} className="flex gap-1.5">
                        <span className="font-semibold text-rust">[{c.n}]</span>
                        <a href={c.slug ? `/story/${c.slug}` : c.url} className="hover:underline" target={c.slug ? undefined : "_blank"} rel="noopener noreferrer">
                          {c.title} <span className="text-muted">· {c.source}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {m.followUps && m.followUps.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {m.followUps.map((f) => (
                    <button key={f} type="button" onClick={() => ask(f)} className="rounded-full border border-line px-2.5 py-1 text-[12px] hover:border-ink/50">
                      {f}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-card px-4 py-3 shadow-card">
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:240ms]" />
              </span>
              <span className="ml-2 text-[12px] text-muted">Curio is reading the sources…</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="flex items-center gap-2 border-t border-line p-3"
      >
        <input value={input} onChange={(e) => setInput(e.target.value)} disabled={!aiConfigured || busy} placeholder={storyTitle ? "Ask about this story…" : "Ask Curio anything about the news…"} className="min-w-0 flex-1 rounded-full border border-line bg-card px-4 py-2.5 text-[14px] outline-none focus:border-ink/50 disabled:opacity-60" aria-label="Your question" />
        <button type="submit" disabled={!aiConfigured || busy || !input.trim()} className="rounded-full bg-ink p-2.5 text-paper disabled:opacity-40" aria-label="Send">
          <SendHorizonal className="h-4 w-4" />
        </button>
        {msgs.length > 0 && (
          <button type="button" onClick={clear} className="rounded-full p-2.5 text-muted hover:bg-line/60" aria-label="Clear conversation">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </form>
    </div>
  );
}
