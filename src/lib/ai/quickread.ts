import * as z from "zod/v4";
import { db } from "../db";
import { generateStructured, isAiConfigured } from "./client";
import { loadStoryForAi, sourceBlock, storyHeader, type StoryWithArticles } from "./context";
import type { QuickRead } from "../types";

const QuickReadSchema = z.object({
  headline: z.string().describe("Catchy but accurate and non-sensational headline, max 90 characters, e.g. 'Why the RBI's latest decision matters more than you think'"),
  points: z.array(z.string()).min(3).max(3).describe("The story in 3 points. Each one short, one meaningful fact, grounded in the sources."),
  whatHappened: z.string().describe("70–100 words, conversational and intelligent, no jargon. Facts only from sources."),
  whyCare: z
    .array(z.object({ audience: z.enum(["Indian economy", "Businesses", "Financial markets", "Consumers", "Global developments"]), text: z.string() }))
    .min(1)
    .max(4)
    .describe("Only the dimensions that genuinely apply. One or two sentences each."),
  biggerPicture: z.string().describe("One or two sentences on wider implications."),
  interestingPart: z.string().describe("'Here's the interesting part': one analytical insight beyond the headline, grounded in credible evidence or well-established economic reasoning. Mark clearly if it is inference rather than fact. 2–3 sentences."),
  whatsNext: z.string().describe("What development or indicator to watch next. 1–2 sentences."),
  evidenceGaps: z.string().describe("One sentence on what the sources do NOT establish, or 'None noted' if the sources are sufficient."),
});

export async function generateQuickRead(story: StoryWithArticles): Promise<QuickRead> {
  const user = `${storyHeader(story)}

SOURCES (the only facts you may use):
${sourceBlock(story, 2500)}

Write the Quick Read for this story. The reader should understand it in 60–90 seconds. Use only facts from the sources above. If the sources are thin (for example a short official notice), keep the sections proportionate and say what is not known rather than padding.`;

  const out = await generateStructured({ schema: QuickReadSchema, user, maxTokens: 6000, effort: "medium" });
  return {
    headline: out.headline,
    points: out.points,
    whatHappened: out.whatHappened,
    whyCare: out.whyCare,
    biggerPicture: out.biggerPicture,
    interestingPart: out.interestingPart,
    whatsNext: out.evidenceGaps && out.evidenceGaps.toLowerCase() !== "none noted" ? `${out.whatsNext} Not yet established by the sources: ${out.evidenceGaps}` : out.whatsNext,
    kind: "ai",
    generatedAt: new Date().toISOString(),
  };
}

export async function ensureAiQuickRead(storyId: string): Promise<QuickRead | null> {
  if (!isAiConfigured()) return null;
  const story = await loadStoryForAi(storyId);
  if (!story) return null;
  if (story.quickReadKind === "ai" && story.quickReadJson) return JSON.parse(story.quickReadJson) as QuickRead;
  const qr = await generateQuickRead(story);
  await db.story.update({ where: { id: storyId }, data: { quickReadJson: JSON.stringify(qr), quickReadKind: "ai" } });
  return qr;
}

// Batch enrichment used by the ingestion pipeline: most important first.
export async function enrichQuickReads(limit: number): Promise<number> {
  if (!isAiConfigured() || limit <= 0) return 0;
  const since = new Date(Date.now() - 48 * 3_600_000);
  const candidates = await db.story.findMany({
    where: { latestPublishedAt: { gte: since }, OR: [{ quickReadKind: null }, { quickReadKind: "extractive" }] },
    orderBy: [{ score: "desc" }, { latestPublishedAt: "desc" }],
    take: limit,
    select: { id: true },
  });
  let done = 0;
  const queue = [...candidates];
  const workers = Array.from({ length: 3 }, async () => {
    while (queue.length) {
      const c = queue.shift()!;
      try {
        await ensureAiQuickRead(c.id);
        done++;
      } catch (e) {
        console.error("[ai] quick read failed for", c.id, e instanceof Error ? e.message : e);
      }
    }
  });
  await Promise.all(workers);
  return done;
}
