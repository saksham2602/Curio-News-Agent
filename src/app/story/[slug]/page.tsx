import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, SubjectTag, TierBadge, AiLabel, Callout } from "@/components/ui";
import { StoryCard, SourcesRow, MetaRow } from "@/components/story/StoryCard";
import { StoryImage } from "@/components/story/StoryImage";
import { ReadingControls } from "@/components/story/ReadingControls";
import { ReadingTracker } from "@/components/story/ReadingTracker";
import { GenerateQuickRead } from "@/components/story/GenerateQuickRead";
import { HighlightToolbar } from "@/components/story/HighlightToolbar";
import { Lightbulb } from "@/components/doodles";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStoryBySlug, getUserStoryState } from "@/lib/queries";
import { isAiConfigured } from "@/lib/ai/client";
import type { QuickRead } from "@/lib/types";
import { fmtShortDate, safeJson } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = await db.story.findUnique({ where: { slug }, select: { title: true, summary: true } });
  return { title: s?.title ?? "Story", description: s?.summary?.slice(0, 160) };
}

const AUDIENCE_TONE: Record<string, "butter" | "sage" | "powder" | "coral" | "lavender"> = { "Indian economy": "butter", Businesses: "sage", "Financial markets": "powder", Consumers: "coral", "Global developments": "lavender" };

export default async function QuickReadPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [story, user] = await Promise.all([getStoryBySlug(slug), currentUser()]);
  if (!story) notFound();
  const qr = safeJson<QuickRead | null>(story.quickReadJson, null);
  const related = story.linksFrom.map((l) => l.to);
  const state = await getUserStoryState(user?.id ?? null, [story.id, ...related.map((r) => r.id)]);
  const ev = user ? await db.readingEvent.findUnique({ where: { userId_storyId_mode: { userId: user.id, storyId: story.id, mode: "quick" } } }) : null;
  const ai = isAiConfigured();

  return (
    <Container className="pb-10 pt-6 sm:pt-10">
      <div data-story-id={story.id} data-story-title={story.title} className="mx-auto max-w-[860px]">
        <ReadingTracker storyId={story.id} mode="quick" initialProgress={ev?.progress ?? 0} />
        <HighlightToolbar storyId={story.id} />
        <nav className="text-[12px] text-muted" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-rust">Today</Link> <span className="mx-1">/</span> <Link href={`/news?subject=${story.subject}`} className="hover:text-rust">{story.subject}</Link> <span className="mx-1">/</span> Quick read ⚡
        </nav>

        <header className="mt-4">
          <div className="flex flex-wrap items-center gap-2">
            <SubjectTag subject={story.subject} />
            <TierBadge tier={story.tier} />
            <span className="text-[12px] text-muted">Event date {fmtShortDate(story.firstPublishedAt)} · Latest report {fmtShortDate(story.latestPublishedAt)}</span>
          </div>
          <h1 className="display mt-3 text-balance text-[32px] font-medium leading-[1.08] sm:text-[44px]">{qr?.kind === "ai" ? qr.headline : story.title}</h1>
          {qr?.kind === "ai" && qr.headline !== story.title && <p className="mt-2 text-[15px] text-muted">Reported as: {story.title}</p>}
          <MetaRow story={story} className="mt-3" />
          <SourcesRow story={story} className="mt-2" />
        </header>

        <ReadingControls storyId={story.id} slug={story.slug} title={story.title} bookmarked={state.bookmarked.has(story.id)} read={state.read.has(story.id)} mode="quick" className="mt-5" />

        {story.imageUrl && (
          <figure className="mt-6 overflow-hidden rounded-3xl">
            <StoryImage story={story} className="aspect-[16/9] w-full" sizes="(min-width: 860px) 860px, 100vw" priority />
            <figcaption className="mt-1.5 text-[11px] text-muted">Image via {story.articles.find((a) => a.imageUrl)?.source.name ?? "publisher"}.</figcaption>
          </figure>
        )}

        <div className="card reading mt-6 p-5 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <AiLabel kind={qr?.kind ?? "extractive"} />
            {ai && qr?.kind !== "ai" && <GenerateQuickRead storyId={story.id} />}
          </div>

          {qr ? (
            <>
              <section className="mt-6">
                <h2 className="eyebrow">The story in 3 points</h2>
                <ol className="mt-3 space-y-3">
                  {qr.points.map((p, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-butter font-mono text-[12px] font-semibold">{i + 1}</span>
                      <p className="leading-relaxed">{p}</p>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="mt-8">
                <h2 className="display text-[22px] font-medium">What actually happened?</h2>
                <p className="mt-2 leading-relaxed text-ink/90">{qr.whatHappened}</p>
              </section>

              {qr.whyCare.length > 0 && (
                <section className="mt-8">
                  <h2 className="display text-[22px] font-medium">Why should I care?</h2>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {qr.whyCare.map((w) => (
                      <Callout key={w.audience} tone={AUDIENCE_TONE[w.audience] ?? "butter"}>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/60">{w.audience}</p>
                        <p className="mt-1 text-[14px] leading-relaxed">{w.text}</p>
                      </Callout>
                    ))}
                  </div>
                </section>
              )}

              <section className="mt-8">
                <h2 className="display text-[22px] font-medium">The bigger picture</h2>
                <p className="mt-2 leading-relaxed text-ink/90">{qr.biggerPicture}</p>
              </section>

              <section className="mt-8 rounded-3xl bg-lavender/55 p-5 dark:bg-lavender/15 sm:p-6">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-8 w-8" />
                  <h2 className="display text-[22px] font-medium">Here&rsquo;s the interesting part 👀</h2>
                </div>
                <p className="mt-3 leading-relaxed">{qr.interestingPart}</p>
                {qr.kind === "ai" && <p className="mt-2 text-[12px] text-ink/60">This is analysis, not reporting. It draws on the sources below and general economic reasoning.</p>}
              </section>

              <section className="mt-8">
                <h2 className="display text-[22px] font-medium">What&rsquo;s next?</h2>
                <p className="mt-2 leading-relaxed text-ink/90">{qr.whatsNext}</p>
              </section>
            </>
          ) : (
            <p className="mt-6 text-muted">This story has not been processed yet. Refresh in a moment.</p>
          )}

          <section className="mt-8 border-t border-line pt-6">
            <h2 className="eyebrow">Based on these sources</h2>
            <ul className="mt-3 space-y-2.5">
              {story.articles.map((a) => (
                <li key={a.id} className="text-[14px]">
                  <a href={a.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-rust">
                    {a.title}
                  </a>
                  <p className="text-[12px] text-muted">
                    {a.source.name} · {a.source.kind === "official" ? "Official source" : "Reporting"} · published {fmtShortDate(a.publishedAt)}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12px] text-muted">Summaries are original. Headlines, descriptions and images belong to the publishers; open the original for the full report.</p>
          </section>
        </div>

        <ReadingControls storyId={story.id} slug={story.slug} title={story.title} bookmarked={state.bookmarked.has(story.id)} read={state.read.has(story.id)} mode="quick" className="mt-6" />

        {related.length > 0 && !user?.preferences.focusMode && (
          <section className="mt-12">
            <div className="flex items-end justify-between">
              <h2 className="display text-[24px] font-medium">Related developments</h2>
              <Link href={`/connect/${story.slug}`} className="text-[13px] font-semibold text-rust hover:underline">
                Explore connections →
              </Link>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {related.slice(0, 4).map((r) => (
                <StoryCard key={r.id} story={r} variant="mini" bookmarked={state.bookmarked.has(r.id)} />
              ))}
            </div>
          </section>
        )}
      </div>
    </Container>
  );
}
