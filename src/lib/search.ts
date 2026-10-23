import { db, ci } from "./db";
import { tokenize } from "./ingest/entities";
import type { Prisma } from "@prisma/client";

// Full-text-ish search over stories (SQLite/Postgres-agnostic): keyword LIKE matching
// with in-memory ranking by title/summary/entity hits and freshness.

export interface SearchHit {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  subject: string;
  region: string;
  tier: string;
  score: number;
  imageUrl: string | null;
  latestPublishedAt: Date;
  sourceName: string;
  url: string;
  sourceCount: number;
  quickMinutes: number;
  deepMinutes: number;
  rank: number;
}

export interface SearchOptions {
  q: string;
  limit?: number;
  subject?: string;
  region?: string;
  tier?: string;
  sourceId?: string;
  days?: number;
  excludeId?: string;
  maxMinutes?: number;
}

export async function searchStories(opts: SearchOptions): Promise<SearchHit[]> {
  const terms = Array.from(new Set(tokenize(opts.q))).slice(0, 8);
  if (!terms.length) return [];
  const where: Prisma.StoryWhereInput = {
    AND: [
      { OR: terms.map((t) => ({ OR: [{ title: { contains: t, ...ci } }, { summary: { contains: t, ...ci } }, { entitiesJson: { contains: t, ...ci } }] })) },
      opts.subject ? { subject: opts.subject } : {},
      opts.region ? { region: opts.region } : {},
      opts.tier ? { tier: opts.tier } : {},
      opts.sourceId ? { articles: { some: { sourceId: opts.sourceId } } } : {},
      opts.days ? { latestPublishedAt: { gte: new Date(Date.now() - opts.days * 86_400_000) } } : {},
      opts.excludeId ? { id: { not: opts.excludeId } } : {},
      opts.maxMinutes ? { deepMinutes: { lte: opts.maxMinutes } } : {},
    ],
  };
  const rows = await db.story.findMany({
    where,
    take: 200,
    orderBy: { latestPublishedAt: "desc" },
    include: { articles: { include: { source: true }, orderBy: { publishedAt: "desc" }, take: 1 } },
  });
  const now = Date.now();
  const hits: SearchHit[] = rows.map((r) => {
    const title = r.title.toLowerCase();
    const summary = (r.summary ?? "").toLowerCase();
    let rank = 0;
    for (const t of terms) {
      if (title.includes(t)) rank += 4;
      if (summary.includes(t)) rank += 1.5;
    }
    const phrase = opts.q.toLowerCase().trim();
    if (phrase.length > 3 && title.includes(phrase)) rank += 6;
    const ageDays = (now - r.latestPublishedAt.getTime()) / 86_400_000;
    rank += Math.max(0, 3 - ageDays * 0.5);
    rank += r.score / 50;
    return {
      id: r.id, slug: r.slug, title: r.title, summary: r.summary, subject: r.subject, region: r.region, tier: r.tier, score: r.score, imageUrl: r.imageUrl,
      latestPublishedAt: r.latestPublishedAt, sourceName: r.articles[0]?.source.name ?? "", url: r.articles[0]?.url ?? "", sourceCount: r.sourceCount,
      quickMinutes: r.quickMinutes, deepMinutes: r.deepMinutes, rank,
    };
  });
  hits.sort((a, b) => b.rank - a.rank);
  return hits.slice(0, opts.limit ?? 30);
}
