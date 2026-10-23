import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeader, SubjectTag, TierBadge, PrimaryButton, SecondaryButton, EmptyState } from "@/components/ui";
import { StoryCard, SourcesRow } from "@/components/story/StoryCard";
import { Books, ChartFrame, Compass, GlobeNewspaper, Magnifier, Nodes, Notebook, PaperPlane, Planet } from "@/components/doodles";
import { SUBJECT_MAP, subjectMeta } from "@/lib/taxonomy";
import type { StoryCardData } from "@/lib/queries";
import type { Subject } from "@/lib/types";
import { cn, safeJson, truncate } from "@/lib/utils";
import { Sparkline } from "@/components/pulse/Sparkline";
import type { Indicator } from "@prisma/client";

type State = { bookmarked: Set<string>; read: Set<string> };

export function BigPicture({ stories, state, total }: { stories: StoryCardData[]; state: State; total: number }) {
  if (!stories.length) return null;
  const [lead, ...rest] = stories;
  return (
    <section className="mt-14">
      <SectionHeader
        eyebrow="Today's big picture"
        title="The five most consequential developments"
        description="Chosen for significance — corroboration, scale, policy and economic consequence, relevance to India — not for clicks or genre."
        doodle={<Magnifier className="h-12 w-12" />}
        action={{ href: "/news", label: total - stories.length > 0 ? `${total - stories.length} more major stories` : "All news" }}
      />
      <div className="mt-6 space-y-5">
        <StoryCard story={lead} variant="hero" bookmarked={state.bookmarked.has(lead.id)} read={state.read.has(lead.id)} priority />
        <div className="grid gap-5 md:grid-cols-2">
          {rest.map((s) => (
            <StoryCard key={s.id} story={s} variant="grid" bookmarked={state.bookmarked.has(s.id)} read={state.read.has(s.id)} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function BySubject({ groups, state }: { groups: { subject: Subject; stories: StoryCardData[] }[]; state: State }) {
  if (!groups.length) return null;
  return (
    <section className="mt-16">
      <SectionHeader
        eyebrow="Across the world"
        title="Important developments, by subject"
        description="A broad sweep across subjects and geographies, grouped so it reads like a newspaper, not a wall of headlines."
        doodle={<GlobeNewspaper className="h-12 w-12" />}
        action={{ href: "/news", label: "All important news" }}
      />
      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {groups.map((g) => {
          const meta = SUBJECT_MAP[g.subject];
          return (
            <div key={g.subject} className="card px-5 pb-2 pt-4 sm:px-6">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/70">
                  <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} /> {meta.label}
                </span>
                <Link href={`/news?subject=${g.subject}`} className="text-[12px] text-muted hover:text-rust">
                  More →
                </Link>
              </div>
              <div className="divide-y divide-line">
                {g.stories.map((s) => (
                  <StoryCard key={s.id} story={s} variant="row" bookmarked={state.bookmarked.has(s.id)} read={state.read.has(s.id)} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function Bubble({ stories, state, inline }: { stories: StoryCardData[]; state: State; inline?: boolean }) {
  if (!stories.length) return null;
  return (
    <section className={cn("mt-16 rounded-[28px] bg-sage/45 p-5 dark:bg-sage/10 sm:p-8", inline && "mt-0")}>
      <SectionHeader
        eyebrow={<>Beyond my bubble 🌍</>}
        title="Worth discovering, outside your usual reading"
        description="Important developments from subjects you may not follow. We never infer your politics from what you read."
        doodle={<Compass className="h-12 w-12" />}
        action={{ href: "/bubble", label: "Explore more" }}
      />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stories.slice(0, 4).map((s) => (
          <StoryCard key={s.id} story={s} variant="compact" bookmarked={state.bookmarked.has(s.id)} read={state.read.has(s.id)} bubbleReason={`Worth discovering: ${s.scoreReason.replace(/^[^:]+:\s*/, "").replace(/\.$/, "")}. A window into ${subjectMeta(s.subject).label} beyond the day's headline topics.`} />
        ))}
      </div>
    </section>
  );
}

export function Spotlight({ deep, unexpected, state }: { deep: StoryCardData | null; unexpected: StoryCardData | null; state: State }) {
  if (!deep && !unexpected) return null;
  return (
    <section className="mt-16 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
      {deep && (
        <div className="relative overflow-hidden rounded-[28px] bg-[#1F1E1C] p-6 text-[#F3EFE6] sm:p-8">
          <Books className="pointer-events-none absolute bottom-4 right-6 h-16 w-16 opacity-90" />
          <p className="eyebrow !text-[#E8968C]">Today&rsquo;s deep dive</p>
          <h3 className="display mt-3 max-w-xl text-balance text-[28px] font-medium leading-[1.1] sm:text-[38px]">
            <Link href={`/story/${deep.slug}/deep`} className="hover:text-butter">{deep.title}</Link>
          </h3>
          {deep.summary && <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-[#F3EFE6]/80">{truncate(deep.summary, 220)}</p>}
          <p className="mt-4 max-w-xl text-[12px] text-[#F3EFE6]/60">
            Reported by {deep.sourceCount} {deep.sourceCount === 1 ? "outlet" : "outlets"}. History, fundamentals, stakeholders, competing interpretations and scenarios — all source-linked.
          </p>
          <Link href={`/story/${deep.slug}/deep`} className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-butter px-5 py-2.5 text-[13px] font-semibold text-ink hover:bg-[#F3DE8E]">
            Take Me Deeper →
          </Link>
        </div>
      )}
      {unexpected && (
        <div className="rounded-[28px] bg-lavender/60 p-6 dark:bg-lavender/15 sm:p-8">
          <div className="flex items-center gap-2">
            <Planet className="h-9 w-9" />
            <p className="eyebrow !text-ink/60">Something unexpected</p>
          </div>
          <SubjectTag subject={unexpected.subject} className="mt-5" />
          <h3 className="display mt-2 text-balance text-[24px] font-medium leading-tight sm:text-[28px]">
            <Link href={`/story/${unexpected.slug}`} className="hover:text-rust">{unexpected.title}</Link>
          </h3>
          {unexpected.summary && <p className="mt-3 text-[14px] leading-relaxed text-ink/80">{truncate(unexpected.summary, 260)}</p>}
          <SourcesRow story={unexpected} className="mt-3" />
          <div className="mt-4 flex flex-wrap gap-2">
            <PrimaryButton href={`/story/${unexpected.slug}`}>Read in 60 Seconds ⚡</PrimaryButton>
            <SecondaryButton href={`/story/${unexpected.slug}/deep`}>Take Me Deeper →</SecondaryButton>
          </div>
        </div>
      )}
    </section>
  );
}

export interface ConnectPreviewData {
  id: string;
  slug: string;
  title: string;
  tier: string;
  linksFrom: { shared: string; relation: string; to: { id: string; slug: string; title: string; subject: string } }[];
}

export function ConnectPreview({ story }: { story: ConnectPreviewData | null }) {
  if (!story) return null;
  return (
    <section className="mt-16">
      <SectionHeader
        eyebrow={<>Connect the dots 🕸️</>}
        title="How today's stories touch each other"
        description="Links found through shared people, places and ideas. Topical links aren't proof of cause — open the map to see AI-classified causal, correlated and speculative connections."
        doodle={<Nodes className="h-12 w-12" />}
      />
      <div className="card mt-6 grid gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_1.3fr]">
        <div>
          <TierBadge tier={story.tier} />
          <h3 className="display mt-2 text-[24px] font-medium leading-tight sm:text-[28px]">{story.title}</h3>
          <Link href={`/connect/${story.slug}`} className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-paper hover:bg-ink/85">
            Open the connection map <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <ul className="space-y-3">
          {story.linksFrom.slice(0, 5).map((l) => (
            <li key={l.to.id} className="flex gap-3">
              <span className="mt-2.5 w-7 shrink-0 border-t border-dashed border-rust/60" aria-hidden />
              <div className="min-w-0">
                <Link href={`/story/${l.to.slug}`} className="text-[14px] font-medium leading-snug hover:text-rust">
                  {l.to.title}
                </Link>
                <p className="text-[11.5px] text-muted">
                  {subjectMeta(l.to.subject).label} · {l.relation === "topical" ? "cross-topic" : l.relation} · shares: {safeJson<string[]>(l.shared, []).slice(0, 2).join(", ").toLowerCase()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function PulsePreview({ indicators }: { indicators: Indicator[] }) {
  const picks = ["IN_GDP", "IN_CPI", "USDINR", "WLD_GDP"].map((c) => indicators.find((i) => i.code === c)).filter((i): i is Indicator => !!i && i.latestValue !== null);
  if (!picks.length) return null;
  return (
    <section className="mt-16 rounded-[28px] bg-butter/45 p-5 dark:bg-butter/10 sm:p-8">
      <SectionHeader
        eyebrow="The economic pulse"
        title="Verified numbers, plainly explained"
        description="Official World Bank figures and ECB reference rates — with reference periods, so you know exactly how fresh each number is."
        doodle={<ChartFrame className="h-12 w-12" />}
        action={{ href: "/pulse", label: "Full Economic Pulse" }}
      />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {picks.map((ind) => (
          <Link key={ind.code} href={`/pulse#${ind.code}`} className="card card-hover block p-4">
            <p className="text-[12px] font-medium text-ink/80">{ind.name}</p>
            <p className="mt-1 font-mono text-[26px] leading-none">
              {fmtValue(ind.latestValue!, ind.unit)} <span className="text-[12px] text-muted">{ind.unit === "%" ? "%" : ind.unit}</span>
            </p>
            <p className="mt-1 text-[11px] text-muted">
              {ind.valueKind === "reference-rate" ? "Reference rate" : ind.valueKind === "policy-rate" ? "Policy rate" : "Actual"} · {ind.latestPeriod}
            </p>
            <Sparkline series={safeJson<{ period: string; value: number }[]>(ind.seriesJson, [])} className="mt-3 h-10 w-full" />
          </Link>
        ))}
      </div>
    </section>
  );
}

export function fmtValue(v: number, unit: string) {
  if (unit === "INR" || unit === "USD") return v.toFixed(2);
  if (unit.startsWith("US$")) return v.toFixed(1);
  return Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2).replace(/\.?0+$/, "");
}

export function ContinueExploring({ isGuest, items }: { isGuest: boolean; items: { story: StoryCardData; mode: string; progress: number }[] }) {
  return (
    <section className="mt-16">
      <SectionHeader eyebrow="Continue exploring" title="Pick up where you left off" doodle={<Notebook className="h-12 w-12" />} />
      <div className="mt-6">
        {items.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((it) => (
              <Link key={it.story.id + it.mode} href={`/story/${it.story.slug}${it.mode === "deep" ? "/deep" : ""}`} className="card card-hover block p-4">
                <SubjectTag subject={it.story.subject} />
                <h3 className="display mt-2 line-clamp-3 text-[17px] font-medium leading-snug">{it.story.title}</h3>
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-line">
                  <div className="h-full rounded-full bg-rust" style={{ width: `${Math.round(it.progress * 100)}%` }} />
                </div>
                <p className="mt-1.5 text-[11.5px] text-muted">
                  {it.mode === "deep" ? "Deep dive" : "Quick read"} · {Math.round(it.progress * 100)}% read
                </p>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            doodle={<PaperPlane className="h-14 w-14" />}
            title="Your reading trail lives here"
            description={isGuest ? "Your progress is saved on this device already. Create a free account to keep saved stories, unfinished deep dives and followed topics across devices." : "Open any story and your place is kept here, so you can always pick up where you stopped."}
            action={isGuest ? <PrimaryButton href="/signup">Create a free account</PrimaryButton> : <SecondaryButton href="/brief">Start today&rsquo;s brief</SecondaryButton>}
          />
        )}
      </div>
    </section>
  );
}
