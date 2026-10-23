import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Container, SubjectTag, TierBadge, Skeleton } from "@/components/ui";
import { SourcesRow, MetaRow } from "@/components/story/StoryCard";
import { ReadingControls } from "@/components/story/ReadingControls";
import { ReadingTracker } from "@/components/story/ReadingTracker";
import { DeepDiveBody } from "@/components/story/DeepDiveBody";
import { HighlightToolbar } from "@/components/story/HighlightToolbar";
import { Books } from "@/components/doodles";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserStoryState } from "@/lib/queries";
import { isAiConfigured } from "@/lib/ai/client";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = await db.story.findUnique({ where: { slug }, select: { title: true } });
  return { title: s ? `Deep dive: ${s.title}` : "Deep dive" };
}

export default async function DeepDivePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [story, user] = await Promise.all([db.story.findUnique({ where: { slug }, include: { articles: { include: { source: true }, orderBy: { publishedAt: "desc" } } } }), currentUser()]);
  if (!story) notFound();
  const state = await getUserStoryState(user?.id ?? null, [story.id]);
  const ev = user ? await db.readingEvent.findUnique({ where: { userId_storyId_mode: { userId: user.id, storyId: story.id, mode: "deep" } } }) : null;
  const needsGeneration = story.deepDiveKind !== "ai" && isAiConfigured();

  return (
    <Container className="pb-10 pt-6 sm:pt-10">
      <div data-story-id={story.id} data-story-title={story.title} className="mx-auto max-w-[1000px]">
        <ReadingTracker storyId={story.id} mode="deep" initialProgress={ev?.progress ?? 0} />
        <HighlightToolbar storyId={story.id} />
        <nav className="text-[12px] text-muted" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-rust">Today</Link> <span className="mx-1">/</span> <Link href={`/story/${story.slug}`} className="hover:text-rust">Quick read</Link> <span className="mx-1">/</span> Deep dive 🧠
        </nav>
        <header className="mt-4 flex items-start gap-4">
          <Books className="hidden h-14 w-14 shrink-0 sm:block" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <SubjectTag subject={story.subject} />
              <TierBadge tier={story.tier} />
              <span className="text-[12px] text-muted">Deep dive · about {story.deepMinutes} min</span>
            </div>
            <h1 className="display mt-3 text-balance text-[32px] font-medium leading-[1.08] sm:text-[44px]">{story.title}</h1>
            <MetaRow story={story} className="mt-3" />
            <SourcesRow story={story} className="mt-2" />
          </div>
        </header>
        <ReadingControls storyId={story.id} slug={story.slug} title={story.title} bookmarked={state.bookmarked.has(story.id)} read={state.read.has(story.id)} mode="deep" className="mt-5" />

        <Suspense fallback={<DeepDiveSkeleton sources={story.articles.length} generating={needsGeneration} />}>
          <DeepDiveBody storyId={story.id} slug={story.slug} userId={user?.id ?? null} />
        </Suspense>

        <ReadingControls storyId={story.id} slug={story.slug} title={story.title} bookmarked={state.bookmarked.has(story.id)} read={state.read.has(story.id)} mode="deep" className="mt-8" />
      </div>
    </Container>
  );
}

function DeepDiveSkeleton({ sources, generating }: { sources: number; generating: boolean }) {
  return (
    <div className="card mt-6 p-5 sm:p-8" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-3">
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#B9A8E8] opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-[#8E7CC9]" />
        </span>
        <p className="text-[14px] text-muted">{generating ? `Curio is reading ${sources} ${sources === 1 ? "source" : "sources"} and writing the deep dive — this takes one to two minutes. The page fills in automatically.` : "Loading the deep dive…"}</p>
      </div>
      <div className="mt-6 space-y-3">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="mt-6 h-5 w-1/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-10/12" />
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    </div>
  );
}
