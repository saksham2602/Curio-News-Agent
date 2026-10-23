"use client";

import { useState, useTransition } from "react";
import { Bookmark } from "lucide-react";
import { toggleBookmark } from "@/app/actions";
import { cn } from "@/lib/utils";

export function BookmarkButton({ storyId, initial, label, className }: { storyId: string; initial: boolean; label?: boolean; className?: string }) {
  const [saved, setSaved] = useState(initial);
  const [pop, setPop] = useState(false);
  const [pending, start] = useTransition();
  const onClick = () => {
    const next = !saved;
    setSaved(next);
    if (next) {
      setPop(true);
      setTimeout(() => setPop(false), 400);
    }
    start(async () => {
      try {
        const r = await toggleBookmark(storyId);
        setSaved(r.bookmarked);
      } catch {
        setSaved(!next);
      }
    });
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? "Remove from library" : "Save to library"}
      className={cn("inline-flex items-center gap-1.5 rounded-full p-1.5 text-ink/70 transition hover:bg-line/60 hover:text-ink", label && "px-3 py-1.5 text-[13px] font-semibold", className)}
    >
      <Bookmark className={cn("h-[18px] w-[18px] transition-colors", saved && "fill-coral text-[#C9705F]", pop && "animate-pop")} />
      {label && (saved ? "Saved" : "Save")}
    </button>
  );
}
