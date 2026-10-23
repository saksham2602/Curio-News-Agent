import * as z from "zod/v4";
import { db } from "../db";
import { generateStructured, isAiConfigured } from "./client";
import { SUBJECT_MAP } from "../taxonomy";
import type { Subject, WeeklyDigestContent } from "../types";
import { isoWeekKey, fmtShortDate } from "../utils";

const DigestSchema = z.object({
  title: z.string().describe("A thoughtful one-line title for the week, e.g. 'A week of accelerating transitions — warfare automation, energy contradictions, and institutions under strain'."),
  themes: z
    .array(
      z.object({
        title: z.string(),
        narrative: z.string().describe("120–180 words synthesising the theme across stories. Cite stories inline with [n]."),
        citations: z.array(z.number().int()).min(1).max(5),
      })
    )
    .min(3)
    .max(5),
  economicPulse: z.string().describe("80–140 words on the week's economic developments, citing [n]."),
  businessMoves: z.string().describe("80–140 words on corporate decisions that matter, citing [n]."),
  marketingTrends: z.string().describe("60–120 words on campaigns and consumer behaviour, or say plainly that the week's coverage had little on this."),
  powerShifts: z.string().describe("80–140 words on geopolitical developments, citing [n]."),
  ideas: z.array(z.string()).length(3).describe("Three ideas worth thinking about — intellectually stimulating, grounded, not preachy."),
  watchlist: z.array(z.object({ when: z.string(), what: z.string(), citation: z.number().int().optional() })).max(8).describe("Upcoming events ONLY if mentioned in the stories (dates, decisions, releases, hearings, elections). Never invent events."),
});

interface Candidate {
  n: number;
  id: string;
  slug: string;
  title: string;
  subject: string;
  summary: string;
  source: string;
  score: number;
  reason: string;
  date: Date;
}

async function candidates(start: Date, end: Date): Promise<Candidate[]> {
  const rows = await db.story.findMany({
    where: { latestPublishedAt: { gte: start, lte: end } },
    orderBy: [{ score: "desc" }],
    take: 40,
    include: { articles: { include: { source: true }, take: 1, orderBy: { publishedAt: "desc" } } },
  });
  return rows.map((r, i) => ({ n: i + 1, id: r.id, slug: r.slug, title: r.title, subject: r.subject, summary: r.summary ?? "", source: r.articles[0]?.source.name ?? "", score: r.score, reason: r.scoreReason, date: r.latestPublishedAt }));
}

const FUTURE_DATE = /\b(?:on|by|from|until|till|before|after)?\s*((?:\d{1,2}\s+)?(?:January|February|March|April|May|June|July|August|September|October|November|December)(?:\s+\d{1,2})?(?:,?\s+\d{4})?)\b/;

function compiledDigest(weekKey: string, cands: Candidate[]): WeeklyDigestContent {
  const bySubject = new Map<string, Candidate[]>();
  for (const c of cands) bySubject.set(c.subject, [...(bySubject.get(c.subject) ?? []), c]);
  const themes = Array.from(bySubject.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 4)
    .map(([subject, list]) => ({
      title: `${SUBJECT_MAP[subject as Subject]?.label ?? subject}: ${list.length} significant ${list.length === 1 ? "story" : "stories"}`,
      narrative: list.slice(0, 4).map((c) => `${c.title} [${c.n}]`).join(" · "),
      citations: list.slice(0, 4).map((c) => ({ n: c.n, title: c.title, source: c.source, slug: c.slug })),
    }));
  const pick = (subjects: string[]) => cands.filter((c) => subjects.includes(c.subject)).slice(0, 4).map((c) => `${c.title} [${c.n}]`).join(" · ") || "Little coverage on this subject this week.";
  const watchlist = cands
    .map((c) => ({ c, m: c.title.match(FUTURE_DATE) }))
    .filter((x) => x.m)
    .slice(0, 6)
    .map(({ c, m }) => ({ when: m![1], what: c.title, source: c.source, slug: c.slug }));
  return {
    title: "The week, compiled from the most significant stories",
    weekKey,
    biggest: cands.slice(0, 10).map((c) => ({ storyId: c.id, slug: c.slug, title: c.title, subject: c.subject, reason: c.reason })),
    themes,
    economicPulse: pick(["economy", "markets"]),
    businessMoves: pick(["business"]),
    marketingTrends: pick(["marketing"]),
    powerShifts: pick(["geopolitics", "politics"]),
    ideas: [],
    watchlist,
    kind: "compiled",
  };
}

export async function buildWeeklyDigest(end = new Date()): Promise<WeeklyDigestContent> {
  const start = new Date(end.getTime() - 7 * 86_400_000);
  const weekKey = isoWeekKey(end);
  const cands = await candidates(start, end);
  if (!cands.length) return { ...compiledDigest(weekKey, []), title: "Not enough stories yet for a weekly synthesis" };
  if (!isAiConfigured()) return compiledDigest(weekKey, cands);

  const user = `WEEK: ${fmtShortDate(start)} → ${fmtShortDate(end)} (${weekKey})

STORIES OF THE WEEK (ranked by editorial significance; cite by [n]):
${cands.map((c) => `[${c.n}] ${c.title} — ${SUBJECT_MAP[c.subject as Subject]?.label ?? c.subject}, ${c.source}, ${fmtShortDate(c.date)}\n${c.summary.slice(0, 400)}`).join("\n\n")}

Write "The Week, Decoded": identify the common themes behind the stories, then the sectional summaries. Use only these stories as evidence.`;
  try {
    const out = await generateStructured({ schema: DigestSchema, user, maxTokens: 12000, effort: "high" });
    const cite = (n: number) => {
      const c = cands.find((x) => x.n === n);
      return c ? { n, title: c.title, source: c.source, slug: c.slug } : null;
    };
    return {
      title: out.title,
      weekKey,
      biggest: cands.slice(0, 10).map((c) => ({ storyId: c.id, slug: c.slug, title: c.title, subject: c.subject, reason: c.reason })),
      themes: out.themes.map((t) => ({ title: t.title, narrative: t.narrative, citations: t.citations.map(cite).filter((x): x is NonNullable<typeof x> => !!x) })),
      economicPulse: out.economicPulse,
      businessMoves: out.businessMoves,
      marketingTrends: out.marketingTrends,
      powerShifts: out.powerShifts,
      ideas: out.ideas,
      watchlist: out.watchlist.map((w) => ({ when: w.when, what: w.what, source: w.citation ? cands.find((c) => c.n === w.citation)?.source ?? "" : "", slug: w.citation ? cands.find((c) => c.n === w.citation)?.slug : undefined })),
      kind: "ai",
    };
  } catch (e) {
    console.error("[digest] AI synthesis failed, using compiled digest:", e instanceof Error ? e.message : e);
    return compiledDigest(weekKey, cands);
  }
}

// Regenerates the rolling 7-day digest if missing or older than 12 hours (or compiled while AI is now available).
export async function ensureWeeklyDigest(force = false) {
  const now = new Date();
  const weekKey = isoWeekKey(now);
  const existing = await db.weeklyDigest.findUnique({ where: { weekKey } });
  const stale = !existing || now.getTime() - existing.createdAt.getTime() > 12 * 3_600_000 || (existing.kind === "compiled" && isAiConfigured());
  if (!force && !stale) return existing;
  const count = await db.story.count();
  if (count === 0) return existing;
  const content = await buildWeeklyDigest(now);
  return db.weeklyDigest.upsert({
    where: { weekKey },
    update: { startAt: new Date(now.getTime() - 7 * 86_400_000), endAt: now, contentJson: JSON.stringify(content), kind: content.kind, createdAt: now },
    create: { weekKey, startAt: new Date(now.getTime() - 7 * 86_400_000), endAt: now, contentJson: JSON.stringify(content), kind: content.kind },
  });
}
