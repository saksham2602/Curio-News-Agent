import Link from "next/link";
import { Clock } from "lucide-react";
import { SubjectTag, TierBadge, PrimaryButton, SecondaryButton } from "@/components/ui";
import { BookmarkButton } from "./BookmarkButton";
import { WhyButton } from "./WhyButton";
import { StoryImage } from "./StoryImage";
import type { StoryCardData } from "@/lib/queries";
import { REGIONS } from "@/lib/taxonomy";
import { cn, timeAgo, safeJson, truncate } from "@/lib/utils";
import type { Region } from "@/lib/types";

export type CardVariant = "hero" | "grid" | "row" | "compact" | "mini";

export interface StoryCardProps {
  story: StoryCardData;
  variant?: CardVariant;
  bookmarked?: boolean;
  read?: boolean;
  showWhy?: boolean;
  bubbleReason?: string;
  className?: string;
  priority?: boolean;
}

function uniqueSources(story: StoryCardData) {
  const seen = new Map<string, { name: string; url: string }>();
  for (const a of story.articles) if (!seen.has(a.source.name)) seen.set(a.source.name, { name: a.source.name, url: a.url });
  return Array.from(seen.values());
}

export function SourcesRow({ story, className }: { story: StoryCardData; className?: string }) {
  const sources = uniqueSources(story);
  if (!sources.length) return null;
  const primary = story.articles[0];
  return (
    <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px]", className)}>
      <span className="text-muted">Sources:</span>
      {sources.slice(0, 2).map((s, i) => (
        <span key={s.name} className="inline-flex items-center gap-2">
          {i > 0 && <span className="text-muted">·</span>}
          <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium text-rust hover:underline">
            {s.name}
          </a>
        </span>
      ))}
      <a href={primary?.url} target="_blank" rel="noopener noreferrer" className="rounded-full border border-line px-2 py-0.5 text-[11px] text-muted hover:border-ink/40 hover:text-ink">
        {sources.length > 1 ? `View all ${sources.length} sources` : "View source"}
      </a>
    </div>
  );
}

export function MetaRow({ story, className }: { story: StoryCardData; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted", className)}>
      <span>{timeAgo(story.latestPublishedAt)}</span>
      <span className="inline-flex items-center gap-1">
        <Clock className="h-3 w-3" /> {story.quickMinutes} min quick · {story.deepMinutes} min deep
      </span>
      <span>{REGIONS[story.region as Region] ?? story.region}</span>
    </div>
  );
}

export function StoryCard({ story, variant = "grid", bookmarked = false, read = false, showWhy = true, bubbleReason, className, priority }: StoryCardProps) {
  const href = `/story/${story.slug}`;
  const deepHref = `/story/${story.slug}/deep`;
  const factors = safeJson<string[]>(story.scoreFactors, []);
  const why = <WhyButton tier={story.tier} reason={story.scoreReason} factors={factors} />;

  if (variant === "hero") {
    return (
      <article className={cn("card card-hover grid gap-5 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]", read && "opacity-80", className)}>
        <Link href={href} className="block overflow-hidden rounded-2xl">
          <StoryImage story={story} className="aspect-[16/10] w-full lg:aspect-auto lg:h-full lg:min-h-[320px]" priority={priority} sizes="(min-width: 1024px) 520px, 100vw" />
        </Link>
        <div className="flex flex-col">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <SubjectTag subject={story.subject} />
              <TierBadge tier={story.tier} />
            </div>
            <BookmarkButton storyId={story.id} initial={bookmarked} />
          </div>
          <h3 className="display mt-3 text-[26px] font-medium leading-[1.12] sm:text-[34px]">
            <Link href={href} className="hover:text-rust">{story.title}</Link>
          </h3>
          {story.summary && story.summary !== story.title && <p className="mt-3 text-[15px] leading-relaxed text-ink/80">{truncate(story.summary, 220)}</p>}
          <div className="mt-3 rounded-2xl bg-coral/30 px-4 py-2.5 text-[13px] leading-relaxed dark:bg-coral/15">
            <span className="font-medium">Why it matters:</span> {story.scoreReason.replace(/^[^:]+:\s*/, "")}
          </div>
          <MetaRow story={story} className="mt-3" />
          <SourcesRow story={story} className="mt-2" />
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <PrimaryButton href={href}>Read in 60 Seconds ⚡</PrimaryButton>
            <SecondaryButton href={deepHref}>Take Me Deeper →</SecondaryButton>
            {showWhy && <span className="ml-auto">{why}</span>}
          </div>
        </div>
      </article>
    );
  }

  if (variant === "grid") {
    return (
      <article className={cn("card card-hover flex flex-col p-4 sm:p-5", read && "opacity-80", className)}>
        <Link href={href} className="block overflow-hidden rounded-2xl">
          <StoryImage story={story} className="aspect-[16/10] w-full" sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw" />
        </Link>
        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <SubjectTag subject={story.subject} />
            <TierBadge tier={story.tier} />
          </div>
          <BookmarkButton storyId={story.id} initial={bookmarked} />
        </div>
        <h3 className="display mt-3 text-[21px] font-medium leading-snug">
          <Link href={href} className="hover:text-rust">{story.title}</Link>
        </h3>
        {story.summary && story.summary !== story.title && <p className="mt-2 text-[14px] leading-relaxed text-ink/75">{truncate(story.summary, 200)}</p>}
        {bubbleReason ? (
          <div className="mt-3 rounded-2xl bg-sage/50 px-3.5 py-2.5 text-[12.5px] leading-relaxed dark:bg-sage/15">🌱 {bubbleReason}</div>
        ) : (
          <div className="mt-3 rounded-2xl bg-coral/30 px-3.5 py-2.5 text-[12.5px] leading-relaxed dark:bg-coral/15">
            <span className="font-medium">Why it matters:</span> {story.scoreReason.replace(/^[^:]+:\s*/, "")}
          </div>
        )}
        <MetaRow story={story} className="mt-3" />
        <SourcesRow story={story} className="mt-2" />
        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
          <PrimaryButton href={href}>Read in 60 Seconds ⚡</PrimaryButton>
          <SecondaryButton href={deepHref}>Take Me Deeper →</SecondaryButton>
          {showWhy && <span className="ml-auto">{why}</span>}
        </div>
      </article>
    );
  }

  if (variant === "compact") {
    return (
      <article className={cn("card card-hover flex flex-col p-3.5", read && "opacity-80", className)}>
        <Link href={href} className="block overflow-hidden rounded-xl">
          <StoryImage story={story} className="aspect-[16/11] w-full" sizes="(min-width: 1024px) 260px, (min-width: 640px) 45vw, 100vw" />
        </Link>
        <SubjectTag subject={story.subject} className="mt-3" />
        <h3 className="display mt-2 text-[18px] font-medium leading-snug">
          <Link href={href} className="hover:text-rust">{story.title}</Link>
        </h3>
        {bubbleReason && <div className="mt-2.5 rounded-xl bg-sage/50 px-3 py-2 text-[12px] leading-relaxed dark:bg-sage/15">🌱 {bubbleReason}</div>}
        <SourcesRow story={story} className="mt-2.5" />
        <div className="mt-auto flex items-center justify-between pt-3">
          {showWhy ? why : <span />}
          <BookmarkButton storyId={story.id} initial={bookmarked} />
        </div>
      </article>
    );
  }

  if (variant === "mini") {
    return (
      <Link href={href} className={cn("card card-hover block p-4", className)}>
        <SubjectTag subject={story.subject} />
        <h3 className="display mt-2 text-[17px] font-medium leading-snug">{story.title}</h3>
      </Link>
    );
  }

  // row — used in subject columns
  return (
    <article className={cn("flex gap-4 py-4", read && "opacity-80", className)}>
      <Link href={href} className="shrink-0">
        <StoryImage story={story} className="h-20 w-20 rounded-2xl sm:h-[84px] sm:w-[84px]" sizes="84px" small />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <SubjectTag subject={story.subject} />
          <TierBadge tier={story.tier} />
        </div>
        <h3 className="display mt-1.5 text-[18px] font-medium leading-snug">
          <Link href={href} className="hover:text-rust">{story.title}</Link>
        </h3>
        <MetaRow story={story} className="mt-1.5" />
        <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
          <SourcesRow story={story} />
          <div className="flex items-center gap-3">
            {showWhy && why}
            <BookmarkButton storyId={story.id} initial={bookmarked} />
          </div>
        </div>
      </div>
    </article>
  );
}
