"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { savePreferences, updateProfile, signOutAction, deleteAccountData } from "@/app/actions";
import { SUBJECTS } from "@/lib/taxonomy";
import type { Preferences, Subject, Budget } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

const INDUSTRIES = ["Banking & finance", "Technology", "Consumer & retail", "Energy", "Pharma & healthcare", "Autos & EVs", "Real estate & infrastructure", "Media & advertising", "Agriculture", "Manufacturing", "Telecom", "Startups & VC"];

export function SettingsForm({ user, prefs, system }: { user: { name: string | null; email: string | null; isGuest: boolean }; prefs: Preferences; system: { ai: boolean; model: string; fred: boolean; lastRefresh: string | null; schedule: Record<string, string> } }) {
  const [p, setP] = useState<Preferences>(prefs);
  const [name, setName] = useState(user.name ?? "");
  const [tracked, setTracked] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const toggle = <T,>(arr: T[], v: T) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const apply = (next: Preferences) => {
    setP(next);
    try {
      localStorage.setItem("cb-theme", next.theme);
      localStorage.setItem("cb-font", String(next.fontScale));
      const dark = next.theme === "dark" || (next.theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.style.setProperty("--font-scale", String(next.fontScale));
      document.body.dataset.reading = next.readingMode;
    } catch {}
  };
  const save = () =>
    start(async () => {
      await savePreferences(p);
      if (!user.isGuest) await updateProfile(name);
      setStatus("Saved ✓");
      setTimeout(() => setStatus(null), 1500);
    });

  const Section = ({ id, title, children, hint }: { id: string; title: string; hint?: string; children: React.ReactNode }) => (
    <section id={id} className="card scroll-mt-24 p-5 sm:p-6">
      <h2 className="display text-[22px] font-medium">{title}</h2>
      {hint && <p className="mt-0.5 text-[13px] text-muted">{hint}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
  const chip = (active: boolean) => cn("pill border text-[13px]", active ? "border-ink bg-ink text-paper" : "border-line bg-card hover:border-ink/50");

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
      <div className="space-y-5">
        <Section id="interests" title="Which subjects interest you?" hint="Preferred subjects are emphasised and ordered first. Others still appear in Beyond My Bubble.">
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map((s) => (
              <button key={s.id} type="button" onClick={() => apply({ ...p, subjects: toggle(p.subjects, s.id as Subject) })} className={chip(p.subjects.includes(s.id as Subject))} aria-pressed={p.subjects.includes(s.id as Subject)}>
                {s.emoji} {s.label}
              </button>
            ))}
          </div>
        </Section>
        <Section id="industries" title="Which industries do you follow?">
          <div className="flex flex-wrap gap-2">
            {INDUSTRIES.map((i) => (
              <button key={i} type="button" onClick={() => apply({ ...p, industries: toggle(p.industries, i) })} className={chip(p.industries.includes(i))} aria-pressed={p.industries.includes(i)}>
                {i}
              </button>
            ))}
          </div>
        </Section>
        <Section id="geo" title="Indian or international developments?" hint="Default balance: 40% India, 40% global, 20% cross-border. Major breaking stories override this.">
          <div className="flex flex-wrap gap-2">
            {([["india", "Mostly India"], ["balanced", "A balance of both"], ["global", "Mostly global"]] as const).map(([v, l]) => (
              <button key={v} type="button" onClick={() => apply({ ...p, geography: v })} className={chip(p.geography === v)}>{l}</button>
            ))}
          </div>
        </Section>
        <Section id="time" title="How much time do you usually have?">
          <div className="flex flex-wrap gap-2">
            {([[5, "5-minute briefing"], [10, "10-minute briefing"], [20, "20-minute briefing"], [0, "Deep research session"]] as [Budget, string][]).map(([v, l]) => (
              <button key={v} type="button" onClick={() => apply({ ...p, budget: v })} className={chip(p.budget === v)}>{l}</button>
            ))}
          </div>
        </Section>
        <Section id="depth" title="What level of detail do you prefer?">
          <div className="flex flex-wrap gap-2">
            {([["quick", "Quick Catch-Up"], ["both", "A Little of Both"], ["deep", "Deep Thinker"]] as const).map(([v, l]) => (
              <button key={v} type="button" onClick={() => apply({ ...p, depth: v })} className={chip(p.depth === v)}>{l}</button>
            ))}
          </div>
        </Section>
        <Section id="tracked" title="Companies, countries or topics to track" hint="Stories mentioning these get a boost in your brief and on Today.">
          <div className="flex flex-wrap gap-2">
            {p.tracked.map((t) => (
              <button key={t} type="button" onClick={() => apply({ ...p, tracked: p.tracked.filter((x) => x !== t) })} className="pill border border-ink bg-ink text-paper">{t} ×</button>
            ))}
          </div>
          <form
            className="mt-3 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const v = tracked.trim();
              if (v && !p.tracked.includes(v)) apply({ ...p, tracked: [...p.tracked, v].slice(0, 20) });
              setTracked("");
            }}
          >
            <input value={tracked} onChange={(e) => setTracked(e.target.value)} placeholder="e.g. Reliance, semiconductors, Japan" className="min-w-0 flex-1 rounded-full border border-line bg-paper/60 px-4 py-2 text-[14px] outline-none focus:border-ink/50" aria-label="Add a tracked topic" />
            <button type="submit" className="rounded-full border border-ink px-4 py-2 text-[13px] font-semibold">Add</button>
          </form>
        </Section>
        <Section id="reading" title="Reading preferences">
          <div className="space-y-4 text-[14px]">
            <div>
              <p className="font-medium">Reading mode</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {([["compact", "Compact"], ["comfortable", "Comfortable"], ["large", "Large text"]] as const).map(([v, l]) => (
                  <button key={v} type="button" onClick={() => apply({ ...p, readingMode: v })} className={chip(p.readingMode === v)}>{l}</button>
                ))}
              </div>
            </div>
            <div>
              <p className="font-medium">Theme</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {([["light", "Light"], ["dark", "Dark"], ["system", "Follow system"]] as const).map(([v, l]) => (
                  <button key={v} type="button" onClick={() => apply({ ...p, theme: v })} className={chip(p.theme === v)}>{l}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="font-medium" htmlFor="font-scale">Font size · {Math.round(p.fontScale * 100)}%</label>
              <input id="font-scale" type="range" min="0.9" max="1.3" step="0.05" value={p.fontScale} onChange={(e) => apply({ ...p, fontScale: Number(e.target.value) })} className="mt-1.5 w-full max-w-xs accent-[#9A3F3F]" />
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={p.focusMode} onChange={(e) => apply({ ...p, focusMode: e.target.checked })} className="accent-[#9A3F3F]" />
              Distraction-free mode on story pages (hides related stories and the Curio button)
            </label>
          </div>
        </Section>
        <Section id="notifications" title="Notifications" hint="Preferences are stored now; email delivery needs an email provider key (not configured).">
          <div className="space-y-2 text-[14px]">
            {([["dailyBrief", "Daily brief every morning"], ["weekly", "The Week, Decoded on Sundays"], ["breaking", "Must Know breaking stories"]] as const).map(([k, l]) => (
              <label key={k} className="flex items-center gap-2">
                <input type="checkbox" checked={p.notifications[k]} onChange={(e) => apply({ ...p, notifications: { ...p.notifications, [k]: e.target.checked } })} className="accent-[#9A3F3F]" /> {l}
              </label>
            ))}
          </div>
        </Section>
        <Section id="account" title="Account">
          {user.isGuest ? (
            <p className="text-[14px]">
              You&rsquo;re reading as a guest on this device. <Link href="/signup" className="font-semibold text-rust underline">Create a free account</Link> to keep everything across devices, or <Link href="/signin" className="font-semibold underline">sign in</Link>.
            </p>
          ) : (
            <div className="space-y-3 text-[14px]">
              <label className="block">
                <span className="text-[12px] text-muted">Display name</span>
                <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full max-w-sm rounded-full border border-line bg-paper/60 px-4 py-2 outline-none focus:border-ink/50" />
              </label>
              <p className="text-muted">Signed in as {user.email}</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => start(() => signOutAction())} className="rounded-full border border-line px-4 py-2 text-[13px] font-semibold hover:border-ink/50">Sign out</button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Delete your account and all saved data? This cannot be undone.")) start(() => deleteAccountData());
                  }}
                  className="rounded-full px-4 py-2 text-[13px] text-muted hover:text-rust"
                >
                  Delete account &amp; data
                </button>
              </div>
            </div>
          )}
        </Section>
        <div className="sticky bottom-4 flex items-center gap-3">
          <button type="button" onClick={save} disabled={pending} className="rounded-full bg-ink px-6 py-3 text-[14px] font-semibold text-paper shadow-pop disabled:opacity-50">
            {pending ? "Saving…" : "Save preferences"}
          </button>
          {status && <span className="text-[13px] text-muted">{status}</span>}
        </div>
      </div>
      <aside className="space-y-4 text-[13px]">
        <div className="card p-4">
          <p className="font-semibold">System status</p>
          <ul className="mt-2 space-y-1.5 text-muted">
            <li>News refresh: {system.lastRefresh ? timeAgo(system.lastRefresh) : "pending"}</li>
            <li>Schedule: breaking every {system.schedule.breaking} min · general {system.schedule.general} min · analysis {Number(system.schedule.analysis) / 60} h · economic data {Number(system.schedule.econ) / 60} h</li>
            <li>AI layer: {system.ai ? `on (${system.model})` : "off — add NVIDIA_API_KEY or ANTHROPIC_API_KEY"}</li>
            <li>FRED data: {system.fred ? "on" : "off — add FRED_API_KEY (optional)"}</li>
          </ul>
          <Link href="/sources" className="mt-2 inline-block font-semibold text-rust hover:underline">Source health →</Link>
        </div>
        <div className="card p-4 text-muted">
          <p className="font-semibold text-ink">Privacy</p>
          <p className="mt-1">Reading history, bookmarks and reflections are stored only in this app&rsquo;s database and used solely to personalise your reading. Nothing is shared or public.</p>
        </div>
      </aside>
    </div>
  );
}
