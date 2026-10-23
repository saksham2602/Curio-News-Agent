"use client";

import { useEffect, useRef, useState } from "react";
import { TIERS } from "@/lib/taxonomy";
import type { Tier } from "@/lib/types";
import { cn } from "@/lib/utils";

export function WhyButton({ tier, reason, factors, className }: { tier: string; reason: string; factors: string[]; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const t = TIERS[tier as Tier];
  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="dotted text-[12px] text-ink/70 hover:text-ink" aria-expanded={open}>
        Why am I seeing this? 💡
      </button>
      {open && (
        <div role="dialog" className="absolute right-0 z-30 mt-2 w-[min(88vw,320px)] rounded-2xl border border-line bg-card p-4 text-left shadow-lift animate-fadeUp">
          <p className="text-[13px] font-semibold">{t?.label ?? tier}</p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink/80">{reason}</p>
          {factors.length > 0 && (
            <ul className="mt-2.5 space-y-1 border-t border-line pt-2.5 text-[12px] text-muted">
              {factors.slice(0, 6).map((f) => (
                <li key={f} className="flex gap-1.5">
                  <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-rust" />
                  {f}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2.5 text-[11px] text-muted">Ranked by significance, credibility, timeliness, relevance and novelty, never by clicks.</p>
        </div>
      )}
    </div>
  );
}
