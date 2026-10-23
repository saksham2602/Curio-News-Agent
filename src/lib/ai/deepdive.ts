import * as z from "zod/v4";
import { db } from "../db";
import { generateStructured, isAiConfigured, AiNotConfiguredError } from "./client";
import { allowedUrls, loadStoryForAi, relatedBlock, sourceBlock, storyHeader, type StoryWithArticles } from "./context";
import type { DeepDive } from "../types";

const DeepDiveSchema = z.object({
  development: z.object({
    facts: z.array(z.string()).min(3).max(8).describe("Important confirmed facts with dates and figures where the sources give them."),
    people: z.array(z.string()).max(8),
    organisations: z.array(z.string()).max(8),
    figures: z.array(z.string()).max(8).describe("Supporting numbers exactly as the sources state them, with units."),
    confirmedVsAnalysis: z.string().describe("One or two sentences explaining what in this deep dive is confirmed by sources versus your analysis."),
  }),
  background: z.object({
    narrative: z.string().describe("How did we get here? Which past decisions shaped this? Why is it significant now? 150–250 words. Use well-established history; flag anything uncertain."),
    timeline: z.array(z.object({ date: z.string(), label: z.string(), detail: z.string().optional() })).max(8).describe("Key moments, oldest first. Only include dates you are confident about; otherwise use approximate labels like 'Early 2020s'."),
  }),
  fundamentals: z.array(z.object({ concept: z.string(), explanation: z.string() })).min(2).max(5).describe("Concepts a beginner needs, explained accessibly but not superficially (e.g. what bond yields are and why they move inversely to prices)."),
  connections: z
    .array(
      z.object({
        label: z.string(),
        kind: z.enum(["story", "indicator", "industry", "company", "policy", "country", "concept", "history"]),
        relation: z.enum(["causal", "correlated", "plausible", "speculative"]),
        explanation: z.string(),
        chain: z.array(z.string()).max(7).optional().describe("Optional cause→effect chain, e.g. ['Oil prices rise','India import bill rises','Inflation pressure','RBI decision harder']"),
      })
    )
    .min(4)
    .max(8)
    .describe("Connecting the dots: how this links to other developments, indicators, industries, policies, countries, history. Label the strength of each link honestly."),
  stakeholders: z.array(z.object({ group: z.string(), impact: z.string(), direction: z.enum(["positive", "negative", "mixed", "uncertain"]) })).min(3).max(8),
  perspectives: z.array(z.object({ title: z.string(), view: z.string(), evidence: z.string() })).min(2).max(3).describe("The Optimistic View, The Cautious View and, where appropriate, The Alternative View. Do not fake balance if evidence favours one reading — say so."),
  whatNext: z.object({
    nearTerm: z.string(),
    mediumTerm: z.string(),
    longTerm: z.string(),
    uncertainties: z.array(z.string()).min(2).max(5),
    indicators: z.array(z.string()).min(2).max(6).describe("Concrete indicators or events to monitor."),
    scenarios: z.array(z.object({ name: z.enum(["Optimistic", "Base case", "Downside"]), description: z.string(), indicators: z.array(z.string()).max(3) })).length(3).describe("Clearly possibilities, not predictions."),
  }),
  questions: z.array(z.string()).min(2).max(3).describe("'Now, what do you think?' — thoughtful analytical questions that make the reader weigh trade-offs."),
  furtherReading: z
    .array(z.object({ title: z.string(), url: z.string(), kind: z.enum(["original reporting", "official source", "related story", "explainer"]) }))
    .max(8)
    .describe("ONLY URLs that appear verbatim in the SOURCES or RELATED sections. Never invent a link."),
  evidenceNote: z.string().describe("What the available sources do and do not support; where the reader should seek primary documents."),
});

export async function generateDeepDive(story: StoryWithArticles): Promise<DeepDive> {
  const user = `${storyHeader(story)}

SOURCES (the only facts you may use for the development itself):
${sourceBlock(story, 4000)}

RELATED STORIES already on the platform (you may cite these by their internal link):
${relatedBlock(story)}

Write the structured Deep Dive. For background and fundamentals you may draw on well-established public knowledge, but keep it clearly separated from what the sources confirm, and do not invent specific figures or quotes. For further reading, use only URLs that appear above.`;

  const out = await generateStructured({ schema: DeepDiveSchema, user, maxTokens: 16000, effort: "high" });
  const allowed = allowedUrls(story);
  const furtherReading = out.furtherReading.filter((f) => allowed.has(f.url));
  // Always include the original reporting even if the model omitted it.
  for (const a of story.articles) {
    if (!furtherReading.some((f) => f.url === a.url)) furtherReading.push({ title: `${a.source.name}: ${a.title}`, url: a.url, kind: a.source.kind === "official" ? "official source" : "original reporting" });
  }
  return { ...out, furtherReading, kind: "ai", generatedAt: new Date().toISOString() };
}

export function unavailableDeepDive(story: StoryWithArticles, reason: string): DeepDive {
  return {
    development: {
      facts: story.articles.map((a) => `${a.source.name}: ${a.description ?? a.title}`).slice(0, 6),
      people: [],
      organisations: Array.from(new Set(story.articles.map((a) => a.source.name))),
      figures: [],
      confirmedVsAnalysis: "Everything shown here is taken directly from the publishers' own summaries. No AI analysis has been generated.",
    },
    background: { narrative: "", timeline: [] },
    fundamentals: [],
    connections: story.linksFrom.map((l) => ({ label: l.to.title, kind: "story" as const, relation: "plausible" as const, explanation: `Shares people, places or ideas with this story (${JSON.parse(l.shared).slice(0, 3).join(", ")}).` })),
    stakeholders: [],
    perspectives: [],
    whatNext: { nearTerm: "", mediumTerm: "", longTerm: "", uncertainties: [], indicators: [], scenarios: [] },
    questions: ["What would you need to know to judge whether this development matters?", "Who gains and who loses if this continues?"],
    furtherReading: story.articles.map((a) => ({ title: `${a.source.name}: ${a.title}`, url: a.url, kind: a.source.kind === "official" ? "official source" : "original reporting" })),
    evidenceNote: reason,
    kind: "unavailable",
    generatedAt: new Date().toISOString(),
  };
}

export async function getOrGenerateDeepDive(storyId: string, force = false): Promise<{ deepDive: DeepDive; error?: string }> {
  const story = await loadStoryForAi(storyId);
  if (!story) throw new Error("Story not found");
  if (!force && story.deepDiveKind === "ai" && story.deepDiveJson) return { deepDive: JSON.parse(story.deepDiveJson) as DeepDive };
  if (!isAiConfigured()) {
    const reason = new AiNotConfiguredError().message;
    return { deepDive: unavailableDeepDive(story, reason), error: reason };
  }
  try {
    const dd = await generateDeepDive(story);
    await db.story.update({ where: { id: storyId }, data: { deepDiveJson: JSON.stringify(dd), deepDiveKind: "ai", deepDiveRequestedAt: new Date() } });
    return { deepDive: dd };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { deepDive: unavailableDeepDive(story, `AI deep dive could not be generated: ${msg}`), error: msg };
  }
}
