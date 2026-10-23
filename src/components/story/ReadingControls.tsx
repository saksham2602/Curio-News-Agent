"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Link2, Search, Share2 } from "lucide-react";
import { markRead, markUnread } from "@/app/actions";
import { BookmarkButton } from "./BookmarkButton";
import { cn } from "@/lib/utils";

export function ReadingControls({ storyId, slug, title, bookmarked, read, mode, className }: { storyId: string; slug: string; title: string; bookmarked: boolean; read: boolean; mode: "quick" | "deep"; className?: string }) {
  const [isRead, setRead] = useState(read);
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();

  const share = async () => {
    const url = `${window.location.origin}/story/${slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
    } catch {
      /* fall through to copy */
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const toggleRead = () => {
    const next = !isRead;
    setRead(next);
    start(async () => {
      if (next) await markRead(storyId, mode);
      else await markUnread(storyId);
    });
  };

  const btn = "inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-3.5 py-2 text-[13px] font-semibold hover:border-ink/50";
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {mode === "quick" ? (
        <Link href={`/story/${slug}/deep`} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-paper hover:bg-ink/85">
          <Search className="h-4 w-4" /> Dive Deeper
        </Link>
      ) : (
        <Link href={`/story/${slug}`} className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-paper hover:bg-ink/85">
          ⚡ Back to Quick Read
        </Link>
      )}
      <BookmarkButton storyId={storyId} initial={bookmarked} label className={btn} />
      <button type="button" onClick={share} className={btn}>
        <Share2 className="h-4 w-4" /> {copied ? "Link copied" : "Share"}
      </button>
      <Link href={`/connect/${slug}`} className={btn}>
        <Link2 className="h-4 w-4" /> Explore Connections
      </Link>
      <button type="button" onClick={toggleRead} disabled={pending} aria-pressed={isRead} className={cn(btn, isRead && "border-sage bg-sage/60 dark:bg-sage/20")}>
        <Check className="h-4 w-4" /> {isRead ? "Read" : "Mark as Read"}
      </button>
    </div>
  );
}
