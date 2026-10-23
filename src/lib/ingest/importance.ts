import type { Subject, Region, Tier } from "../types";

// Transparent story-importance engine.
// Each factor is explained in plain language so the UI can show "Why am I seeing this?".

export interface ScoringInput {
  title: string;
  text: string;
  subject: Subject;
  region: Region;
  sourceCount: number;
  maxCredibility: number;
  hasOfficialSource: boolean;
  latestPublishedAt: Date;
  isOpinion: boolean;
}

export interface ScoringResult {
  score: number; // 0..100
  tier: Tier;
  reason: string; // one-sentence explanation used in the tooltip
  factors: string[]; // bullet explanations
}

const ECON_SIGNIFICANCE = /\b(gdp|inflation|repo rate|rate (cut|hike)|monetary policy|fiscal|budget|tariffs?|trade (deal|war|agreement)|sanctions?|export controls?|recession|bond yields?|currency|rupee|dollar|crude|oil prices?|central bank|rbi|federal reserve|ecb|imf|world bank|unemployment|jobs|core sector|iip|pmi|gst|tax)\b/i;
const POLICY_SIGNIFICANCE = /\b(parliament|bill|act|ordinance|regulation|supreme court|verdict|policy|scheme|ban|mandate|guidelines?|circular|notification|directions?|framework|reform|amendment|cabinet|budget)\b/i;
const SCALE = /\b(\d{2,3}(,\d{3})+|\d+(\.\d+)?\s?(crore|lakh|billion|million|trillion|bn|mn)|nationwide|national|global|worldwide|millions?|billions?|thousands?|hundreds?|statewide|all states|across the country)\b/i;
const CONFLICT = /\b(war|ceasefire|strike|attack|blast|violence|killed|clash|invasion|missile|troops|protest|riots?|unrest|emergency|outbreak|epidemic|pandemic|disaster|flood|cyclone|earthquake)\b/i;
const ELECTION = /\b(election|polls?|voters?|ballot|evm|voter roll|manifesto|coalition|mandate)\b/i;
const MARKET_MOVING = /\b(ipo|merger|acquisition|takeover|earnings|results|profit|loss|rating|downgrade|upgrade|default|bankrupt|insolvency|stake sale|fundrais)\b/i;
const TRIVIAL = /\b(horoscope|celebrity|bollywood|box office|wordle|recipe|quiz|live updates?|highlights?|photos?|in pictures|watch:|video:)\b/i;

export function scoreStory(input: ScoringInput): ScoringResult {
  const t = `${input.title} ${input.text}`;
  let score = 0;
  const factors: string[] = [];
  const reasons: string[] = [];

  // Source credibility (0..20)
  const cred = Math.round(input.maxCredibility * 20);
  score += cred;
  if (input.hasOfficialSource) {
    score += 12;
    factors.push("Comes straight from an official source");
    reasons.push("comes straight from an official source");
  } else if (input.maxCredibility >= 0.88) {
    factors.push("Reported by a high-credibility outlet");
  }

  // Corroboration (0..15)
  if (input.sourceCount >= 3) {
    score += 15;
    factors.push(`Corroborated by ${input.sourceCount} outlets`);
    reasons.push(`corroborated by ${input.sourceCount} outlets`);
  } else if (input.sourceCount === 2) {
    score += 9;
    factors.push("Reported by 2 outlets");
    reasons.push("reported by two outlets");
  }

  // Economic / policy consequence (0..20)
  if (ECON_SIGNIFICANCE.test(t)) {
    score += 14;
    factors.push("Meaningful economic consequences (prices, jobs, growth or trade)");
    reasons.push("meaningful economic consequences (prices, jobs, growth or trade)");
  }
  if (POLICY_SIGNIFICANCE.test(t)) {
    score += 8;
    factors.push("Involves a policy, law or regulatory decision");
    reasons.push("a policy or regulatory decision with wide effects");
  }
  if (MARKET_MOVING.test(t) && (input.subject === "business" || input.subject === "markets" || input.subject === "economy")) {
    score += 6;
    factors.push("Potentially market-moving corporate development");
  }

  // Scale of people affected (0..10)
  if (SCALE.test(t)) {
    score += 8;
    factors.push("Large scale: many people, or large sums, involved");
  }

  // Conflict / emergency (0..12)
  if (CONFLICT.test(t)) {
    score += 10;
    factors.push("Conflict, security or public-safety development");
    reasons.push("conflict or security development with humanitarian or geopolitical consequences");
  }
  if (ELECTION.test(t)) {
    score += 6;
    factors.push("Election or democratic process");
    reasons.push("election or democratic process with consequences for governance");
  }

  // India relevance (0..10)
  if (input.region === "india") {
    score += 8;
    factors.push("Directly relevant to India");
  } else if (input.region === "cross-border") {
    score += 10;
    factors.push("Cross-border development touching India");
  }

  // Subject prior (curiosity set is business/finance/strategy heavy)
  const subjectPrior: Record<Subject, number> = {
    economy: 8, markets: 6, business: 6, geopolitics: 7, politics: 5, marketing: 4,
    technology: 4, environment: 4, health: 4, science: 3, society: 1,
  };
  score += subjectPrior[input.subject];

  // Freshness decay (-0..-25)
  const ageHours = (Date.now() - input.latestPublishedAt.getTime()) / 3_600_000;
  if (ageHours > 72) score -= 25;
  else if (ageHours > 36) score -= 14;
  else if (ageHours > 18) score -= 6;
  else factors.push("Fresh: published within the last 18 hours");

  // Penalties
  if (TRIVIAL.test(input.title)) {
    score -= 20;
    factors.push("Lower priority: live blog, listicle or entertainment format");
  }
  if (input.isOpinion) {
    score -= 8;
    factors.push("Opinion or analysis piece (labelled as such)");
  }
  if (input.title.length < 25) score -= 5;

  score = Math.max(0, Math.min(100, score));

  const tier: Tier = score >= 58 ? "must-know" : score >= 40 ? "worth-understanding" : "discover";
  const label = tier === "must-know" ? "Must Know" : tier === "worth-understanding" ? "Worth Understanding" : "Discover Something New";
  const why = reasons.length
    ? reasons.slice(0, 2).join("; ")
    : tier === "discover"
      ? "a significant development outside the day's dominant topics"
      : "credible reporting on a development with wider consequences";
  const reason = `${label}: ${why}.`;

  return { score, tier, reason, factors };
}
