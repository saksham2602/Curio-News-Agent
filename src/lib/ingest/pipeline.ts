import Parser from "rss-parser";
import { randomUUID } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { db, setSetting } from "../db";
import { SOURCES, type SourceDef } from "../sources";
import { classifySubject, classifyRegion, looksLikeOpinion } from "./classify";
import { scoreStory } from "./importance";
import { extractEntities, extractKeywords, jaccard, sharedEntities, tokenize } from "./entities";
import { buildExtractiveQuickRead } from "./extractive";
import { slugify, stripHtml, truncate, wordCount, readingMinutes, safeJson } from "../utils";
import type { Subject, Region } from "../types";
import { enrichQuickReads } from "../ai/quickread";
import { isAiConfigured } from "../ai/client";
import { clearCache, pMap, chunk } from "../cache";

// Pipeline designed for a remote Postgres: few bulk writes, parallel updates, no per-row lookups.

type Cadence = "breaking" | "general" | "analysis" | "all";

interface FeedItem {
  guid: string;
  url: string;
  title: string;
  description: string;
  content: string;
  imageUrl: string | null;
  author: string | null;
  publishedAt: Date;
}

const parser = new Parser({
  timeout: 20000,
  headers: {
    "User-Agent": "Mozilla/5.0 (compatible; TheCuriousBrief/0.1; personal news reader; RSS)",
    Accept: "application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.9, */*;q=0.8",
  },
  customFields: {
    item: [
      ["media:content", "mediaContent", { keepArray: true }],
      ["media:thumbnail", "mediaThumbnail", { keepArray: true }],
      ["content:encoded", "contentEncoded"],
      ["enclosure", "enclosure"],
      ["image", "imageField"],
    ],
  },
});

function pickImage(item: Record<string, unknown>): string | null {
  const fromMedia = (arr: unknown): string | null => {
    if (!Array.isArray(arr)) return null;
    for (const m of arr) {
      const url = (m as { $?: { url?: string } })?.$?.url;
      const medium = (m as { $?: { medium?: string; type?: string } })?.$?.medium ?? (m as { $?: { type?: string } })?.$?.type ?? "";
      if (url && /^https?:/.test(url) && !/video|audio/.test(medium) && !/\.(mp4|mp3|m4a)(\?|$)/i.test(url)) return url;
    }
    return null;
  };
  const enc = item.enclosure as { url?: string; type?: string } | undefined;
  const html = `${item.contentEncoded ?? ""} ${item.content ?? ""}`;
  const imgTag = html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
  const candidates = [
    fromMedia(item.mediaContent),
    fromMedia(item.mediaThumbnail),
    enc?.url && /image/.test(enc.type ?? "") ? enc.url : null,
    typeof item.imageField === "string" ? item.imageField : null,
    imgTag && /^https?:/.test(imgTag) ? imgTag : null,
  ];
  return candidates.find((c): c is string => !!c && !/pixel|1x1|blank|spacer|\.gif(\?|$)/i.test(c)) ?? null;
}

async function fetchFeed(src: SourceDef): Promise<FeedItem[]> {
  const feed = await parser.parseURL(src.feedUrl);
  const items: FeedItem[] = [];
  const seen = new Set<string>();
  const cutoff = Date.now() - 7 * 86_400_000;
  for (const raw of feed.items ?? []) {
    const item = raw as unknown as Record<string, unknown> & Parser.Item;
    const url = (item.link ?? "").toString().trim();
    const title = stripHtml((item.title ?? "").toString()).trim();
    if (!url || !title || !/^https?:/.test(url)) continue;
    // English-language platform: skip items whose title is mostly non-Latin script (e.g. Hindi editions of a feed).
    const letters = title.replace(/[^\p{L}]/gu, "");
    if (letters.length && (letters.match(/[\p{Script=Latin}]/gu)?.length ?? 0) / letters.length < 0.6) continue;
    const guid = ((item.guid as string | undefined) ?? url).toString().trim().slice(0, 400);
    if (seen.has(guid)) continue;
    seen.add(guid);
    const pub = item.isoDate ? new Date(item.isoDate) : item.pubDate ? new Date(item.pubDate) : new Date();
    const publishedAt = Number.isNaN(pub.getTime()) ? new Date() : pub;
    if (publishedAt.getTime() < cutoff) continue;
    if (publishedAt.getTime() > Date.now() + 3_600_000) publishedAt.setTime(Date.now());
    const description = truncate(stripHtml((item.contentSnippet ?? item.summary ?? item.description ?? "") as string), 1200);
    const content = truncate(stripHtml((item.contentEncoded ?? item.content ?? "") as string), 4000);
    items.push({
      guid,
      url: url.slice(0, 1000),
      title: title.slice(0, 300),
      description: description || content.slice(0, 600),
      content,
      imageUrl: pickImage(item),
      author: (item.creator ?? (item as { author?: string }).author ?? null) as string | null,
      publishedAt,
    });
  }
  return items;
}

async function ensureSources() {
  const existing = new Map((await db.source.findMany({ select: { id: true, feedUrl: true, credibility: true, name: true } })).map((s) => [s.id, s]));
  const missing = SOURCES.filter((s) => !existing.has(s.id));
  if (missing.length) {
    await db.source.createMany({ data: missing.map((s) => ({ id: s.id, name: s.name, homepage: s.homepage, feedUrl: s.feedUrl, region: s.region, kind: s.kind, credibility: s.credibility, subjectHint: s.subjectHint ?? null })) });
  }
  // Keep catalogue edits (feed URL, weight, name) in sync with existing rows.
  const changed = SOURCES.filter((s) => { const e = existing.get(s.id); return e && (e.feedUrl !== s.feedUrl || e.credibility !== s.credibility || e.name !== s.name); });
  await pMap(changed, WRITE_CONCURRENCY, (s) => db.source.update({ where: { id: s.id }, data: { feedUrl: s.feedUrl, credibility: s.credibility, name: s.name, homepage: s.homepage, kind: s.kind, region: s.region, subjectHint: s.subjectHint ?? null } }));
}

interface RecentStory {
  id: string;
  title: string;
  tokens: Set<string>;
  keywords: Set<string>;
  latestPublishedAt: Date;
}

async function loadRecentStories(): Promise<RecentStory[]> {
  const since = new Date(Date.now() - 72 * 3_600_000);
  const rows = await db.story.findMany({ where: { latestPublishedAt: { gte: since } }, select: { id: true, title: true, keywordsJson: true, latestPublishedAt: true } });
  return rows.map((r) => ({ id: r.id, title: r.title, tokens: new Set(tokenize(r.title)), keywords: new Set(safeJson<string[]>(r.keywordsJson, [])), latestPublishedAt: r.latestPublishedAt }));
}

function findCluster(item: FeedItem, recent: RecentStory[]): RecentStory | null {
  const tokens = new Set(tokenize(item.title));
  const kw = new Set(extractKeywords(item.title, item.description, 10));
  let best: RecentStory | null = null;
  let bestScore = 0;
  for (const s of recent) {
    if (Math.abs(s.latestPublishedAt.getTime() - item.publishedAt.getTime()) > 60 * 3_600_000) continue;
    const score = Math.max(jaccard(tokens, s.tokens), jaccard(kw, s.keywords) * 0.9);
    if (score > bestScore) {
      bestScore = score;
      best = s;
    }
  }
  return bestScore >= 0.5 ? best : null;
}

export interface IngestSummary {
  sources: number;
  fetched: number;
  newArticles: number;
  newStories: number;
  updatedStories: number;
  errors: { source: string; error: string }[];
  aiEnriched: number;
  durationMs: number;
}

let running = false;
const WRITE_CONCURRENCY = 8;

export async function runIngestion(opts: { cadence?: Cadence; sourceIds?: string[]; enrichLimit?: number } = {}): Promise<IngestSummary> {
  const started = Date.now();
  const cadence = opts.cadence ?? "all";
  const summary: IngestSummary = { sources: 0, fetched: 0, newArticles: 0, newStories: 0, updatedStories: 0, errors: [], aiEnriched: 0, durationMs: 0 };
  if (running) {
    summary.errors.push({ source: "pipeline", error: "already running" });
    return summary;
  }
  running = true;
  const job = await db.jobRun.create({ data: { name: `ingest:${cadence}`, status: "running" } });
  try {
    await ensureSources();
    const sources = SOURCES.filter((s) => (cadence === "all" || s.cadence === cadence) && (!opts.sourceIds || opts.sourceIds.includes(s.id)));
    summary.sources = sources.length;

    const recent = await loadRecentStories();
    const slugs = new Set((await db.story.findMany({ select: { slug: true } })).map((s) => s.slug));
    const touched = new Set<string>();
    const newStories: Prisma.StoryCreateManyInput[] = [];
    const newArticles: Prisma.ArticleCreateManyInput[] = [];
    const sourceStatus: { id: string; ok: boolean; error?: string; count: number }[] = [];

    const uniqueSlug = (title: string) => {
      const base = slugify(title);
      let slug = base;
      while (slugs.has(slug)) slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
      slugs.add(slug);
      return slug;
    };

    // 1. Fetch feeds (network-bound, concurrent) and cluster in memory.
    await pMap(sources, 6, async (src) => {
      try {
        const items = await fetchFeed(src);
        summary.fetched += items.length;
        const existing = new Set((await db.article.findMany({ where: { sourceId: src.id, guid: { in: items.map((i) => i.guid) } }, select: { guid: true } })).map((e) => e.guid));
        for (const item of items) {
          if (existing.has(item.guid)) continue;
          let storyId: string;
          const match = findCluster(item, recent);
          if (match) {
            storyId = match.id;
            if (item.publishedAt > match.latestPublishedAt) match.latestPublishedAt = item.publishedAt;
          } else {
            storyId = randomUUID();
            const text = `${item.title}. ${item.description}`;
            const keywords = extractKeywords(item.title, item.description);
            newStories.push({
              id: storyId,
              slug: uniqueSlug(item.title),
              title: item.title,
              summary: item.description,
              imageUrl: item.imageUrl,
              subject: classifySubject(text, src.subjectHint ?? null),
              region: classifyRegion(text, src.region),
              tier: "discover",
              score: 0,
              scoreReason: "Pending scoring",
              scoreFactors: "[]",
              sourceCount: 1,
              firstPublishedAt: item.publishedAt,
              latestPublishedAt: item.publishedAt,
              keywordsJson: JSON.stringify(keywords),
              entitiesJson: JSON.stringify(extractEntities(item.title, item.description)),
            });
            recent.push({ id: storyId, title: item.title, tokens: new Set(tokenize(item.title)), keywords: new Set(keywords), latestPublishedAt: item.publishedAt });
          }
          touched.add(storyId);
          newArticles.push({ sourceId: src.id, guid: item.guid, url: item.url, title: item.title, description: item.description, content: item.content || null, imageUrl: item.imageUrl, author: item.author, publishedAt: item.publishedAt, storyId });
        }
        sourceStatus.push({ id: src.id, ok: true, count: items.length });
      } catch (e) {
        const msg = (e instanceof Error ? e.message : String(e)).replace(/\s+/g, " ").slice(0, 400);
        summary.errors.push({ source: src.id, error: msg });
        sourceStatus.push({ id: src.id, ok: false, error: msg, count: 0 });
      }
    });

    // 2. Bulk insert stories, then articles (a few round-trips in total).
    for (const part of chunk(newStories, 200)) await db.story.createMany({ data: part });
    for (const part of chunk(newArticles, 200)) await db.article.createMany({ data: part });
    summary.newStories = newStories.length;
    summary.newArticles = newArticles.length;
    await pMap(sourceStatus, WRITE_CONCURRENCY, (s) => db.source.update({ where: { id: s.id }, data: { lastFetchedAt: new Date(), lastStatus: s.ok ? "ok" : "error", lastError: s.error?.slice(0, 500) ?? null, lastItemCount: s.count } }).catch(() => null));

    // 3. Re-derive touched stories from their articles (one read, parallel writes).
    const touchedIds = Array.from(touched);
    summary.updatedStories = Math.max(0, touchedIds.length - newStories.length);
    await rebuildStories(touchedIds);

    // 4. Links for touched stories, then freshness rescore.
    await linkStories(touchedIds);
    await rescoreRecent();

    // 5. Mark the refresh complete before the (slow) AI enrichment so the UI shows it promptly.
    summary.durationMs = Date.now() - started;
    await setSetting("lastRefreshAt", new Date().toISOString());
    await setSetting("lastRefreshSummary", JSON.stringify(summary));
    await db.jobRun.update({ where: { id: job.id }, data: { status: summary.errors.length === sources.length && sources.length > 0 ? "error" : "ok", finishedAt: new Date(), details: JSON.stringify(summary) } });
    clearCache();

    // 6. Optional AI enrichment.
    if (isAiConfigured()) {
      summary.aiEnriched = await enrichQuickReads(opts.enrichLimit ?? 20).catch((e) => {
        summary.errors.push({ source: "ai", error: (e instanceof Error ? e.message : String(e)).slice(0, 300) });
        return 0;
      });
      clearCache();
    }
    summary.durationMs = Date.now() - started;
    return summary;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await db.jobRun.update({ where: { id: job.id }, data: { status: "error", finishedAt: new Date(), details: msg } }).catch(() => {});
    summary.errors.push({ source: "pipeline", error: msg });
    summary.durationMs = Date.now() - started;
    return summary;
  } finally {
    running = false;
  }
}

async function rebuildStories(storyIds: string[]) {
  if (!storyIds.length) return;
  const stories: Prisma.StoryGetPayload<{ include: { articles: { include: { source: true } } } }>[] = [];
  for (const ids of chunk(storyIds, 300)) {
    stories.push(...(await db.story.findMany({ where: { id: { in: ids } }, include: { articles: { include: { source: true }, orderBy: { publishedAt: "desc" } } } })));
  }
  const updates: { id: string; data: Prisma.StoryUpdateInput }[] = [];
  for (const story of stories) {
    const articles = story.articles;
    if (!articles.length) continue;
    const lead = [...articles].sort((a, b) => b.source.credibility - a.source.credibility || b.publishedAt.getTime() - a.publishedAt.getTime())[0];
    const title = lead.title;
    const descriptions = Array.from(new Set(articles.map((a) => a.description ?? "").filter(Boolean)));
    const combined = descriptions.join(" ");
    const longest = articles.map((a) => a.content ?? "").sort((a, b) => b.length - a.length)[0] ?? "";
    const text = `${title}. ${combined} ${longest.slice(0, 1500)}`;
    const sourceIds = new Set(articles.map((a) => a.sourceId));
    const outlets = Array.from(new Set(articles.map((a) => a.source.name)));
    const leadDef = SOURCES.find((s) => s.id === lead.sourceId);
    const subject = classifySubject(text, (leadDef?.subjectHint ?? null) as Subject | null);
    const region: Region = classifyRegion(text, leadDef?.region ?? "international");
    const isOpinion = articles.every((a) => looksLikeOpinion(a.title, a.url));
    const first = articles.reduce((m, a) => (a.publishedAt < m ? a.publishedAt : m), articles[0].publishedAt);
    const latest = articles.reduce((m, a) => (a.publishedAt > m ? a.publishedAt : m), articles[0].publishedAt);
    const scoring = scoreStory({ title, text, subject, region, sourceCount: sourceIds.size, maxCredibility: Math.max(...articles.map((a) => a.source.credibility)), hasOfficialSource: articles.some((a) => a.source.kind === "official"), latestPublishedAt: latest, isOpinion });
    const image = story.imageUrl ?? articles.find((a) => a.imageUrl)?.imageUrl ?? null;
    const words = wordCount(combined) + wordCount(longest);
    const existingQuick = safeJson<{ kind?: string } | null>(story.quickReadJson, null);
    const keepAi = existingQuick?.kind === "ai" && story.title === title;
    const quick = keepAi ? undefined : buildExtractiveQuickRead({ title, summary: combined || longest, subject, region, sourceNames: outlets, tierReason: scoring.reason });
    updates.push({
      id: story.id,
      data: {
        title,
        summary: truncate(combined || longest || title, 900),
        imageUrl: image,
        subject,
        region,
        tier: scoring.tier,
        score: scoring.score,
        scoreReason: scoring.reason,
        scoreFactors: JSON.stringify(scoring.factors),
        sourceCount: sourceIds.size,
        firstPublishedAt: first,
        latestPublishedAt: latest,
        keywordsJson: JSON.stringify(extractKeywords(title, text)),
        entitiesJson: JSON.stringify(extractEntities(title, combined)),
        quickMinutes: 1,
        deepMinutes: Math.min(8, Math.max(4, readingMinutes(words) + 3)),
        ...(quick ? { quickReadJson: JSON.stringify(quick), quickReadKind: "extractive" } : {}),
      },
    });
  }
  await pMap(updates, WRITE_CONCURRENCY, (u) => db.story.update({ where: { id: u.id }, data: u.data }).catch(() => null));
}

async function rescoreRecent() {
  const since = new Date(Date.now() - 4 * 86_400_000);
  const stories = await db.story.findMany({ where: { latestPublishedAt: { gte: since } }, include: { articles: { select: { sourceId: true, title: true, url: true, source: { select: { credibility: true, kind: true } } } } } });
  const updates: { id: string; data: Prisma.StoryUpdateInput }[] = [];
  for (const s of stories) {
    if (!s.articles.length) continue;
    const scoring = scoreStory({
      title: s.title,
      text: `${s.title}. ${s.summary ?? ""}`,
      subject: s.subject as Subject,
      region: s.region as Region,
      sourceCount: new Set(s.articles.map((a) => a.sourceId)).size,
      maxCredibility: Math.max(...s.articles.map((a) => a.source.credibility)),
      hasOfficialSource: s.articles.some((a) => a.source.kind === "official"),
      latestPublishedAt: s.latestPublishedAt,
      isOpinion: s.articles.every((a) => looksLikeOpinion(a.title, a.url)),
    });
    // Only write when it changes what the reader sees.
    if (scoring.tier !== s.tier || Math.abs(scoring.score - s.score) >= 3) {
      updates.push({ id: s.id, data: { score: scoring.score, tier: scoring.tier, scoreReason: scoring.reason, scoreFactors: JSON.stringify(scoring.factors) } });
    }
  }
  await pMap(updates, WRITE_CONCURRENCY, (u) => db.story.update({ where: { id: u.id }, data: u.data }).catch(() => null));
}

export async function linkStories(storyIds: string[]) {
  if (!storyIds.length) return;
  const since = new Date(Date.now() - 7 * 86_400_000);
  const pool = await db.story.findMany({ where: { latestPublishedAt: { gte: since } }, select: { id: true, entitiesJson: true, keywordsJson: true } });
  const byId = new Map(pool.map((p) => [p.id, { id: p.id, entities: safeJson<string[]>(p.entitiesJson, []), keywords: new Set(safeJson<string[]>(p.keywordsJson, [])) }]));
  const touched = new Set(storyIds);

  // Existing AI-classified links are kept; topical ones for touched stories are recomputed.
  const existing = await db.storyLink.findMany({ where: { OR: [{ fromId: { in: storyIds } }, { toId: { in: storyIds } }] }, select: { fromId: true, toId: true, relation: true } });
  const keep = new Set(existing.filter((l) => l.relation !== "topical").map((l) => `${l.fromId}|${l.toId}`));
  await db.storyLink.deleteMany({ where: { relation: "topical", OR: [{ fromId: { in: storyIds } }, { toId: { in: storyIds } }] } });

  const rows = new Map<string, Prisma.StoryLinkCreateManyInput>();
  for (const id of storyIds) {
    const me = byId.get(id);
    if (!me) continue;
    const candidates: { toId: string; shared: string[]; strength: number }[] = [];
    for (const other of byId.values()) {
      if (other.id === id) continue;
      const shared = sharedEntities(me.entities, other.entities);
      if (!shared.length) continue;
      const strength = shared.length + jaccard(me.keywords, other.keywords) * 3;
      if (strength >= 1.6) candidates.push({ toId: other.id, shared, strength: Number(strength.toFixed(2)) });
    }
    candidates.sort((a, b) => b.strength - a.strength);
    for (const c of candidates.slice(0, 8)) {
      for (const [from, to] of [[id, c.toId], [c.toId, id]] as const) {
        const key = `${from}|${to}`;
        if (keep.has(key) || rows.has(key)) continue;
        // Links from an untouched story to a touched one were deleted above too; recreate them.
        if (!touched.has(from) && !touched.has(to)) continue;
        rows.set(key, { fromId: from, toId: to, shared: JSON.stringify(c.shared), strength: c.strength, relation: "topical" });
      }
    }
  }
  for (const part of chunk(Array.from(rows.values()), 300)) await db.storyLink.createMany({ data: part });
}

export async function pruneOld(days = 45) {
  const cutoff = new Date(Date.now() - days * 86_400_000);
  const keep = await db.story.findMany({ where: { latestPublishedAt: { lt: cutoff }, OR: [{ bookmarks: { some: {} } }, { reflections: { some: {} } }, { readingEvents: { some: {} } }] }, select: { id: true } });
  const keepIds = new Set(keep.map((k) => k.id));
  const old = await db.story.findMany({ where: { latestPublishedAt: { lt: cutoff } }, select: { id: true } });
  const ids = old.map((o) => o.id).filter((i) => !keepIds.has(i));
  if (!ids.length) return 0;
  await db.article.deleteMany({ where: { storyId: { in: ids } } });
  await db.story.deleteMany({ where: { id: { in: ids } } });
  clearCache();
  return ids.length;
}
