import Parser from "rss-parser";
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
      const url = (m as { $?: { url?: string; medium?: string; type?: string } })?.$?.url;
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
  const cutoff = Date.now() - 7 * 86_400_000;
  for (const raw of feed.items ?? []) {
    const item = raw as unknown as Record<string, unknown> & Parser.Item;
    const url = (item.link ?? "").toString().trim();
    const title = stripHtml((item.title ?? "").toString()).trim();
    if (!url || !title || !/^https?:/.test(url)) continue;
    const guid = ((item.guid as string | undefined) ?? url).toString().trim();
    const pub = item.isoDate ? new Date(item.isoDate) : item.pubDate ? new Date(item.pubDate) : new Date();
    const publishedAt = Number.isNaN(pub.getTime()) ? new Date() : pub;
    if (publishedAt.getTime() < cutoff) continue;
    if (publishedAt.getTime() > Date.now() + 3_600_000) publishedAt.setTime(Date.now());
    const description = truncate(stripHtml((item.contentSnippet ?? item.summary ?? item.description ?? "") as string), 1200);
    const content = truncate(stripHtml((item.contentEncoded ?? item.content ?? "") as string), 4000);
    items.push({
      guid: guid.slice(0, 400),
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
  for (const s of SOURCES) {
    await db.source.upsert({
      where: { id: s.id },
      update: { name: s.name, homepage: s.homepage, feedUrl: s.feedUrl, region: s.region, kind: s.kind, credibility: s.credibility, subjectHint: s.subjectHint ?? null },
      create: { id: s.id, name: s.name, homepage: s.homepage, feedUrl: s.feedUrl, region: s.region, kind: s.kind, credibility: s.credibility, subjectHint: s.subjectHint ?? null },
    });
  }
}

async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title);
  let slug = base;
  for (let i = 0; i < 20; i++) {
    const exists = await db.story.findUnique({ where: { slug }, select: { id: true } });
    if (!exists) return slug;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

interface RecentStory {
  id: string;
  title: string;
  tokens: Set<string>;
  keywords: Set<string>;
  latestPublishedAt: Date;
}

function titleSimilarity(a: Set<string>, b: Set<string>) {
  return jaccard(a, b);
}

async function loadRecentStories(): Promise<RecentStory[]> {
  const since = new Date(Date.now() - 72 * 3_600_000);
  const rows = await db.story.findMany({
    where: { latestPublishedAt: { gte: since } },
    select: { id: true, title: true, keywordsJson: true, latestPublishedAt: true },
  });
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    tokens: new Set(tokenize(r.title)),
    keywords: new Set(safeJson<string[]>(r.keywordsJson, [])),
    latestPublishedAt: r.latestPublishedAt,
  }));
}

function findCluster(item: FeedItem, recent: RecentStory[]): RecentStory | null {
  const tokens = new Set(tokenize(item.title));
  const kw = new Set(extractKeywords(item.title, item.description, 10));
  let best: RecentStory | null = null;
  let bestScore = 0;
  for (const s of recent) {
    if (Math.abs(s.latestPublishedAt.getTime() - item.publishedAt.getTime()) > 60 * 3_600_000) continue;
    const sim = titleSimilarity(tokens, s.tokens);
    const kwSim = jaccard(kw, s.keywords);
    const score = Math.max(sim, kwSim * 0.9);
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

export async function runIngestion(opts: { cadence?: Cadence; sourceIds?: string[]; enrichLimit?: number } = {}): Promise<IngestSummary> {
  const started = Date.now();
  const cadence = opts.cadence ?? "all";
  if (running) {
    return { sources: 0, fetched: 0, newArticles: 0, newStories: 0, updatedStories: 0, errors: [{ source: "pipeline", error: "already running" }], aiEnriched: 0, durationMs: 0 };
  }
  running = true;
  const job = await db.jobRun.create({ data: { name: `ingest:${cadence}`, status: "running" } });
  const summary: IngestSummary = { sources: 0, fetched: 0, newArticles: 0, newStories: 0, updatedStories: 0, errors: [], aiEnriched: 0, durationMs: 0 };
  try {
    await ensureSources();
    const sources = SOURCES.filter((s) => (cadence === "all" || s.cadence === cadence) && (!opts.sourceIds || opts.sourceIds.includes(s.id)));
    summary.sources = sources.length;

    const touched = new Set<string>();
    const recent = await loadRecentStories();

    // Fetch feeds with limited concurrency.
    const queue = [...sources];
    const workers = Array.from({ length: 6 }, async () => {
      while (queue.length) {
        const src = queue.shift()!;
        try {
          const items = await fetchFeed(src);
          summary.fetched += items.length;
          const existing = await db.article.findMany({ where: { sourceId: src.id, guid: { in: items.map((i) => i.guid) } }, select: { guid: true } });
          const seen = new Set(existing.map((e) => e.guid));
          const fresh = items.filter((i) => !seen.has(i.guid));
          let itemErrors = 0;
          for (const item of fresh) {
            try {
              const storyId = await attachToStory(item, src, recent, touched);
              await db.article.create({
                data: {
                  sourceId: src.id,
                  guid: item.guid,
                  url: item.url,
                  title: item.title,
                  description: item.description,
                  content: item.content || null,
                  imageUrl: item.imageUrl,
                  author: item.author,
                  publishedAt: item.publishedAt,
                  storyId,
                },
              });
              summary.newArticles++;
            } catch (e) {
              itemErrors++;
              if (itemErrors <= 2) summary.errors.push({ source: src.id, error: `item "${item.title.slice(0, 60)}": ${(e instanceof Error ? e.message : String(e)).replace(/\s+/g, " ").slice(0, 400)}` });
            }
          }
          await db.source.update({ where: { id: src.id }, data: { lastFetchedAt: new Date(), lastStatus: "ok", lastError: null, lastItemCount: items.length } });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          summary.errors.push({ source: src.id, error: msg.slice(0, 300) });
          await db.source.update({ where: { id: src.id }, data: { lastFetchedAt: new Date(), lastStatus: "error", lastError: msg.slice(0, 500) } }).catch(() => {});
        }
      }
    });
    await Promise.all(workers);

    // Re-derive every touched story from its articles.
    for (const storyId of touched) {
      const created = await rebuildStory(storyId);
      if (created === "new") summary.newStories++;
      else summary.updatedStories++;
    }

    // Build links for touched stories.
    await linkStories(Array.from(touched));

    // Freshness decay: rescore everything from the last 4 days.
    await rescoreRecent();

    // Optional AI enrichment.
    if (isAiConfigured()) {
      summary.aiEnriched = await enrichQuickReads(opts.enrichLimit ?? 20).catch((e) => {
        summary.errors.push({ source: "ai", error: (e instanceof Error ? e.message : String(e)).slice(0, 300) });
        return 0;
      });
    }

    await setSetting("lastRefreshAt", new Date().toISOString());
    await setSetting("lastRefreshSummary", JSON.stringify({ ...summary, durationMs: Date.now() - started }));
    summary.durationMs = Date.now() - started;
    await db.jobRun.update({ where: { id: job.id }, data: { status: summary.errors.length === sources.length && sources.length > 0 ? "error" : "ok", finishedAt: new Date(), details: JSON.stringify(summary) } });
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

async function attachToStory(item: FeedItem, src: SourceDef, recent: RecentStory[], touched: Set<string>): Promise<string> {
  const match = findCluster(item, recent);
  if (match) {
    touched.add(match.id);
    if (item.publishedAt > match.latestPublishedAt) match.latestPublishedAt = item.publishedAt;
    return match.id;
  }
  const text = `${item.title}. ${item.description}`;
  const subject = classifySubject(text, src.subjectHint ?? null);
  const region = classifyRegion(text, src.region);
  const data = {
      title: item.title,
      summary: item.description,
      imageUrl: item.imageUrl,
      subject,
      region,
      tier: "discover",
      score: 0,
      scoreReason: "Pending scoring",
      scoreFactors: "[]",
      sourceCount: 1,
      firstPublishedAt: item.publishedAt,
      latestPublishedAt: item.publishedAt,
      keywordsJson: JSON.stringify(extractKeywords(item.title, item.description)),
      entitiesJson: JSON.stringify(extractEntities(item.title, item.description)),
  };
  let story: { id: string; title: string; keywordsJson: string | null } | null = null;
  for (let attempt = 0; attempt < 4 && !story; attempt++) {
    const slug = attempt === 0 ? await uniqueSlug(item.title) : `${slugify(item.title)}-${Math.random().toString(36).slice(2, 7)}`;
    try {
      story = await db.story.create({ data: { slug, ...data }, select: { id: true, title: true, keywordsJson: true } });
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code !== "P2002") throw e;
    }
  }
  if (!story) throw new Error("could not allocate a unique slug");
  recent.push({ id: story.id, title: story.title, tokens: new Set(tokenize(story.title)), keywords: new Set(safeJson<string[]>(story.keywordsJson, [])), latestPublishedAt: item.publishedAt });
  touched.add(story.id);
  return story.id;
}

async function rebuildStory(storyId: string): Promise<"new" | "updated"> {
  const story = await db.story.findUnique({
    where: { id: storyId },
    include: { articles: { include: { source: true }, orderBy: { publishedAt: "desc" } } },
  });
  if (!story || story.articles.length === 0) return "updated";
  const articles = story.articles;
  const isNew = story.score === 0 && story.scoreReason === "Pending scoring";

  // Prefer the most credible source's title; keep the earliest publication as event date.
  const lead = [...articles].sort((a, b) => b.source.credibility - a.source.credibility || b.publishedAt.getTime() - a.publishedAt.getTime())[0];
  const title = lead.title;
  const descriptions = Array.from(new Set(articles.map((a) => a.description ?? "").filter(Boolean)));
  const combined = descriptions.join(" ");
  const longest = articles.map((a) => a.content ?? "").sort((a, b) => b.length - a.length)[0] ?? "";
  const text = `${title}. ${combined} ${longest.slice(0, 1500)}`;
  const sourceIds = new Set(articles.map((a) => a.sourceId));
  const outlets = Array.from(new Set(articles.map((a) => a.source.name)));
  const hint = (SOURCES.find((s) => s.id === lead.sourceId)?.subjectHint ?? null) as Subject | null;
  const subject = classifySubject(text, hint);
  const region: Region = classifyRegion(text, SOURCES.find((s) => s.id === lead.sourceId)?.region ?? "international");
  const isOpinion = articles.every((a) => looksLikeOpinion(a.title, a.url));
  const first = articles.reduce((m, a) => (a.publishedAt < m ? a.publishedAt : m), articles[0].publishedAt);
  const latest = articles.reduce((m, a) => (a.publishedAt > m ? a.publishedAt : m), articles[0].publishedAt);
  const scoring = scoreStory({
    title,
    text,
    subject,
    region,
    sourceCount: sourceIds.size,
    maxCredibility: Math.max(...articles.map((a) => a.source.credibility)),
    hasOfficialSource: articles.some((a) => a.source.kind === "official"),
    latestPublishedAt: latest,
    isOpinion,
  });
  const image = story.imageUrl ?? articles.find((a) => a.imageUrl)?.imageUrl ?? null;
  const words = wordCount(combined) + wordCount(longest);
  const quickMinutes = 1;
  const deepMinutes = Math.min(8, Math.max(4, readingMinutes(words) + 3));
  const existingQuick = safeJson<{ kind?: string } | null>(story.quickReadJson, null);
  const keepAi = existingQuick?.kind === "ai" && story.title === title;
  const quick = keepAi
    ? undefined
    : buildExtractiveQuickRead({ title, summary: combined || longest, subject, region, sourceNames: outlets, tierReason: scoring.reason });

  await db.story.update({
    where: { id: storyId },
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
      quickMinutes,
      deepMinutes,
      ...(quick ? { quickReadJson: JSON.stringify(quick), quickReadKind: "extractive" } : {}),
    },
  });
  return isNew ? "new" : "updated";
}

async function rescoreRecent() {
  const since = new Date(Date.now() - 4 * 86_400_000);
  const stories = await db.story.findMany({
    where: { latestPublishedAt: { gte: since } },
    include: { articles: { include: { source: true } } },
  });
  for (const s of stories) {
    if (!s.articles.length) continue;
    const text = `${s.title}. ${s.summary ?? ""}`;
    const scoring = scoreStory({
      title: s.title,
      text,
      subject: s.subject as Subject,
      region: s.region as Region,
      sourceCount: new Set(s.articles.map((a) => a.sourceId)).size,
      maxCredibility: Math.max(...s.articles.map((a) => a.source.credibility)),
      hasOfficialSource: s.articles.some((a) => a.source.kind === "official"),
      latestPublishedAt: s.latestPublishedAt,
      isOpinion: s.articles.every((a) => looksLikeOpinion(a.title, a.url)),
    });
    if (scoring.tier !== s.tier || Math.abs(scoring.score - s.score) > 0.5) {
      await db.story.update({ where: { id: s.id }, data: { score: scoring.score, tier: scoring.tier, scoreReason: scoring.reason, scoreFactors: JSON.stringify(scoring.factors) } });
    }
  }
}

export async function linkStories(storyIds: string[]) {
  if (!storyIds.length) return;
  const since = new Date(Date.now() - 7 * 86_400_000);
  const pool = await db.story.findMany({
    where: { latestPublishedAt: { gte: since } },
    select: { id: true, entitiesJson: true, keywordsJson: true, subject: true, score: true },
  });
  const byId = new Map(pool.map((p) => [p.id, { ...p, entities: safeJson<string[]>(p.entitiesJson, []), keywords: new Set(safeJson<string[]>(p.keywordsJson, [])) }]));
  for (const id of storyIds) {
    const me = byId.get(id);
    if (!me) continue;
    const candidates: { toId: string; shared: string[]; strength: number }[] = [];
    for (const other of byId.values()) {
      if (other.id === id) continue;
      const shared = sharedEntities(me.entities, other.entities);
      const kw = jaccard(me.keywords, other.keywords);
      const strength = shared.length * 1.0 + kw * 3;
      if (shared.length >= 1 && strength >= 1.6) candidates.push({ toId: other.id, shared, strength: Number(strength.toFixed(2)) });
    }
    candidates.sort((a, b) => b.strength - a.strength);
    const top = candidates.slice(0, 8);
    await db.storyLink.deleteMany({ where: { OR: [{ fromId: id }, { toId: id }] , relation: "topical" } });
    for (const c of top) {
      const data = { shared: JSON.stringify(c.shared), strength: c.strength, relation: "topical" as const };
      await db.storyLink.upsert({ where: { fromId_toId: { fromId: id, toId: c.toId } }, update: data, create: { fromId: id, toId: c.toId, ...data } });
      await db.storyLink.upsert({ where: { fromId_toId: { fromId: c.toId, toId: id } }, update: data, create: { fromId: c.toId, toId: id, ...data } });
    }
  }
}

export async function pruneOld(days = 45) {
  const cutoff = new Date(Date.now() - days * 86_400_000);
  // Keep stories that users saved or reflected on.
  const keep = await db.story.findMany({
    where: { latestPublishedAt: { lt: cutoff }, OR: [{ bookmarks: { some: {} } }, { reflections: { some: {} } }, { readingEvents: { some: {} } }] },
    select: { id: true },
  });
  const keepIds = new Set(keep.map((k) => k.id));
  const old = await db.story.findMany({ where: { latestPublishedAt: { lt: cutoff } }, select: { id: true } });
  const ids = old.map((o) => o.id).filter((i) => !keepIds.has(i));
  if (!ids.length) return 0;
  await db.article.deleteMany({ where: { storyId: { in: ids } } });
  await db.story.deleteMany({ where: { id: { in: ids } } });
  return ids.length;
}
