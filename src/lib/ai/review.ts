import * as z from "zod/v4";
import { generateStructured, isAiConfigured, AiNotConfiguredError } from "./client";
import type { PerspectiveReview } from "../types";

const ReviewSchema = z.object({
  assumptions: z.array(z.string()).min(1).max(4).describe("Assumptions the reader's reasoning rests on, stated neutrally."),
  counterarguments: z.array(z.string()).min(1).max(4).describe("Credible counterarguments or alternative readings."),
  missingEvidence: z.array(z.string()).min(1).max(4).describe("Evidence that would strengthen or test the view."),
  questions: z.array(z.string()).min(1).max(4).describe("Useful questions to sharpen the reasoning."),
  refinement: z.string().describe("2–4 sentences on how the reasoning could be refined. Do NOT replace the reader's opinion with your own."),
});

export async function reviewPerspective(input: {
  storyTitle?: string | null;
  storySummary?: string | null;
  title: string;
  happened: string;
  meaning: string;
  evidence: string;
  missing: string;
  changeMind: string;
  freeform: string;
}): Promise<PerspectiveReview> {
  if (!isAiConfigured()) throw new AiNotConfiguredError();
  const user = `A reader has written a private reflection. Review it as a thoughtful, respectful thinking partner. Never tell her what to conclude.

${input.storyTitle ? `RELATED STORY: ${input.storyTitle}\n${input.storySummary ?? ""}\n` : ""}
REFLECTION TITLE: ${input.title}
What happened? ${input.happened || "(blank)"}
What do I think it means? ${input.meaning || "(blank)"}
What evidence supports my view? ${input.evidence || "(blank)"}
What might I be missing? ${input.missing || "(blank)"}
What could change my mind? ${input.changeMind || "(blank)"}
Other notes: ${input.freeform || "(blank)"}`;
  const out = await generateStructured({ schema: ReviewSchema, user, maxTokens: 4000, effort: "medium" });
  return { ...out, generatedAt: new Date().toISOString() };
}
