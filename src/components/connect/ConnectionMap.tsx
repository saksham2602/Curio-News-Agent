"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { List, Map as MapIcon, X } from "lucide-react";
import { classifyConnections } from "@/app/actions";
import { subjectMeta } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import { Sparkles } from "@/components/doodles";

export interface MapNode {
  id: string;
  slug: string | null; // null = concept node (no story page)
  label: string;
  kind: string;
  subject: string;
  relation: string;
  strength: number;
  explanation: string;
  shared: string[];
  sources: { name: string; url: string }[];
  summary: string;
  date: string;
  furtherLinks: number;
}

const REL_COLOR: Record<string, string> = { causal: "#C9705F", correlated: "#C9A227", plausible: "#5B8DB8", speculative: "#A7A09A", topical: "#A7A09A" };
const REL_LABEL: Record<string, string> = { causal: "Causal", correlated: "Correlated", plausible: "Plausible", speculative: "Speculative", topical: "Topical (unclassified)" };
const FILL: Record<string, string> = { economy: "#F7E7A8", business: "#F7E7A8", markets: "#D9CCF2", marketing: "#F2B5A7", geopolitics: "#F2B5A7", politics: "#D5E7F2", society: "#ECE9E1", science: "#D9CCF2", health: "#F2B5A7", environment: "#C8DCC8", technology: "#D5E7F2" };

export function ConnectionMap({ origin, nodes, aiConfigured, hasUnclassified }: { origin: { id: string; slug: string; title: string; subject: string }; nodes: MapNode[]; aiConfigured: boolean; hasUnclassified: boolean }) {
  const [view, setView] = useState<"map" | "list">("map");
  // Phones: start in list view (SVG labels are hard to read below ~480px); the map is one tap away.
  useEffect(() => {
    if (window.innerWidth < 480) setView("list");
  }, []);
  const [active, setActive] = useState<MapNode | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  const shown = useMemo(() => (expanded ? nodes : nodes.slice(0, 6)), [nodes, expanded]);
  const W = 640;
  const H = 520;
  const cx = W / 2;
  const cy = H / 2;
  const maxS = Math.max(1, ...shown.map((n) => n.strength));
  const placed = shown.map((n, i) => {
    const angle = (i / shown.length) * Math.PI * 2 - Math.PI / 2;
    const r = 150 + (1 - Math.min(1, n.strength / maxS)) * 70;
    return { n, x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  });

  const classify = () =>
    start(async () => {
      setErr(null);
      const r = await classifyConnections(origin.id);
      if (!r.ok) setErr(r.error ?? "Could not classify.");
      else router.refresh();
    });

  const wrap = (s: string, n = 22) => {
    const words = s.split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      if ((cur + " " + w).trim().length > n) {
        lines.push(cur.trim());
        cur = w;
      } else cur += " " + w;
      if (lines.length === 2) break;
    }
    if (lines.length < 2 && cur.trim()) lines.push(cur.trim());
    if (lines.length === 2 && words.join(" ").length > lines.join(" ").length) lines[1] = lines[1].slice(0, n - 1) + "…";
    return lines;
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1.3fr_1fr]">
      <div className="card p-3 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex max-w-full flex-wrap gap-0.5 rounded-3xl border border-line p-0.5">
            <button type="button" onClick={() => setView("map")} className={cn("pill", view === "map" ? "bg-ink text-paper" : "hover:bg-line/60")}>
              <MapIcon className="h-3.5 w-3.5" /> Visual map
            </button>
            <button type="button" onClick={() => setView("list")} className={cn("pill", view === "list" ? "bg-ink text-paper" : "hover:bg-line/60")}>
              <List className="h-3.5 w-3.5" /> Simple list
            </button>
          </div>
          <div className="flex items-center gap-2">
            {nodes.length > 6 && (
              <button type="button" onClick={() => setExpanded((e) => !e)} className="rounded-full border border-line px-3 py-1.5 text-[12px] hover:border-ink/50">
                {expanded ? "Show fewer" : `Show all ${nodes.length}`}
              </button>
            )}
            {aiConfigured && hasUnclassified && (
              <button type="button" onClick={classify} disabled={pending} className="inline-flex items-center gap-1.5 rounded-full bg-lavender px-3 py-1.5 text-[12px] font-semibold text-[#3E2E6E] disabled:opacity-60">
                <Sparkles className="h-3.5 w-3.5" /> {pending ? "Classifying…" : "Classify links with AI"}
              </button>
            )}
          </div>
        </div>
        {err && <p className="mt-2 text-[12px] text-rust">{err}</p>}

        {view === "map" ? (
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 h-auto w-full" role="img" aria-label={`Connection map for ${origin.title}`}>
            {placed.map(({ n, x, y }) => (
              <line key={`l-${n.id}`} x1={cx} y1={cy} x2={x} y2={y} stroke={REL_COLOR[n.relation] ?? "#A7A09A"} strokeWidth={n.relation === "causal" ? 2.4 : 1.6} strokeDasharray={n.relation === "topical" || n.relation === "speculative" ? "4 4" : undefined} opacity={active && active.id !== n.id ? 0.3 : 0.9} />
            ))}
            <g>
              <circle cx={cx} cy={cy} r={44} fill={FILL[origin.subject] ?? "#F7E7A8"} stroke="#252525" strokeWidth={1.6} />
              {wrap(origin.title, 16).map((line, i) => (
                <text key={i} x={cx} y={cy - 4 + i * 13} textAnchor="middle" fontSize="10.5" fontWeight="600" fill="#252525">
                  {line}
                </text>
              ))}
            </g>
            {placed.map(({ n, x, y }) => (
              <g key={n.id} onClick={() => setActive(n)} className="cursor-pointer" role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && setActive(n)} aria-label={n.label}>
                <circle cx={x} cy={y} r={n.slug ? 30 : 24} fill={n.slug ? FILL[n.subject] ?? "#ECE9E1" : "#FFFFFF"} stroke={active?.id === n.id ? "#9A3F3F" : "#252525"} strokeWidth={active?.id === n.id ? 2.4 : 1.3} strokeDasharray={n.slug ? undefined : "3 3"} />
                {wrap(n.label, 18).map((line, i) => (
                  <text key={i} x={x} y={y + (n.slug ? 42 : 36) + i * 12} textAnchor="middle" fontSize="11" fill="#252525" className="fill-ink">
                    {line}
                  </text>
                ))}
                {!n.slug && (
                  <text x={x} y={y + 3.5} textAnchor="middle" fontSize="9" fill="#6E6860">
                    {n.kind}
                  </text>
                )}
              </g>
            ))}
          </svg>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {shown.map((n) => (
              <li key={n.id}>
                <button type="button" onClick={() => setActive(n)} className="flex w-full items-start gap-3 py-3 text-left hover:text-rust">
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full" style={{ background: REL_COLOR[n.relation] }} />
                  <span className="min-w-0">
                    <span className="block text-[14px] font-medium leading-snug">{n.label}</span>
                    <span className="block text-[11.5px] text-muted">
                      {n.slug ? subjectMeta(n.subject).label : n.kind} · {REL_LABEL[n.relation] ?? n.relation}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted">
          {Object.entries(REL_LABEL).map(([k, v]) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className="h-2 w-5 rounded-full" style={{ background: REL_COLOR[k] }} /> {v}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border border-dashed border-ink" /> concept / indicator</span>
        </div>
      </div>

      <aside className="card p-5">
        {active ? (
          <div className="animate-fadeUp">
            <div className="flex items-start justify-between gap-2">
              <span className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-ink" style={{ background: `${REL_COLOR[active.relation]}55` }}>
                {REL_LABEL[active.relation] ?? active.relation}
              </span>
              <button type="button" onClick={() => setActive(null)} className="rounded-full p-1.5 hover:bg-line/60" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">{active.slug ? subjectMeta(active.subject).label : active.kind}</p>
            <h3 className="display mt-1 text-[20px] font-medium leading-snug">{active.label}</h3>
            {active.date && <p className="text-[12px] text-muted">{active.date}</p>}
            <p className="mt-3 text-[14px] leading-relaxed">
              <span className="font-semibold">Relationship: </span>
              {active.explanation}
            </p>
            {active.shared.length > 0 && <p className="mt-2 text-[12px] text-muted">Shared: {active.shared.slice(0, 5).join(", ")}</p>}
            {active.summary && <p className="mt-3 text-[13px] leading-relaxed text-ink/80">{active.summary.slice(0, 320)}</p>}
            {active.sources.length > 0 && (
              <p className="mt-3 text-[12px]">
                <span className="text-muted">Sources: </span>
                {active.sources.map((s, i) => (
                  <span key={s.url}>
                    {i > 0 && " · "}
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium text-rust hover:underline">{s.name}</a>
                  </span>
                ))}
              </p>
            )}
            {active.slug ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/story/${active.slug}`} className="rounded-full border border-line px-3 py-1.5 text-[12.5px] font-semibold hover:border-ink/50">Quick read</Link>
                <Link href={`/story/${active.slug}/deep`} className="rounded-full bg-ink px-3 py-1.5 text-[12.5px] font-semibold text-paper">Deep Dive →</Link>
                {active.furtherLinks > 0 && (
                  <Link href={`/connect/${active.slug}?from=${origin.slug}`} className="rounded-full bg-lavender px-3 py-1.5 text-[12.5px] font-semibold text-[#3E2E6E]">
                    Expand ({active.furtherLinks}) →
                  </Link>
                )}
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap gap-2">
                <Link href={`/explore?q=${encodeURIComponent(active.label)}`} className="rounded-full border border-line px-3 py-1.5 text-[12.5px] font-semibold hover:border-ink/50">Explore this topic</Link>
                <Link href={`/story/${origin.slug}/deep#connections`} className="rounded-full bg-ink px-3 py-1.5 text-[12.5px] font-semibold text-paper">Read in Deep Dive →</Link>
              </div>
            )}
          </div>
        ) : (
          <div className="text-[14px] text-muted">
            <p className="display text-[20px] text-ink">Tap a node</p>
            <p className="mt-2 leading-relaxed">Each node opens a short explanation of the relationship, the evidence behind it, its sources, and a Deep Dive button. Expand a node to keep exploring without losing this map — a back link brings you here.</p>
            <p className="mt-3 text-[12px]">Showing the {Math.min(6, nodes.length)} most meaningful relationships first. {nodes.length > 6 ? "Use “Show all” to expand." : ""}</p>
          </div>
        )}
      </aside>
    </div>
  );
}
