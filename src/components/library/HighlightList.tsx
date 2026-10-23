"use client";

import { useTransition } from "react";
import { X } from "lucide-react";
import { deleteHighlight } from "@/app/actions";
import { timeAgo } from "@/lib/utils";

export function HighlightList({ highlights }: { highlights: { id: string; text: string; storyId: string; createdAt: string }[] }) {
  const [, start] = useTransition();
  if (!highlights.length) return <p className="mt-1 text-[13px] text-muted">Select text on any quick read or deep dive and press “Highlight” to keep the insight here.</p>;
  return (
    <ul className="mt-2 space-y-2">
      {highlights.map((h) => (
        <li key={h.id} className="group rounded-xl bg-butter/40 p-2.5 text-[13px] leading-relaxed dark:bg-butter/10">
          <span className="float-right">
            <button type="button" onClick={() => start(() => deleteHighlight(h.id))} className="rounded-full p-0.5 text-muted opacity-0 hover:text-rust group-hover:opacity-100" aria-label="Delete highlight">
              <X className="h-3.5 w-3.5" />
            </button>
          </span>
          “{h.text}”<span className="block text-[11px] text-muted">{timeAgo(h.createdAt)}</span>
        </li>
      ))}
    </ul>
  );
}
