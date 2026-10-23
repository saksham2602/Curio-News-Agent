"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createReflection, updateReflection, deleteReflection, requestPerspectiveReview } from "@/app/actions";
import { Sparkles } from "@/components/doodles";
import type { PerspectiveReview } from "@/lib/types";

const FIELDS: { key: "happened" | "meaning" | "evidence" | "missing" | "changeMind"; label: string; hint: string }[] = [
  { key: "happened", label: "What happened?", hint: "The development, in your own words." },
  { key: "meaning", label: "What do I think it means?", hint: "Your interpretation. A prediction is fine — date it." },
  { key: "evidence", label: "What evidence supports my view?", hint: "Facts, data, sources." },
  { key: "missing", label: "What might I be missing?", hint: "Blind spots, other stakeholders, second-order effects." },
  { key: "changeMind", label: "What could change my mind?", hint: "The indicator or event that would make you update." },
];

export interface ReflectionData {
  id?: string;
  title: string;
  storyId?: string | null;
  happened: string;
  meaning: string;
  evidence: string;
  missing: string;
  changeMind: string;
  freeform: string;
  aiReview?: PerspectiveReview | null;
}

export function ReflectionEditor({ initial, aiConfigured, storyTitle }: { initial: ReflectionData; aiConfigured: boolean; storyTitle?: string | null }) {
  const [data, setData] = useState(initial);
  const [status, setStatus] = useState<string | null>(null);
  const [review, setReview] = useState<PerspectiveReview | null>(initial.aiReview ?? null);
  const [pending, start] = useTransition();
  const [reviewing, startReview] = useTransition();
  const router = useRouter();
  const set = (k: keyof ReflectionData, v: string) => setData((d) => ({ ...d, [k]: v }));

  const save = () =>
    start(async () => {
      if (data.id) {
        await updateReflection(data.id, data);
        setStatus("Saved");
      } else {
        const id = await createReflection(data);
        setStatus("Saved");
        router.replace(`/perspectives/${id}`);
      }
      setTimeout(() => setStatus(null), 1500);
    });

  const askReview = () =>
    startReview(async () => {
      if (!data.id) {
        setStatus("Save first, then request a review.");
        return;
      }
      await updateReflection(data.id, data);
      const r = await requestPerspectiveReview(data.id);
      if (!r.ok) setStatus(r.error ?? "Review failed");
      else router.refresh();
    });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="card p-5 sm:p-7">
        <input value={data.title} onChange={(e) => set("title", e.target.value)} placeholder="Title your reflection" className="display w-full bg-transparent text-[26px] font-medium outline-none placeholder:text-muted" aria-label="Title" />
        {storyTitle && <p className="mt-1 text-[12px] text-muted">On: {storyTitle}</p>}
        <div className="mt-5 space-y-5">
          {FIELDS.map((f) => (
            <label key={f.key} className="block">
              <span className="block text-[15px] font-semibold">{f.label}</span>
              <span className="block text-[12px] text-muted">{f.hint}</span>
              <textarea value={data[f.key]} onChange={(e) => set(f.key, e.target.value)} rows={3} className="mt-1.5 w-full rounded-2xl border border-line bg-paper/60 px-3.5 py-2.5 text-[14px] leading-relaxed outline-none focus:border-ink/50" />
            </label>
          ))}
          <label className="block">
            <span className="block text-[15px] font-semibold">Other notes</span>
            <span className="block text-[12px] text-muted">Questions, connections to other events, personal observations.</span>
            <textarea value={data.freeform} onChange={(e) => set("freeform", e.target.value)} rows={4} className="mt-1.5 w-full rounded-2xl border border-line bg-paper/60 px-3.5 py-2.5 text-[14px] leading-relaxed outline-none focus:border-ink/50" />
          </label>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <button type="button" onClick={save} disabled={pending} className="rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-paper disabled:opacity-50">
            {pending ? "Saving…" : "Save reflection"}
          </button>
          {aiConfigured && (
            <button type="button" onClick={askReview} disabled={reviewing} className="inline-flex items-center gap-1.5 rounded-full bg-lavender px-4 py-2 text-[13px] font-semibold text-[#3E2E6E] disabled:opacity-60">
              <Sparkles className="h-4 w-4" /> {reviewing ? "Reviewing…" : "AI perspective review"}
            </button>
          )}
          {data.id && (
            <button
              type="button"
              onClick={() => {
                if (confirm("Delete this reflection? This cannot be undone.")) start(() => deleteReflection(data.id!));
              }}
              className="ml-auto text-[12.5px] text-muted hover:text-rust"
            >
              Delete
            </button>
          )}
          {status && <span className="text-[12.5px] text-muted">{status}</span>}
        </div>
      </div>
      <aside className="space-y-4">
        <div className="card p-4 text-[13px]">
          <p className="flex items-center gap-1.5 font-semibold"><Sparkles className="h-4 w-4 text-[#6B55A8]" /> Perspective review</p>
          {!aiConfigured && <p className="mt-1 text-muted">Add NVIDIA_API_KEY or ANTHROPIC_API_KEY to enable an optional AI review that identifies assumptions, counterarguments, missing evidence and useful questions. It never replaces your opinion.</p>}
          {aiConfigured && !review && <p className="mt-1 text-muted">Optional. Curio reads your reflection and responds only with questions, counterarguments and gaps — not a verdict.</p>}
          {review && (
            <div className="mt-2 space-y-3 animate-fadeUp">
              <ReviewBlock title="Assumptions" items={review.assumptions} />
              <ReviewBlock title="Counterarguments" items={review.counterarguments} />
              <ReviewBlock title="Missing evidence" items={review.missingEvidence} />
              <ReviewBlock title="Questions to sharpen it" items={review.questions} />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Refinement</p>
                <p className="mt-1 leading-relaxed">{review.refinement}</p>
              </div>
              <p className="text-[11px] text-muted">AI-generated review · {new Date(review.generatedAt).toLocaleString()}</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

function ReviewBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{title}</p>
      <ul className="mt-1 space-y-1">
        {items.map((x, i) => (
          <li key={i} className="flex gap-1.5 leading-relaxed">
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-rust" /> {x}
          </li>
        ))}
      </ul>
    </div>
  );
}
