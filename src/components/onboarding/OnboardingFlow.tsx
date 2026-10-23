"use client";

import { useState, useTransition } from "react";
import { completeOnboarding } from "@/app/actions";
import { GlobeNewspaper, CoffeeCup, Compass, Lightbulb } from "@/components/doodles";
import { SUBJECTS } from "@/lib/taxonomy";
import type { Preferences, Subject, Budget } from "@/lib/types";
import { cn } from "@/lib/utils";

export function OnboardingFlow({ initial }: { initial: Preferences }) {
  const [step, setStep] = useState(0);
  const [p, setP] = useState<Preferences>(initial);
  const [pending, start] = useTransition();
  const toggle = (s: Subject) => setP((x) => ({ ...x, subjects: x.subjects.includes(s) ? x.subjects.filter((y) => y !== s) : [...x.subjects, s] }));
  const chip = (a: boolean) => cn("rounded-2xl border p-4 text-left transition", a ? "border-ink bg-butter shadow-card" : "border-line bg-card hover:border-ink/40");

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-[760px] flex-col justify-center px-4 py-10">
      <div className="mb-6 flex items-center gap-2">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-ink" : "bg-line")} />
        ))}
      </div>
      <div className="card p-6 sm:p-10 animate-fadeUp" key={step}>
        {step === 0 && (
          <div className="text-center">
            <GlobeNewspaper className="mx-auto h-24 w-24" />
            <h1 className="display mt-4 text-[40px] font-medium leading-tight sm:text-[52px]">Hello, curious mind! ✨</h1>
            <p className="mt-2 text-[17px] text-muted">Let&rsquo;s build your little window to the world.</p>
            <button type="button" onClick={() => setStep(1)} className="mt-8 rounded-full bg-ink px-8 py-3 text-[15px] font-semibold text-paper">Let&rsquo;s Begin</button>
          </div>
        )}
        {step === 1 && (
          <div>
            <Compass className="h-12 w-12" />
            <h2 className="display mt-3 text-[30px] font-medium">Pick your interests</h2>
            <p className="text-[14px] text-muted">Choose as many as you like. We&rsquo;ll still show you what matters beyond them.</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {SUBJECTS.map((s) => (
                <button key={s.id} type="button" onClick={() => toggle(s.id)} className={chip(p.subjects.includes(s.id))} aria-pressed={p.subjects.includes(s.id)}>
                  <span className="text-xl">{s.emoji}</span>
                  <span className="display mt-1 block text-[17px] font-medium">{s.label}</span>
                  <span className="block text-[12px] text-muted">{s.description}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {step === 2 && (
          <div>
            <Lightbulb className="h-12 w-12" />
            <h2 className="display mt-3 text-[30px] font-medium">Choose your reading style</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {([["quick", "Quick Catch-Up", "Headlines explained in 60 seconds."], ["both", "A Little of Both", "Quick reads, with deep dives when it matters."], ["deep", "Deep Thinker", "Background, fundamentals and competing views."]] as const).map(([v, l, d]) => (
                <button key={v} type="button" onClick={() => setP({ ...p, depth: v })} className={chip(p.depth === v)}>
                  <span className="display block text-[18px] font-medium">{l}</span>
                  <span className="block text-[12.5px] text-muted">{d}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {step === 3 && (
          <div>
            <CoffeeCup className="h-12 w-12" />
            <h2 className="display mt-3 text-[30px] font-medium">Set your daily goal</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              {([[5, "5 minutes"], [10, "10 minutes"], [20, "20 minutes"], [0, "No fixed goal"]] as [Budget, string][]).map(([v, l]) => (
                <button key={v} type="button" onClick={() => setP({ ...p, budget: v })} className={chip(p.budget === v)}>
                  <span className="display block text-[18px] font-medium">{l}</span>
                </button>
              ))}
            </div>
            <div className="mt-5">
              <p className="text-[14px] font-medium">India or international?</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {([["india", "Mostly India"], ["balanced", "A balance"], ["global", "Mostly global"]] as const).map(([v, l]) => (
                  <button key={v} type="button" onClick={() => setP({ ...p, geography: v })} className={cn("pill border", p.geography === v ? "border-ink bg-ink text-paper" : "border-line bg-card")}>{l}</button>
                ))}
              </div>
            </div>
          </div>
        )}
        {step > 0 && (
          <div className="mt-8 flex items-center justify-between">
            <button type="button" onClick={() => setStep((s) => s - 1)} className="text-[14px] text-muted hover:text-ink">← Back</button>
            {step < 3 ? (
              <button type="button" onClick={() => setStep((s) => s + 1)} disabled={step === 1 && p.subjects.length === 0} className="rounded-full bg-ink px-6 py-2.5 text-[14px] font-semibold text-paper disabled:opacity-40">Continue →</button>
            ) : (
              <button type="button" disabled={pending} onClick={() => start(() => completeOnboarding(p))} className="rounded-full bg-ink px-6 py-2.5 text-[14px] font-semibold text-paper disabled:opacity-60">
                {pending ? "Preparing your world…" : "Your world is ready to explore →"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
