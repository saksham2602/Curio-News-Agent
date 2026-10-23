"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { createReflection } from "@/app/actions";

export function PerspectiveForm({ storyId, questions, existing }: { storyId: string; questions: string[]; existing: { id: string; title: string } | null }) {
  const [answers, setAnswers] = useState<string[]>(questions.map(() => ""));
  const [savedId, setSavedId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (existing && !savedId) {
    return (
      <div className="mt-4 rounded-2xl bg-card p-4 text-[14px]">
        You already wrote <Link href={`/perspectives/${existing.id}`} className="font-semibold text-rust underline">{existing.title}</Link> on this story.{" "}
        <button type="button" onClick={() => setSavedId("new")} className="font-semibold underline">
          Write another
        </button>
      </div>
    );
  }
  if (savedId && savedId !== "new") {
    return (
      <div className="mt-4 rounded-2xl bg-card p-4 text-[14px]">
        Saved to <Link href="/perspectives" className="font-semibold text-rust underline">My Perspectives</Link>.{" "}
        <Link href={`/perspectives/${savedId}`} className="font-semibold underline">
          Open it to refine or request an AI review →
        </Link>
      </div>
    );
  }

  return (
    <form
      className="mt-4 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!answers.some((a) => a.trim())) return;
        start(async () => {
          const freeform = questions.map((q, i) => `Q: ${q}\nA: ${answers[i].trim() || "(no answer yet)"}`).join("\n\n");
          const id = await createReflection({ title: `My take: ${questions[0]?.slice(0, 80) ?? "this story"}`, storyId, meaning: answers[0] ?? "", freeform });
          setSavedId(id);
        });
      }}
    >
      {questions.map((q, i) => (
        <label key={i} className="block">
          <span className="block text-[14px] font-medium leading-snug">{q}</span>
          <textarea value={answers[i]} onChange={(e) => setAnswers((a) => a.map((x, j) => (j === i ? e.target.value : x)))} rows={3} placeholder="Write your thinking here…" className="mt-1.5 w-full rounded-2xl border border-line bg-card px-3.5 py-2.5 text-[14px] outline-none focus:border-ink/50" />
        </label>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending || !answers.some((a) => a.trim())} className="rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-paper disabled:opacity-50">
          {pending ? "Saving…" : "Build My Perspective"}
        </button>
        <span className="text-[12px] text-muted">Saves privately to My Perspectives, where you can ask for an AI perspective review.</span>
      </div>
    </form>
  );
}
