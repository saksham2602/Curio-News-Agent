"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { Sparkles } from "@/components/doodles";
import { CurioChat } from "./CurioChat";

// Floating "Ask Curio" button + slide-over panel. Knows the story being viewed via a data attribute set by story pages.
export function CurioFab({ aiConfigured }: { aiConfigured: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [ctx, setCtx] = useState<{ storyId: string; title: string } | null>(null);

  useEffect(() => {
    const el = document.querySelector<HTMLElement>("[data-story-id]");
    setCtx(el ? { storyId: el.dataset.storyId!, title: el.dataset.storyTitle ?? "" } : null);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  if (pathname === "/curio") return null;
  if (ctx && typeof document !== "undefined" && document.body.classList.contains("focus-mode")) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-ink px-4 py-3 text-[14px] font-semibold text-paper shadow-pop transition hover:-translate-y-0.5 sm:bottom-6 sm:right-6"
        aria-label="Ask Curio"
      >
        <Sparkles className="h-4 w-4" /> Ask Curio
      </button>
      {open && (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Ask Curio">
          <div className="absolute inset-0 bg-ink/30" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 flex h-[88dvh] flex-col rounded-t-3xl bg-paper shadow-pop animate-fadeUp sm:inset-y-0 sm:left-auto sm:right-0 sm:h-auto sm:w-[440px] sm:rounded-none">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#6B55A8]" />
                <span className="display text-lg">Ask Curio</span>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-line/60" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <CurioChat storyId={ctx?.storyId ?? null} storyTitle={ctx?.title ?? null} aiConfigured={aiConfigured} compact />
          </div>
        </div>
      )}
    </>
  );
}
