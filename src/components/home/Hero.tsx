import Link from "next/link";
import { Search } from "lucide-react";
import { CoffeeCup, Magnifier, Moon, Sun } from "@/components/doodles";
import { fmtDate, greetingFor, timeAgo, cn } from "@/lib/utils";
import type { BriefItem } from "@/lib/queries";
import type { Budget } from "@/lib/types";

export function Hero({ refreshedAt, storyCount, brief, budget, name }: { refreshedAt: Date | null; storyCount: number; brief: BriefItem[]; budget: Budget; name?: string | null }) {
  const g = greetingFor();
  const Doodle = g.emoji === "moon" ? Moon : Sun;
  const greeting = name ? g.text.replace("curious mind", name.split(" ")[0]) : g.text;
  return (
    <section className="relative overflow-hidden rounded-[28px] border border-line bg-gradient-to-br from-[#FBF3E4] via-[#F4E9EE] to-[#F3EEE4] p-5 shadow-card dark:from-[#2A2622] dark:via-[#2B2530] dark:to-[#272521] sm:p-8 lg:p-10">
      <div className="grain pointer-events-none absolute inset-0 opacity-70" aria-hidden />
      <Magnifier className="pointer-events-none absolute -right-2 -top-1 hidden h-24 w-24 text-ink/80 lg:block" />
      <div className="relative grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3 text-[13px]">
            <span className="rounded-full bg-card px-3.5 py-1.5 font-medium shadow-card">{fmtDate(new Date())}</span>
            <span className="text-muted">
              {refreshedAt ? (
                <>
                  News refreshed {timeAgo(refreshedAt)} · {storyCount.toLocaleString("en-IN")} stories
                </>
              ) : (
                "First refresh in progress…"
              )}
            </span>
          </div>
          <h1 className="display mt-6 text-balance text-[44px] font-medium leading-[0.98] sm:text-[64px] lg:text-[76px]">{greeting}</h1>
          <Doodle className="mt-4 h-14 w-14 sm:h-16 sm:w-16" />
          <p className="display mt-3 text-[22px] italic text-ink/80 sm:text-[26px]" style={{ fontVariationSettings: '"opsz" 72, "SOFT" 100' }}>
            Let&rsquo;s make sense of the world today.
          </p>
          <form action="/explore" className="relative mt-6 flex max-w-xl items-center rounded-full bg-card p-1.5 shadow-card ring-1 ring-line focus-within:ring-ink/40">
            <Search className="ml-3 h-[18px] w-[18px] shrink-0 text-muted" />
            <input name="q" type="search" placeholder="What are you curious about today?" className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[15px] outline-none placeholder:text-muted" aria-label="Search" />
            <button type="submit" className="rounded-full bg-ink px-5 py-2.5 text-[14px] font-semibold text-paper hover:bg-ink/85">
              Explore
            </button>
          </form>
          <CoffeeCup className="mt-3 hidden h-14 w-14 lg:ml-[560px] lg:block" />
        </div>
        <DailyBriefPanel brief={brief} budget={budget} />
      </div>
    </section>
  );
}

const BUDGETS: { v: Budget; label: string }[] = [
  { v: 5, label: "5 min" },
  { v: 10, label: "10 min" },
  { v: 20, label: "20 min" },
  { v: 0, label: "Open-ended" },
];

export function DailyBriefPanel({ brief, budget }: { brief: BriefItem[]; budget: Budget }) {
  return (
    <div className="card relative p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <CoffeeCup className="h-10 w-10 shrink-0" />
        <div>
          <p className="eyebrow">Today&rsquo;s queue</p>
          <h2 className="display text-[24px] font-medium leading-tight">Your Daily Brief</h2>
        </div>
      </div>
      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto">
        {BUDGETS.map((b) => (
          <Link key={b.v} href={`/?budget=${b.v}`} scroll={false} className={cn("pill border", budget === b.v ? "border-ink bg-ink text-paper" : "border-line bg-card hover:border-ink/40")}>
            {b.label}
          </Link>
        ))}
      </div>
      <ol className="mt-4 space-y-2.5">
        {brief.slice(0, 5).map((item, i) => (
          <li key={item.story.id} className="flex items-start gap-3">
            <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold", item.story.tier === "must-know" ? "bg-butter" : "bg-line")}>{i + 1}</span>
            <div className="min-w-0">
              <Link href={`/story/${item.story.slug}${item.mode === "deep" ? "/deep" : ""}`} className="line-clamp-2 text-[14px] font-medium leading-snug hover:text-rust">
                {item.story.title}
              </Link>
              <p className="text-[11.5px] text-muted">
                {item.reason} · {item.mode === "deep" ? "Deep dive" : "Quick read"} · {item.minutes} min
              </p>
            </div>
          </li>
        ))}
        {brief.length === 0 && <li className="text-sm text-muted">Your queue fills in as soon as the first refresh finishes.</li>}
      </ol>
      <Link href={`/brief?budget=${budget}`} className="mt-5 inline-flex items-center gap-1 text-[14px] font-semibold text-rust hover:underline">
        Start the brief →
      </Link>
    </div>
  );
}
