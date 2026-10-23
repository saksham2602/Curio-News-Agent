import { Container } from "@/components/ui";
import { Hero } from "@/components/home/Hero";
import { BigPicture, BySubject, Bubble, Spotlight, ConnectPreview, PulsePreview, ContinueExploring } from "@/components/home/Sections";
import { WelcomeBanner } from "@/components/home/WelcomeBanner";
import { currentUser } from "@/lib/auth";
import { DEFAULT_PREFERENCES, type Budget } from "@/lib/types";
import { getBigPicture, getBySubject, getBubble, getDeepDiveSpotlight, getUnexpected, getMostConnected, getIndicators, getBrief, getContinueReading, getUserStoryState, lastRefresh, storyCount } from "@/lib/queries";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage({ searchParams }: { searchParams: Promise<{ budget?: string; welcome?: string }> }) {
  const sp = await searchParams;
  const user = await currentUser();
  const prefs = user?.preferences ?? DEFAULT_PREFERENCES;
  const budget = (sp.budget !== undefined && [0, 5, 10, 20].includes(Number(sp.budget)) ? Number(sp.budget) : prefs.budget) as Budget;

  const [refresh, count, big] = await Promise.all([lastRefresh(), storyCount(), getBigPicture(5, prefs)]);
  const bigIds = big.map((s) => s.id);
  const [groups, bubble, deep, unexpected, connected, indicators, brief, cont, total48] = await Promise.all([
    getBySubject(3, bigIds, prefs),
    getBubble(prefs, 4, bigIds),
    getDeepDiveSpotlight(bigIds),
    getUnexpected(bigIds),
    getMostConnected(1),
    getIndicators(),
    getBrief(prefs, budget),
    user ? getContinueReading(user.id, 4) : Promise.resolve([]),
    db.story.count({ where: { latestPublishedAt: { gte: new Date(Date.now() - 48 * 3_600_000) }, tier: { in: ["must-know", "worth-understanding"] } } }),
  ]);
  const allIds = [...bigIds, ...groups.flatMap((g) => g.stories.map((s) => s.id)), ...bubble.map((s) => s.id), deep?.id, unexpected?.id].filter((x): x is string => !!x);
  const state = await getUserStoryState(user?.id ?? null, allIds);

  return (
    <Container className="pb-10 pt-6 sm:pt-8">
      {sp.welcome && <WelcomeBanner />}
      <Hero refreshedAt={refresh.at} storyCount={count} brief={brief.items} budget={budget} name={user && !user.isGuest ? user.name : null} />
      <BigPicture stories={big} state={state} total={total48} />
      <BySubject groups={groups} state={state} />
      <Bubble stories={bubble} state={state} />
      <Spotlight deep={deep} unexpected={unexpected} state={state} />
      <ConnectPreview story={connected[0] ? { id: connected[0].id, slug: connected[0].slug, title: connected[0].title, tier: connected[0].tier, linksFrom: connected[0].linksFrom as never } : null} />
      <PulsePreview indicators={indicators} />
      <ContinueExploring isGuest={!user || user.isGuest} items={cont.map((c) => ({ story: c.story, mode: c.mode, progress: c.progress }))} />
    </Container>
  );
}
