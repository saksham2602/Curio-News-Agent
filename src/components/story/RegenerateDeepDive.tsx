"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { regenerateDeepDiveAction } from "@/app/actions-ai";

export function RegenerateDeepDive({ storyId }: { storyId: string }) {
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
            const r = await regenerateDeepDiveAction(storyId);
            if (!r.ok) setError(r.error ?? "Failed");
            else router.refresh();
          })
        }
        className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[12px] text-muted hover:border-ink/50 hover:text-ink disabled:opacity-60"
      >
        <RefreshCw className={pending ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} /> {pending ? "Regenerating (one to two minutes)…" : "Regenerate with latest sources"}
      </button>
      {error && <p className="text-[11px] text-rust">{error}</p>}
    </div>
  );
}
