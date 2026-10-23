"use client";

import { useEffect, useState, useTransition } from "react";
import { addHighlight } from "@/app/actions";

// Shows a small "Highlight" button near selected text inside the reading area.
export function HighlightToolbar({ storyId }: { storyId: string }) {
  const [pos, setPos] = useState<{ x: number; y: number; text: string } | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  useEffect(() => {
    const onUp = () => {
      const sel = window.getSelection();
      const text = sel?.toString().trim() ?? "";
      if (!sel || sel.isCollapsed || text.length < 12 || text.length > 600) {
        setPos(null);
        return;
      }
      const container = document.querySelector(".reading");
      if (!container || !container.contains(sel.anchorNode)) {
        setPos(null);
        return;
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      setPos({ x: rect.left + rect.width / 2, y: rect.top + window.scrollY - 40, text });
      setDone(false);
    };
    document.addEventListener("mouseup", onUp);
    document.addEventListener("touchend", onUp);
    return () => {
      document.removeEventListener("mouseup", onUp);
      document.removeEventListener("touchend", onUp);
    };
  }, []);
  if (!pos) return null;
  return (
    <button
      type="button"
      style={{ left: pos.x, top: pos.y }}
      onClick={() =>
        start(async () => {
          await addHighlight(storyId, pos.text);
          setDone(true);
          setTimeout(() => setPos(null), 900);
        })
      }
      className="absolute z-40 -translate-x-1/2 rounded-full bg-ink px-3 py-1.5 text-[12px] font-semibold text-paper shadow-pop animate-fadeUp"
      disabled={pending}
    >
      {done ? "Saved to library ✓" : pending ? "Saving…" : "✎ Highlight"}
    </button>
  );
}
