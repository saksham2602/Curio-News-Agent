"use client";

import { Download } from "lucide-react";

interface R {
  id: string;
  title: string;
  happened: string;
  meaning: string;
  evidence: string;
  missing: string;
  changeMind: string;
  freeform: string;
  createdAt: string;
  updatedAt: string;
  storyTitle: string | null;
}

export function ExportButton({ reflections, single }: { reflections: R[]; single?: boolean }) {
  const download = (format: "md" | "json") => {
    let content: string;
    if (format === "json") content = JSON.stringify(reflections, null, 2);
    else
      content = reflections
        .map((r) => `# ${r.title}\n\n_${new Date(r.createdAt).toDateString()}${r.storyTitle ? ` · on "${r.storyTitle}"` : ""}_\n\n## What happened?\n${r.happened || "—"}\n\n## What do I think it means?\n${r.meaning || "—"}\n\n## What evidence supports my view?\n${r.evidence || "—"}\n\n## What might I be missing?\n${r.missing || "—"}\n\n## What could change my mind?\n${r.changeMind || "—"}\n\n## Notes\n${r.freeform || "—"}\n`)
        .join("\n---\n\n");
    const blob = new Blob([content], { type: format === "json" ? "application/json" : "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${single ? reflections[0]?.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() : "my-perspectives"}.${format}`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  return (
    <span className="inline-flex gap-1.5">
      <button type="button" onClick={() => download("md")} className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[12px] hover:border-ink/50">
        <Download className="h-3.5 w-3.5" /> Markdown
      </button>
      <button type="button" onClick={() => download("json")} className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1.5 text-[12px] hover:border-ink/50">
        <Download className="h-3.5 w-3.5" /> JSON
      </button>
    </span>
  );
}
