import type { Metadata } from "next";
import Link from "next/link";
import { Container, SectionHeader } from "@/components/ui";
import { CoffeeCup, Sparkles, Lightbulb } from "@/components/doodles";
import { currentUser } from "@/lib/auth";
import { getBrief, getUserStoryState } from "@/lib/queries";
import { DEFAULT_PREFERENCES, type Budget } from "@/lib/types";
import { SUBJECT_MAP } from "@/lib/taxonomy";
import type { Subject } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "My Daily Brief" };
export const dynamic = "force-dynamic";

const BUDGETS: { v: Budget; label: string }[] = [
  { v: 5, label: "5 min" },
  { v: 10, label: "10 min" },
  { v: 20, label: "20 min" },
  { v: 0, label: "Open-ended" },
];

export default async function BriefPage({ searchParams }: { searchParams: Promise<{ budget?: string }> }) {
  const sp = await searchParams;
  const user = await currentUser();
  const prefs = user?.preferences ?? DEFAULT_PREFERENCES;
  const budget = (sp.budget !== undefined && [0, 5, 10, 20].includes(Number(sp.budget)) ? Number(sp.budget) : prefs.budget) as Budget;
  const { items, totalMinutes } = await getBrief(prefs, budget);
  const state = await getUserStoryState(user?.id ?? null, items.map((i) => i.story.id));
  const done = items.filter((i) => state.read.has(i.story.id)).length;
  const allDone = items.length > 0 && done === items.length;
  const next = items.find((i) => !state.read.has(i.story.id));

  return (
    <Container className="pb-10 pt-8 sm:pt-12">
      <div className="mx-auto max-w-[760px]">
        <SectionHeader eyebrow="My daily brief" title="A calm queue for the time you have" description="Pick a budget. It changes how many stories and how deep — never what's important. Must Know stories always come first." doodle={<CoffeeCup className="h-12 w-12" />} size="lg" />
        <div className="mt-8 border-t border-line" />

        <div className="card mt-8 p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="no-scrollbar flex min-w-0 max-w-full gap-2 overflow-x-auto">
              {BUDGETS.map((b) => (
                <Link key={b.v} href={`/brief?budget=${b.v}`} className={cn("pill border", budget === b.v ? "border-ink bg-ink text-paper" : "border-line bg-card hover:border-ink/40")}>
                  {b.label}
                </Link>
              ))}
            </div>
            <p className="text-[12.5px] text-muted">
              {items.length} stories · about {totalMinutes} min · <Link href="/settings#interests" className="underline hover:text-rust">change the mix</Link>
            </p>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between text-[13px]">
              <span className="font-medium">{allDone ? "You're caught up on today's big stories!" : `${done} of ${items.length} stories completed`}</span>
              {next && (
                <Link href={`/story/${next.story.slug}${next.mode === "deep" ? "/deep" : ""}`} className="font-semibold text-rust hover:underline">
                  {done === 0 ? "Start here →" : "Continue →"}
                </Link>
              )}
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-line">
              <div className="h-full rounded-full bg-sage transition-all" style={{ width: `${items.length ? (done / items.length) * 100 : 0}%`, backgroundColor: "#8FBF8F" }} />
            </div>
          </div>

          {allDone ? (
            <div className="mt-6 rounded-3xl bg-butter/50 p-6 text-center dark:bg-butter/10">
              <Sparkles className="mx-auto h-8 w-8 text-[#B48A00]" />
              <p className="display mt-2 text-[22px]">You&rsquo;re a little more informed than you were {budget || 20} minutes ago. ✨</p>
              <p className="mt-1 text-[13px] text-muted">Come back tomorrow for a fresh queue, or wander <Link href="/bubble" className="underline">beyond your bubble</Link>.</p>
            </div>
          ) : null}

          <ol className="mt-6 divide-y divide-line">
            {items.map((item, i) => {
              const read = state.read.has(item.story.id);
              const href = `/story/${item.story.slug}${item.mode === "deep" ? "/deep" : ""}`;
              return (
                <li key={item.story.id} className={cn("flex items-start gap-3.5 py-3.5", read && "opacity-60")}>
                  <span className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold", read ? "bg-sage" : item.story.tier === "must-know" ? "bg-butter" : "bg-line")}>{read ? "✓" : i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <Link href={href} className="text-[15px] font-medium leading-snug hover:text-rust">
                      {item.story.title}
                    </Link>
                    <p className="mt-0.5 text-[12px] text-muted">
                      {SUBJECT_MAP[item.story.subject as Subject]?.label ?? item.story.subject} · {item.mode === "deep" ? "Deep dive" : "Quick read"} · {item.minutes} min · {item.reason}
                    </p>
                  </div>
                  <Link href={href} className="hidden shrink-0 rounded-full border border-line px-3 py-1.5 text-[12px] font-semibold hover:border-ink/50 sm:inline-flex">
                    {item.mode === "deep" ? "Take me deeper →" : "Read in 60s ⚡"}
                  </Link>
                </li>
              );
            })}
          </ol>
          {items.length === 0 && <p className="mt-6 text-sm text-muted">No stories yet. The first refresh runs automatically after the server starts.</p>}
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-dashed border-line p-4 text-[13px] text-muted">
          <Lightbulb className="h-7 w-7 shrink-0" />
          <p>Mark a story as read from its page, and it ticks off here. Your progress is kept on this device{user && !user.isGuest ? " and your account" : ""}; the queue refreshes each day with new reporting.</p>
        </div>
      </div>
    </Container>
  );
}
