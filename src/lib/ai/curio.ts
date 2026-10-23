import * as z from "zod/v4";
import { db } from "../db";
import { generateStructured, isAiConfigured, AiNotConfiguredError, EDITORIAL_SYSTEM } from "./client";
import { loadStoryForAi, sourceBlock, storyHeader } from "./context";
import { searchStories } from "../search";
import type { Citation } from "../types";
import { fmtShortDate } from "../utils";

const CurioSchema = z.object({
  answer: z.string().describe("Markdown. Clear, conversational, intelligent. Cite sources inline as [1], [2] using the numbered CONTEXT. Separate facts from interpretation. State uncertainty. No fabricated statistics."),
  followUps: z.array(z.string()).min(2).max(3).describe("Short follow-up questions the reader might ask next."),
  citationsUsed: z.array(z.number().int()).describe("Numbers of the CONTEXT items you actually relied on."),
});

const CURIO_SYSTEM = `${EDITORIAL_SYSTEM}

You are now "Curio", the reader's research companion inside The Curious Brief. You answer questions about the news using the CONTEXT you are given (stories on the platform, their original reporting, and official indicators). Rules:
- Ground factual claims in the numbered CONTEXT and cite them inline like [2]. If the context does not contain the answer, say so and reason carefully from general knowledge, clearly labelled as such — never invent figures, quotes or events.
- Be concise: usually 120–250 words. Use short paragraphs or a short list. Avoid headings.
- Always distinguish what is reported from what is interpretation.
- Friendly and curious, never childish.`;

export interface CurioResult {
  answer: string;
  followUps: string[];
  citations: Citation[];
}

export async function askCurio(opts: { userId: string; sessionId: string; question: string; storyId?: string | null }): Promise<CurioResult> {
  if (!isAiConfigured()) throw new AiNotConfiguredError();
  const citations: Citation[] = [];
  const ctx: string[] = [];
  let n = 0;

  // 1. Current story, if any.
  if (opts.storyId) {
    const story = await loadStoryForAi(opts.storyId);
    if (story) {
      n++;
      citations.push({ n, title: story.title, url: story.articles[0]?.url ?? `/story/${story.slug}`, source: story.articles[0]?.source.name ?? "The Curious Brief", slug: story.slug });
      ctx.push(`[${n}] CURRENT STORY — ${storyHeader(story)}\n${sourceBlock(story, 2000)}`);
    }
  }

  // 2. Retrieval: top matching stories for the question.
  const hits = await searchStories({ q: opts.question, limit: 6, excludeId: opts.storyId ?? undefined });
  for (const h of hits) {
    n++;
    citations.push({ n, title: h.title, url: h.url, source: h.sourceName, slug: h.slug });
    ctx.push(`[${n}] ${h.sourceName}, ${fmtShortDate(h.latestPublishedAt)} — ${h.title}\n${h.summary?.slice(0, 700) ?? ""}\nURL: ${h.url}`);
  }

  // 3. Relevant indicators (keyword match).
  const q = opts.question.toLowerCase();
  const indicatorTerms: [RegExp, string[]][] = [
    [/inflation|cpi|prices/, ["IN_CPI", "US_CPI", "EMU_CPI"]],
    [/gdp|growth/, ["IN_GDP", "WLD_GDP", "US_GDP", "CHN_GDP"]],
    [/rupee|dollar|currency|forex|exchange rate/, ["USDINR", "EURINR", "IN_RESERVES"]],
    [/repo|rbi|interest rate|monetary/, ["IN_REPO", "IN_LEND"]],
    [/fed|federal reserve|treasury|yield/, ["FED_FUNDS", "US_10Y"]],
    [/ecb|euro/, ["ECB_MRR", "ECB_DFR", "EURUSD"]],
    [/oil|crude|brent/, ["BRENT"]],
    [/unemploy|jobs/, ["IN_UNEMP"]],
    [/current account|trade deficit|imports|exports/, ["IN_CAB", "IN_TRADE"]],
  ];
  const codes = new Set<string>();
  for (const [re, cs] of indicatorTerms) if (re.test(q)) cs.forEach((c) => codes.add(c));
  if (codes.size) {
    const inds = await db.indicator.findMany({ where: { code: { in: Array.from(codes) }, latestValue: { not: null } } });
    for (const ind of inds) {
      n++;
      citations.push({ n, title: `${ind.name}: ${ind.latestValue}${ind.unit === "%" ? "%" : " " + ind.unit} (${ind.latestPeriod})`, url: ind.sourceUrl, source: ind.sourceName });
      ctx.push(`[${n}] OFFICIAL INDICATOR — ${ind.name} = ${ind.latestValue} ${ind.unit}, reference period ${ind.latestPeriod} (previous ${ind.previousValue} in ${ind.previousPeriod}). Source: ${ind.sourceName}. ${ind.explanation}`);
    }
  }

  // 4. Recent conversation.
  const history = await db.curioMessage.findMany({ where: { userId: opts.userId, sessionId: opts.sessionId }, orderBy: { createdAt: "asc" }, take: 12 });
  const historyText = history.length ? history.map((m) => `${m.role === "user" ? "Reader" : "Curio"}: ${m.content.slice(0, 800)}`).join("\n") : "(none)";

  const user = `CONTEXT:\n${ctx.length ? ctx.join("\n\n") : "(no matching stories on the platform yet)"}\n\nCONVERSATION SO FAR:\n${historyText}\n\nREADER'S QUESTION: ${opts.question}`;
  const out = await generateStructured({ schema: CurioSchema, user, system: CURIO_SYSTEM, maxTokens: 4000, effort: "medium" });
  const used = new Set(out.citationsUsed);
  const usedCitations = citations.filter((c) => used.has(c.n));
  return { answer: out.answer, followUps: out.followUps, citations: usedCitations.length ? usedCitations : citations.slice(0, 4) };
}
