import type { QuickRead, Subject, Region } from "../types";
import { sentences, truncate } from "../utils";

// Source-grounded fallback used when no AI key is configured (or AI fails).
// It never invents facts: every sentence comes from the publisher's own summary.

interface ExtractiveInput {
  title: string;
  summary: string; // combined descriptions from all articles in the cluster
  subject: Subject;
  region: Region;
  sourceNames: string[];
  tierReason: string;
}

const AUDIENCE_HINTS: Record<Subject, { audience: string; text: string }[]> = {
  economy: [{ audience: "Indian economy", text: "Macroeconomic developments feed into prices, borrowing costs and growth expectations." }],
  markets: [{ audience: "Financial markets", text: "Market-moving news changes valuations, flows and risk appetite." }],
  business: [{ audience: "Businesses", text: "Corporate moves reshape competition, hiring and investment in the sector." }],
  marketing: [{ audience: "Consumers", text: "Shifts in brand strategy change what consumers see, buy and pay." }],
  geopolitics: [{ audience: "Global developments", text: "Geopolitical shifts affect trade, energy prices and supply chains." }],
  politics: [{ audience: "Indian economy", text: "Policy and governance decisions set the rules businesses and citizens operate under." }],
  society: [{ audience: "Consumers", text: "Social developments shape demand, labour and public priorities." }],
  science: [{ audience: "Businesses", text: "Scientific advances often become tomorrow's industries." }],
  health: [{ audience: "Consumers", text: "Public-health developments affect households, insurers and healthcare demand." }],
  environment: [{ audience: "Global developments", text: "Climate and energy decisions ripple through costs, regulation and investment." }],
  technology: [{ audience: "Businesses", text: "Technology shifts change productivity, competition and regulation." }],
};

export function buildExtractiveQuickRead(input: ExtractiveInput): QuickRead {
  const sents = sentences(input.summary);
  const points = sents.slice(0, 3).map((s) => truncate(s, 180));
  while (points.length < 3 && points.length < sents.length) points.push(truncate(sents[points.length], 180));
  if (points.length === 0) points.push(truncate(input.title, 180));

  const whatHappened = truncate(sents.slice(0, 4).join(" ") || input.summary || input.title, 520);
  const outlets = input.sourceNames.length ? input.sourceNames.join(", ") : "the source";

  return {
    headline: input.title,
    points,
    whatHappened,
    whyCare: AUDIENCE_HINTS[input.subject] ?? [],
    biggerPicture: `${input.tierReason} Open the original reporting from ${outlets} for the full account.`,
    interestingPart:
      "AI enrichment is not configured, so there is no analytical insight here yet. Everything above is taken directly from the publisher's own summary, not inferred.",
    whatsNext: "Watch for follow-up reporting and any official statements; this card updates automatically when new coverage arrives.",
    kind: "extractive",
    generatedAt: new Date().toISOString(),
  };
}
