"use client";

import { useEffect, useRef } from "react";

// Persists reading position and completion for "resume where you left off".
export function ReadingTracker({ storyId, mode, initialProgress }: { storyId: string; mode: "quick" | "deep"; initialProgress: number }) {
  const last = useRef(0);
  useEffect(() => {
    const send = (progress: number, completed: boolean) => {
      try {
        fetch("/api/reading", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storyId, mode, progress, completed }), keepalive: true });
      } catch {}
    };
    // Resume position.
    if (initialProgress > 0.05 && initialProgress < 0.95) {
      const el = document.documentElement;
      const y = (el.scrollHeight - window.innerHeight) * initialProgress;
      if (y > 100) window.scrollTo({ top: y, behavior: "auto" });
    }
    send(Math.max(0.05, initialProgress), false);
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - window.innerHeight;
      const p = max <= 0 ? 1 : Math.min(1, window.scrollY / max);
      if (p <= last.current + 0.04 && p < 0.95) return;
      last.current = p;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => send(p, p >= 0.9), 600);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    const onHide = () => {
      if (last.current > 0) send(last.current, last.current >= 0.9);
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onHide);
      if (timer) clearTimeout(timer);
    };
  }, [storyId, mode, initialProgress]);
  return null;
}
