"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { updateBookmark, removeBookmark } from "@/app/actions";

export function BookmarkEditor({ storyId, collection, note, collections }: { storyId: string; collection: string; note: string; collections: string[] }) {
  const [col, setCol] = useState(collection);
  const [text, setText] = useState(note);
  const [custom, setCustom] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(Boolean(note));

  const save = () =>
    start(async () => {
      const c = custom.trim() || col;
      await updateBookmark(storyId, { collection: c, note: text });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    });

  return (
    <div className="mt-3 text-[13px]">
      <div className="flex flex-wrap items-center gap-2">
        <select value={col} onChange={(e) => setCol(e.target.value)} className="rounded-full border border-line bg-card px-3 py-1.5 text-[12.5px]" aria-label="Collection">
          {collections.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="or new collection…" className="w-40 rounded-full border border-line bg-card px-3 py-1.5 text-[12.5px] outline-none focus:border-ink/50" aria-label="New collection" />
        <button type="button" onClick={() => setOpen((o) => !o)} className="rounded-full border border-line px-3 py-1.5 text-[12.5px] hover:border-ink/50">
          {open ? "Hide note" : note ? "Edit note" : "Add note"}
        </button>
        <button type="button" onClick={save} disabled={pending} className="rounded-full bg-ink px-3 py-1.5 text-[12.5px] font-semibold text-paper disabled:opacity-50">
          {saved ? "Saved ✓" : pending ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={() => start(() => removeBookmark(storyId))} className="ml-auto inline-flex items-center gap-1 text-[12px] text-muted hover:text-rust" aria-label="Remove from library">
          <Trash2 className="h-3.5 w-3.5" /> Remove
        </button>
      </div>
      {open && <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3} placeholder="Why did you keep this? What stood out?" className="mt-2 w-full rounded-2xl border border-line bg-paper/60 px-3.5 py-2.5 text-[13.5px] outline-none focus:border-ink/50" />}
    </div>
  );
}
