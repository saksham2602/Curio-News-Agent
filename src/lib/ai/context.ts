import { db } from "../db";
import { SUBJECT_MAP } from "../taxonomy";
import type { Subject } from "../types";
import { fmtShortDate } from "../utils";

// Builds the source-grounded context block that every AI prompt receives.

export type StoryWithArticles = NonNullable<Awaited<ReturnType<typeof loadStoryForAi>>>;

export async function loadStoryForAi(storyId: string) {
  return db.story.findUnique({
    where: { id: storyId },
    include: {
      articles: { include: { source: true }, orderBy: { publishedAt: "desc" } },
      linksFrom: { include: { to: { select: { id: true, slug: true, title: true, subject: true, summary: true, latestPublishedAt: true } } }, orderBy: { strength: "desc" }, take: 8 },
    },
  });
}

export function sourceBlock(story: StoryWithArticles, maxChars = 3000): string {
  const lines: string[] = [];
  story.articles.forEach((a, i) => {
    const body = (a.content && a.content.length > (a.description?.length ?? 0) ? a.content : a.description) ?? "";
    lines.push(
      `[S${i + 1}] ${a.source.name} (${a.source.kind}) — published ${fmtShortDate(a.publishedAt)}\nTitle: ${a.title}\nURL: ${a.url}\nText: ${body.slice(0, maxChars)}`
    );
  });
  return lines.join("\n\n");
}

export function relatedBlock(story: StoryWithArticles): string {
  if (!story.linksFrom.length) return "(none)";
  return story.linksFrom
    .map((l, i) => `[R${i + 1}] ${l.to.title} — ${SUBJECT_MAP[l.to.subject as Subject]?.label ?? l.to.subject}, ${fmtShortDate(l.to.latestPublishedAt)}. ${l.to.summary?.slice(0, 240) ?? ""} (internal link: /story/${l.to.slug})`)
    .join("\n");
}

export function storyHeader(story: StoryWithArticles): string {
  return `STORY: ${story.title}\nSubject: ${SUBJECT_MAP[story.subject as Subject]?.label ?? story.subject} · Region: ${story.region} · Importance: ${story.tier} (${story.scoreReason})\nFirst reported: ${fmtShortDate(story.firstPublishedAt)} · Latest: ${fmtShortDate(story.latestPublishedAt)} · Outlets: ${new Set(story.articles.map((a) => a.source.name)).size}`;
}

export function allowedUrls(story: StoryWithArticles): Set<string> {
  const set = new Set<string>();
  for (const a of story.articles) set.add(a.url);
  for (const l of story.linksFrom) set.add(`/story/${l.to.slug}`);
  return set;
}
