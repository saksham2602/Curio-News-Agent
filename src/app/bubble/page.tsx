import type { Metadata } from "next";
import { Container, SectionHeader, EmptyState } from "@/components/ui";
import { StoryCard } from "@/components/story/StoryCard";
import { Compass } from "@/components/doodles";
import { currentUser } from "@/lib/auth";
import { getBubble, getUserStoryState } from "@/lib/queries";
import { DEFAULT_PREFERENCES } from "@/lib/types";
import { subjectMeta } from "@/lib/taxonomy";

export const metadata: Metadata = { title: "Beyond My Bubble" };
export const dynamic = "force-dynamic";

export default async function BubblePage() {
  const user = await currentUser();
  const prefs = user?.preferences ?? DEFAULT_PREFERENCES;
  const stories = await getBubble(prefs, 12);
  const state = await getUserStoryState(user?.id ?? null, stories.map((s) => s.id));
  return (
    <Container className="pb-10 pt-8 sm:pt-12">
      <SectionHeader eyebrow={<>Beyond my bubble 🌍</>} title="Widen the window" description="Significant stories across subjects you might not think to look for. Choose interests in Settings to make this sharper." doodle={<Compass className="h-12 w-12" />} size="lg" />
      <div className="mt-8 border-t border-line" />
      {stories.length ? (
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {stories.map((s) => (
            <StoryCard key={s.id} story={s} variant="grid" bookmarked={state.bookmarked.has(s.id)} read={state.read.has(s.id)} bubbleReason={`Worth discovering: ${s.scoreReason.replace(/^[^:]+:\s*/, "").replace(/\.$/, "")}. A window into ${subjectMeta(s.subject).label} beyond the day's headline topics.`} />
          ))}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState doodle={<Compass className="h-14 w-14" />} title="Nothing outside your bubble yet" description="Stories appear here after the first refresh." />
        </div>
      )}
    </Container>
  );
}
