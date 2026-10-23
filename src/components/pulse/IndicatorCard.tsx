"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ExternalLink, HelpCircle } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { cn, timeAgo } from "@/lib/utils";
import { fmtValue } from "@/components/home/Sections";

export interface IndicatorProps {
  code: string;
  name: string;
  region: string;
  unit: string;
  frequency: string;
  provider: string;
  sourceName: string;
  sourceUrl: string;
  explanation: string;
  whyItMatters: string;
  seriesJson: string;
  latestValue: number | null;
  latestPeriod: string | null;
  previousValue: number | null;
  previousPeriod: string | null;
  sourceUpdatedAt: string | null;
  valueKind: string;
  fetchedAt: string | null;
  lastError: string | null;
}

interface Hit {
  slug: string;
  title: string;
  sourceName: string;
}

export function IndicatorCard({ indicator: ind }: { indicator: IndicatorProps }) {
  const [open, setOpen] = useState(false);
  const [explain, setExplain] = useState(false);
  const [hits, setHits] = useState<Hit[] | null>(null);
  const series = (JSON.parse(ind.seriesJson || "[]") as { period: string; value: number }[]).slice(-40);
  const delta = ind.latestValue !== null && ind.previousValue !== null ? ind.latestValue - ind.previousValue : null;
  const kindLabel = ind.valueKind === "reference-rate" ? "Reference rate" : ind.valueKind === "policy-rate" ? "Policy rate" : "Actual";

  useEffect(() => {
    if (!open || hits) return;
    const q = ind.name.replace(/\(.*?\)/g, "").replace(/India|US|Euro area|World|China/g, "").trim() || ind.name;
    fetch(`/api/search?q=${encodeURIComponent(q)}&limit=4&days=14`)
      .then((r) => r.json())
      .then((d: { hits: Hit[] }) => setHits(d.hits))
      .catch(() => setHits([]));
  }, [open, hits, ind.name]);

  if (ind.latestValue === null) {
    return (
      <div id={ind.code} className="card scroll-mt-24 p-5 opacity-80">
        <p className="display text-[18px] font-medium">{ind.name}</p>
        <p className="mt-2 text-[13px] text-muted">{ind.lastError?.includes("FRED") ? "Needs a free FRED API key (FRED_API_KEY in .env) to fetch this series." : `Not available yet: ${ind.lastError ?? "no data"}`}</p>
        <a href={ind.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[12px] text-rust hover:underline">
          View at source <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    );
  }

  return (
    <div id={ind.code} className="card scroll-mt-24 p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="display text-[18px] font-medium leading-snug">{ind.name}</p>
          <p className="text-[11px] text-muted">{ind.frequency === "annual" ? "Annual" : ind.frequency === "monthly" ? "Monthly" : "Daily"}</p>
        </div>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", ind.valueKind === "actual" ? "bg-sage/70 text-[#2F5D2F]" : "bg-powder text-[#2A4D66]")}>{kindLabel}</span>
      </div>
      <p className="mt-3 font-mono text-[30px] leading-none">
        {fmtValue(ind.latestValue, ind.unit)}
        <span className="ml-1 text-[13px] text-muted">{ind.unit === "%" ? "%" : ind.unit}</span>
        {delta !== null && (
          <span className={cn("ml-3 font-mono text-[12px]", delta > 0 ? "text-[#2F5D2F]" : delta < 0 ? "text-rust" : "text-muted")}>
            {delta > 0 ? "▲" : delta < 0 ? "▼" : "•"} {Math.abs(delta).toFixed(2)} vs {ind.previousPeriod}
          </span>
        )}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-[11.5px]">
        <div><dt className="text-muted">Reference period</dt><dd className="font-medium">{ind.latestPeriod}</dd></div>
        <div><dt className="text-muted">Source last updated</dt><dd className="font-medium">{ind.sourceUpdatedAt ?? "—"}</dd></div>
        <div><dt className="text-muted">Previous</dt><dd className="font-medium">{ind.previousValue !== null ? `${fmtValue(ind.previousValue, ind.unit)} (${ind.previousPeriod})` : "—"}</dd></div>
        <div><dt className="text-muted">Fetched</dt><dd className="font-medium">{ind.fetchedAt ? timeAgo(ind.fetchedAt) : "—"}</dd></div>
      </dl>
      <div className="mt-3 h-36 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
            <CartesianGrid stroke="rgba(37,37,37,0.08)" vertical={false} />
            <XAxis dataKey="period" tick={{ fontSize: 10, fill: "#6E6860" }} tickFormatter={(v: string) => (v.length > 4 ? v.slice(0, 7) : v)} minTickGap={24} />
            <YAxis tick={{ fontSize: 10, fill: "#6E6860" }} width={40} domain={["auto", "auto"]} />
            <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #EBE5D9", fontSize: 12 }} formatter={(v: number) => [`${fmtValue(v, ind.unit)} ${ind.unit}`, ind.name]} />
            <Line type="monotone" dataKey="value" stroke="#9A3F3F" strokeWidth={1.8} dot={series.length <= 24 ? { r: 2.5, fill: "#fff", stroke: "#9A3F3F" } : false} activeDot={{ r: 4 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-ink/85">{ind.explanation}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-rust hover:underline">
          Why it matters &amp; related news <ChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} />
        </button>
        <button type="button" onClick={() => setExplain((e) => !e)} className="ml-auto inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[12px] hover:border-ink/50">
          <HelpCircle className="h-3.5 w-3.5" /> Explain this indicator
        </button>
      </div>
      {explain && (
        <div className="mt-3 rounded-2xl bg-butter/50 p-3.5 text-[13px] leading-relaxed animate-fadeUp dark:bg-butter/10">
          <p><strong>What it is:</strong> {ind.explanation}</p>
          <p className="mt-1.5"><strong>How to read it:</strong> {ind.valueKind === "actual" ? `An actual, published figure for ${ind.latestPeriod}. ${ind.frequency === "annual" ? "Annual data arrives with a lag and may be revised by the provider." : ""}` : ind.valueKind === "policy-rate" ? "A rate set by the central bank; it changes only at policy meetings." : "A daily reference rate published by the ECB, not a traded price."}</p>
          <p className="mt-1.5"><strong>Source:</strong> <a href={ind.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-rust underline">{ind.sourceName}</a></p>
          <Link href={`/curio?q=${encodeURIComponent(`Explain ${ind.name} and what the latest reading means for India`)}`} className="mt-2 inline-block text-[12.5px] font-semibold text-rust">Ask Curio to go deeper ✨ →</Link>
        </div>
      )}
      {open && (
        <div className="mt-3 border-t border-line pt-3 animate-fadeUp">
          <p className="text-[13px] leading-relaxed"><span className="font-semibold">Why it matters:</span> {ind.whyItMatters}</p>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Related news</p>
          {hits === null ? (
            <p className="mt-1 text-[12px] text-muted">Looking for related stories…</p>
          ) : hits.length ? (
            <ul className="mt-1 space-y-1.5">
              {hits.map((h) => (
                <li key={h.slug} className="text-[13px]">
                  <Link href={`/story/${h.slug}`} className="hover:text-rust">{h.title}</Link> <span className="text-[11px] text-muted">· {h.sourceName}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-[12px] text-muted">No recent stories matched this indicator.</p>
          )}
          <a href={ind.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[12px] text-rust hover:underline">
            Official source: {ind.sourceName} <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}
