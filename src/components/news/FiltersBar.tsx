"use client";

import { useRouter, usePathname } from "next/navigation";
import { SUBJECTS, TIERS, REGIONS } from "@/lib/taxonomy";

interface Current {
  subject: string;
  region: string;
  tier: string;
  source: string;
  days: string;
  sort: string;
  saved: boolean;
}

export function FiltersBar({ sources, current, basePath }: { sources: { id: string; name: string }[]; current: Current; basePath?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const update = (patch: Partial<Record<keyof Current, string>>) => {
    const u = new URLSearchParams();
    const next = { ...current, ...patch } as Record<string, string | boolean>;
    for (const [k, v] of Object.entries(next)) {
      if (k === "saved") {
        if (v === true || v === "1") u.set("saved", "1");
        continue;
      }
      if (v && v !== "" && !(k === "days" && v === "3") && !(k === "sort" && v === "importance")) u.set(k, String(v));
    }
    router.push(`${basePath ?? pathname}?${u.toString()}`);
  };
  const sel = "rounded-full border border-line bg-card px-3 py-1.5 text-[13px] outline-none focus:border-ink/50";
  return (
    <div className="no-scrollbar mt-5 flex flex-wrap gap-2">
      <select aria-label="Subject" className={sel} value={current.subject} onChange={(e) => update({ subject: e.target.value })}>
        <option value="">All subjects</option>
        {SUBJECTS.map((s) => (
          <option key={s.id} value={s.id}>{s.label}</option>
        ))}
      </select>
      <select aria-label="Geography" className={sel} value={current.region} onChange={(e) => update({ region: e.target.value })}>
        <option value="">All geographies</option>
        {Object.entries(REGIONS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>
      <select aria-label="Grouping" className={sel} value={current.tier} onChange={(e) => update({ tier: e.target.value })}>
        <option value="">All groupings</option>
        {Object.entries(TIERS).map(([k, v]) => (
          <option key={k} value={k}>{v.label}</option>
        ))}
      </select>
      <select aria-label="Source" className={sel} value={current.source} onChange={(e) => update({ source: e.target.value })}>
        <option value="">All sources</option>
        {sources.map((s) => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>
      <select aria-label="Date range" className={sel} value={current.days} onChange={(e) => update({ days: e.target.value })}>
        <option value="1">Last 24 hours</option>
        <option value="3">Last 3 days</option>
        <option value="7">Last 7 days</option>
        <option value="30">Last 30 days</option>
      </select>
      <select aria-label="Sort" className={sel} value={current.sort} onChange={(e) => update({ sort: e.target.value })}>
        <option value="importance">By importance</option>
        <option value="latest">Latest first</option>
        <option value="sources">Most corroborated</option>
      </select>
      <label className={`${sel} inline-flex cursor-pointer items-center gap-1.5`}>
        <input type="checkbox" checked={current.saved} onChange={(e) => update({ saved: e.target.checked ? "1" : "" })} className="accent-[#9A3F3F]" /> Saved only
      </label>
    </div>
  );
}
