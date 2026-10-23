import * as z from "zod/v4";
import { db } from "../db";
import { generateStructured, isAiConfigured } from "./client";

// Classifies "topical" links (shared entities) into causal / correlated / plausible / speculative.
// Runs on demand for the Connect-the-Dots map; results are cached on the StoryLink rows.

const LinkSchema = z.object({
  links: z.array(
    z.object({
      toId: z.string(),
      relation: z.enum(["causal", "correlated", "plausible", "speculative"]),
      rationale: z.string().describe("One sentence. Say what the link is and how strong the evidence for it is."),
    })
  ),
});

export async function classifyLinksForStory(storyId: string): Promise<number> {
  if (!isAiConfigured()) return 0;
  const story = await db.story.findUnique({
    where: { id: storyId },
    include: { linksFrom: { where: { relation: "topical" }, include: { to: { select: { id: true, title: true, summary: true, subject: true } } }, orderBy: { strength: "desc" }, take: 8 } },
  });
  if (!story || !story.linksFrom.length) return 0;
  const user = `ORIGIN STORY: ${story.title}
Summary: ${story.summary ?? ""}

CANDIDATE CONNECTIONS (found by shared people, places and ideas):
${story.linksFrom.map((l) => `- toId=${l.to.id} | ${l.to.title} | ${l.to.subject} | shares: ${JSON.parse(l.shared).slice(0, 4).join(", ")} | ${l.to.summary?.slice(0, 220) ?? ""}`).join("\n")}

For each candidate, classify the relationship from the origin story's point of view:
- causal: one development plausibly drives or directly results from the other (state the mechanism)
- correlated: they move together or share a common driver, but neither obviously causes the other
- plausible: a reasonable thematic link worth exploring, evidence thin
- speculative: only a loose topical overlap
Be honest; most shared-entity links are 'plausible' or 'speculative'. Return one entry per toId.`;

  const out = await generateStructured({ schema: LinkSchema, user, maxTokens: 4000, effort: "low" });
  let n = 0;
  for (const l of out.links) {
    const exists = story.linksFrom.find((x) => x.to.id === l.toId);
    if (!exists) continue;
    await db.storyLink.updateMany({ where: { fromId: storyId, toId: l.toId }, data: { relation: l.relation, rationale: l.rationale } });
    n++;
  }
  return n;
}
