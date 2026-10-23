"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateQuickReadAction } from "@/app/actions-ai";
import { Sparkles } from "@/components/doodles";

export function GenerateQuickRead({ storyId }: { storyId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const r = await generateQuickReadAction(storyId);
            if (!r.ok) setError(r.error ?? "Failed");
            else router.refresh();
          })
        }
        className="inline-flex items-center gap-1.5 rounded-full bg-lavender px-3.5 py-1.5 text-[12.5px] font-semibold text-[#3E2E6E] hover:bg-[#CDBDEB] disabled:opacity-60"
      >
        <Sparkles className="h-3.5 w-3.5" /> {pending ? "Writing the explanation…" : "Generate AI explanation"}
      </button>
      {error && <p className="text-[11px] text-rust">{error}</p>}
    </div>
  );
}
