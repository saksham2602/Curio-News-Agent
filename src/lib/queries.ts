import { db, getSetting } from "./db";
import { cached, TTL } from "./cache";
import { HOME_SUBJECT_ORDER, SUBJECT_IDS } from "./taxonomy";
import type { Subject, Preferences, Budget } from "./types";
import type { Prisma } from "@prisma/client";

export const storyCardInclude = {
  articles: { include: { source: { select: { id: true, name: true, kind: true, credibility: true } } }, orderBy: { publishedAt: "desc" as const } },
} satisfies Prisma.StoryInclude;

export type StoryCardData = Prisma.StoryGetPayload<{ include: typeof storyCardInclude }>;

const recentWindow = (hours: number) => new Date(Date.now() - hours * 3_600_000);

export async function lastRefresh() {
  return cached("lastRefresh", TTL.short, async () => {
    const [at, summary] = await Promise.all([getSetting("lastRefreshAt"), getSetting("lastRefreshSummary")]);
    return { at: at ? new Date(at) : null, summary };
  });
}

export async function storyCount() {
  return cached("storyCount", TTL.medium, () => db.story.count());
}

// "The five most consequential developments" — top by score, max 2 per subject, last 48h.
export async function getBigPicture(limit = 5, prefs?: Preferences): Promise<StoryCardData[]> {
  return cached(`bigPicture:${limit}:${prefKey(prefs)}`, TTL.medium, () => computeBigPicture(limit, prefs));
}

function prefKey(prefs?: Preferences) {
  return prefs ? `${prefs.subjects.join(",")}|${prefs.geography}|${prefs.tracked.join(",")}` : "";
}

async function computeBigPicture(limit: number, prefs?: Preferences): Promise<StoryCardData[]> {
  const rows = await db.story.findMany({ where: { latestPublishedAt: { gte: recentWindow(48) } }, orderBy: [{ score: "desc" }, { latestPublishedAt: "desc" }], take: 60, include: storyCardInclude });
  const out: StoryCardData[] = [];
  const perSubject = new Map<string, number>();
  const seen = new Set<string>();
  const boosted = [...rows].sort((a, b) => adjust(b, prefs) - adjust(a, prefs));
  for (const r of boosted) {
    const n = perSubject.get(r.subject) ?? 0;
    if (n >= 2 || seen.has(normTitle(r.title))) continue;
    perSubject.set(r.subject, n + 1);
    seen.add(normTitle(r.title));
    out.push(r);
    if (out.length >= limit) break;
  }
  return out;
}

function normTitle(t: string) {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 60);
}

// Mild personalisation boost: preferred subjects and tracked terms. Never hides anything.
function adjust(s: { score: number; subject: string; title: string; region: string }, prefs?: Preferences): number {
  if (!prefs) return s.score;
  let v = s.score;
  if (prefs.subjects.includes(s.subject as Subject)) v += 4;
  if (prefs.geography === "india" && s.region === "india") v += 4;
  if (prefs.geography === "global" && s.region === "international") v += 4;
  const t = s.title.toLowerCase();
  for (const term of prefs.tracked) if (term && t.includes(term.toLowerCase())) v += 8;
  return v;
}

export async function getBySubject(perSubject = 3, excludeIds: string[] = [], prefs?: Preferences): Promise<{ subject: Subject; stories: StoryCardData[] }[]> {
  return cached(`bySubject:${perSubject}:${excludeIds.join(",")}:${prefKey(prefs)}`, TTL.medium, () => computeBySubject(perSubject, excludeIds, prefs));
}

async function computeBySubject(perSubject: number, excludeIds: string[], prefs?: Preferences): Promise<{ subject: Subject; stories: StoryCardData[] }[]> {
  const rows = await db.story.findMany({ where: { latestPublishedAt: { gte: recentWindow(48) }, id: { notIn: excludeIds } }, orderBy: [{ score: "desc" }, { latestPublishedAt: "desc" }], take: 400, include: storyCardInclude });
  const groups = new Map<Subject, StoryCardData[]>();
  for (const r of rows) {
    const list = groups.get(r.subject as Subject) ?? [];
    if (list.length < perSubject) {
      list.push(r);
      groups.set(r.subject as Subject, list);
    }
  }
  const order = prefs ? [...HOME_SUBJECT_ORDER].sort((a, b) => Number(prefs.subjects.includes(b)) - Number(prefs.subjects.includes(a))) : HOME_SUBJECT_ORDER;
  return order.filter((s) => groups.has(s)).map((subject) => ({ subject, stories: groups.get(subject)! }));
}

// Beyond My Bubble: significant stories in subjects the reader doesn't usually follow.
export async function getBubble(prefs: Preferences, limit = 8, excludeIds: string[] = []): Promise<StoryCardData[]> {
  return cached(`bubble:${limit}:${excludeIds.join(",")}:${prefKey(prefs)}`, TTL.medium, () => computeBubble(prefs, limit, excludeIds));
}

async function computeBubble(prefs: Preferences, limit: number, excludeIds: string[]): Promise<StoryCardData[]> {
  const outside = SUBJECT_IDS.filter((s) => !prefs.subjects.includes(s));
  const subjects = outside.length ? outside : SUBJECT_IDS;
  const rows = await db.story.findMany({ where: { latestPublishedAt: { gte: recentWindow(72) }, subject: { in: subjects }, id: { notIn: excludeIds }, score: { gte: 30 } }, orderBy: [{ score: "desc" }], take: 80, include: storyCardInclude });
  // One per subject first, then fill.
  const out: StoryCardData[] = [];
  const used = new Set<string>();
  for (const r of rows) if (!used.has(r.subject)) { used.add(r.subject); out.push(r); if (out.length >= limit) break; }
  for (const r of rows) if (out.length < limit && !out.includes(r)) out.push(r);
  // If preferences cover everything, fall back to "discover" tier of any subject.
  if (!outside.length) return rows.filter((r) => r.tier === "discover").slice(0, limit);
  return out;
}

export async function getStoryBySlug(slug: string) {
  return db.story.findUnique({
    where: { slug },
    include: {
      ...storyCardInclude,
      linksFrom: { include: { to: { include: storyCardInclude } }, orderBy: { strength: "desc" }, take: 8 },
    },
  });
}

export async function getDeepDiveSpotlight(excludeIds: string[] = []): Promise<StoryCardData | null> {
  return cached(`spotlight:${excludeIds.join(",")}`, TTL.medium, async () => {
  const withAi = await db.story.findFirst({ where: { deepDiveKind: "ai", latestPublishedAt: { gte: recentWindow(72) }, id: { notIn: excludeIds } }, orderBy: { score: "desc" }, include: storyCardInclude });
  if (withAi) return withAi;
  return db.story.findFirst({ where: { latestPublishedAt: { gte: recentWindow(72) }, id: { notIn: excludeIds }, sourceCount: { gte: 2 } }, orderBy: [{ sourceCount: "desc" }, { score: "desc" }], include: storyCardInclude });
  });
}

export async function getUnexpected(excludeIds: string[] = []): Promise<StoryCardData | null> {
  return cached(`unexpected:${excludeIds.join(",")}`, TTL.medium, () => db.story.findFirst({ where: { latestPublishedAt: { gte: recentWindow(72) }, subject: { in: ["science", "health", "environment", "technology"] }, id: { notIn: excludeIds }, score: { gte: 30 } }, orderBy: [{ sourceCount: "desc" }, { score: "desc" }], include: storyCardInclude }));
}

export async function getMostConnected(limit = 1) {
  return cached(`mostConnected:${limit}`, TTL.medium, () => computeMostConnected(limit));
}

async function computeMostConnected(limit: number) {
  const grouped = await db.storyLink.groupBy({ by: ["fromId"], _count: { toId: true }, orderBy: { _count: { toId: "desc" } }, take: 40 });
  if (!grouped.length) return [];
  const ids = grouped.map((g) => g.fromId);
  const stories = await db.story.findMany({ where: { id: { in: ids }, latestPublishedAt: { gte: recentWindow(72) } }, include: { linksFrom: { include: { to: { select: { id: true, slug: true, title: true, subject: true } } }, orderBy: { strength: "desc" }, take: 6 } } });
  stories.sort((a, b) => b.score + b.linksFrom.length * 3 - (a.score + a.linksFrom.length * 3));
  return stories.slice(0, limit);
}

export async function getConnectCandidates(limit = 30) {
  return cached(`connectCandidates:${limit}`, TTL.medium, () => db.story.findMany({ where: { latestPublishedAt: { gte: recentWindow(96) }, linksFrom: { some: {} } }, orderBy: [{ score: "desc" }], take: limit, select: { id: true, slug: true, title: true, subject: true, tier: true, _count: { select: { linksFrom: true } } } }));
}

export async function getIndicators(region?: "india" | "global") {
  return cached(`indicators:${region ?? "all"}`, TTL.medium, () => db.indicator.findMany({ where: region ? { region } : undefined, orderBy: { order: "asc" } }));
}

// Daily brief: a calm, budget-sized queue. Must Know first; then a deliberate mix.
export interface BriefItem {
  story: StoryCardData;
  mode: "quick" | "deep";
  minutes: number;
  reason: string;
}

export async function getBrief(prefs: Preferences, budget: Budget): Promise<{ items: BriefItem[]; totalMinutes: number }> {
  return cached(`brief:${budget}:${prefKey(prefs)}`, TTL.medium, () => computeBrief(prefs, budget));
}

async function computeBrief(prefs: Preferences, budget: Budget): Promise<{ items: BriefItem[]; totalMinutes: number }> {
  const targetCount = budget === 5 ? 4 : budget === 10 ? 6 : budget === 20 ? 10 : 15;
  const deepSlots = budget === 5 ? 0 : budget === 10 ? 2 : budget === 20 ? 4 : 6;
  const pool = await db.story.findMany({ where: { latestPublishedAt: { gte: recentWindow(36) } }, orderBy: [{ score: "desc" }], take: 150, include: storyCardInclude });
  const ranked = [...pool].sort((a, b) => adjust(b, prefs) - adjust(a, prefs));
  const items: BriefItem[] = [];
  const used = new Set<string>();
  const seenTitles = new Set<string>();
  const take = (pred: (s: StoryCardData) => boolean, reason: string, n = 1) => {
    let c = 0;
    for (const s of ranked) {
      if (c >= n) break;
      if (used.has(s.id) || seenTitles.has(normTitle(s.title)) || !pred(s)) continue;
      used.add(s.id);
      seenTitles.add(normTitle(s.title));
      items.push({ story: s, mode: "quick", minutes: s.quickMinutes, reason });
      c++;
    }
  };
  take((s) => s.tier === "must-know", "Must Know", Math.min(3, targetCount));
  take((s) => s.region === "india" && (s.subject === "economy" || s.subject === "markets"), "India's economy");
  take((s) => s.subject === "business" && s.region !== "india", "Global business");
  take((s) => s.subject === "geopolitics", "Geopolitics");
  take((s) => s.subject === "marketing" || s.subject === "technology", "Consumer & tech");
  take((s) => !prefs.subjects.includes(s.subject as Subject), "Outside your bubble");
  take(() => true, "Worth your time", Math.max(0, targetCount - items.length));
  // Promote the top stories with the most sources to deep mode within the budget.
  const deepCandidates = [...items].sort((a, b) => b.story.sourceCount - a.story.sourceCount || b.story.score - a.story.score).slice(0, deepSlots);
  for (const d of deepCandidates) {
    d.mode = "deep";
    d.minutes = d.story.deepMinutes;
  }
  // Stable order: Must Know first, then as picked.
  items.sort((a, b) => Number(b.story.tier === "must-know") - Number(a.story.tier === "must-know"));
  return { items, totalMinutes: items.reduce((n, i) => n + i.minutes, 0) };
}

export async function getContinueReading(userId: string, limit = 4) {
  return db.readingEvent.findMany({ where: { userId, completed: false, progress: { gt: 0.05 } }, orderBy: { updatedAt: "desc" }, take: limit, include: { story: { include: storyCardInclude } } });
}

export async function getUserStoryState(userId: string | null, storyIds: string[]) {
  if (!userId || !storyIds.length) return { bookmarked: new Set<string>(), read: new Set<string>() };
  const [bm, ev] = await Promise.all([
    db.bookmark.findMany({ where: { userId, storyId: { in: storyIds } }, select: { storyId: true } }),
    db.readingEvent.findMany({ where: { userId, storyId: { in: storyIds }, completed: true }, select: { storyId: true } }),
  ]);
  return { bookmarked: new Set(bm.map((b) => b.storyId)), read: new Set(ev.map((e) => e.storyId)) };
}

export interface NewsFilters {
  subject?: string;
  region?: string;
  tier?: string;
  sourceId?: string;
  days?: number;
  sort?: "importance" | "latest" | "sources";
  page?: number;
  pageSize?: number;
  saved?: boolean;
  userId?: string;
}

export async function getAllNews(f: NewsFilters) {
  if (f.saved) return computeAllNews(f);
  return cached(`news:${JSON.stringify(f)}`, TTL.short, () => computeAllNews(f));
}

async function computeAllNews(f: NewsFilters) {
  const page = Math.max(1, f.page ?? 1);
  const pageSize = f.pageSize ?? 24;
  const where: Prisma.StoryWhereInput = {
    latestPublishedAt: { gte: recentWindow((f.days ?? 3) * 24) },
    ...(f.subject ? { subject: f.subject } : {}),
    ...(f.region ? { region: f.region } : {}),
    ...(f.tier ? { tier: f.tier } : {}),
    ...(f.sourceId ? { articles: { some: { sourceId: f.sourceId } } } : {}),
    ...(f.saved && f.userId ? { bookmarks: { some: { userId: f.userId } } } : {}),
  };
  const orderBy: Prisma.StoryOrderByWithRelationInput[] = f.sort === "latest" ? [{ latestPublishedAt: "desc" }] : f.sort === "sources" ? [{ sourceCount: "desc" }, { score: "desc" }] : [{ score: "desc" }, { latestPublishedAt: "desc" }];
  const [total, rows] = await Promise.all([db.story.count({ where }), db.story.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize, include: storyCardInclude })]);
  return { total, rows, page, pageSize };
}

export async function getSourcesHealth() {
  const sources = await db.source.findMany({ orderBy: [{ region: "asc" }, { name: "asc" }] });
  const counts = await db.article.groupBy({ by: ["sourceId"], _count: { id: true }, where: { publishedAt: { gte: recentWindow(72) } } });
  const map = new Map(counts.map((c) => [c.sourceId, c._count.id]));
  return sources.map((s) => ({ ...s, recentArticles: map.get(s.id) ?? 0 }));
}
