// Shared domain types. Everything stored as JSON in the DB is typed here.

export type Subject =
  | "economy"
  | "business"
  | "markets"
  | "marketing"
  | "geopolitics"
  | "politics"
  | "society"
  | "science"
  | "health"
  | "environment"
  | "technology";

export type Region = "india" | "international" | "cross-border";
export type Tier = "must-know" | "worth-understanding" | "discover";
export type Budget = 5 | 10 | 20 | 0; // 0 = open-ended

export interface SourceRef {
  name: string;
  url: string;
  publishedAt: string; // ISO
  sourceId: string;
}

export interface QuickRead {
  headline: string;
  points: string[]; // "The story in 3 points"
  whatHappened: string;
  whyCare: { audience: string; text: string }[]; // only relevant dimensions
  biggerPicture: string;
  interestingPart: string; // "Here's the interesting part 👀"
  whatsNext: string;
  kind: "ai" | "extractive";
  generatedAt: string;
}

export interface TimelineEvent {
  date: string; // free text or ISO
  label: string;
  detail?: string;
}

export interface Connection {
  label: string;
  kind: "story" | "indicator" | "industry" | "company" | "policy" | "country" | "concept" | "history";
  relation: "causal" | "correlated" | "plausible" | "speculative";
  explanation: string;
  chain?: string[]; // "Oil prices rise -> import bill -> inflation ..."
}

export interface Stakeholder {
  group: string;
  impact: string;
  direction: "positive" | "negative" | "mixed" | "uncertain";
}

export interface Perspective {
  title: string; // Optimistic / Cautious / Alternative
  view: string;
  evidence: string;
}

export interface Scenario {
  name: string; // Optimistic / Base case / Downside
  description: string;
  indicators: string[];
}

export interface DeepDive {
  development: {
    facts: string[];
    people: string[];
    organisations: string[];
    figures: string[];
    confirmedVsAnalysis: string; // explicit note
  };
  background: { narrative: string; timeline: TimelineEvent[] };
  fundamentals: { concept: string; explanation: string }[];
  connections: Connection[];
  stakeholders: Stakeholder[];
  perspectives: Perspective[];
  whatNext: {
    nearTerm: string;
    mediumTerm: string;
    longTerm: string;
    uncertainties: string[];
    indicators: string[];
    scenarios: Scenario[];
  };
  questions: string[]; // "Now, what do you think?"
  furtherReading: { title: string; url: string; kind: string }[];
  evidenceNote: string; // what the sources do and do not support
  kind: "ai" | "unavailable";
  generatedAt: string;
}

export interface Preferences {
  subjects: Subject[];
  industries: string[];
  geography: "india" | "balanced" | "global";
  budget: Budget;
  depth: "quick" | "both" | "deep";
  tracked: string[]; // companies, countries, topics
  readingMode: "compact" | "comfortable" | "large";
  theme: "light" | "dark" | "system";
  fontScale: number; // 0.9..1.3
  focusMode: boolean;
  notifications: { dailyBrief: boolean; weekly: boolean; breaking: boolean };
}

export const DEFAULT_PREFERENCES: Preferences = {
  subjects: ["economy", "business", "markets", "marketing", "geopolitics", "politics"],
  industries: [],
  geography: "balanced",
  budget: 10,
  depth: "both",
  tracked: [],
  readingMode: "comfortable",
  theme: "system",
  fontScale: 1,
  focusMode: false,
  notifications: { dailyBrief: true, weekly: true, breaking: false },
};

export interface PerspectiveReview {
  assumptions: string[];
  counterarguments: string[];
  missingEvidence: string[];
  questions: string[];
  refinement: string;
  generatedAt: string;
}

export interface WeeklyDigestContent {
  title: string;
  weekKey: string;
  biggest: { storyId: string; slug: string; title: string; subject: string; reason: string }[];
  themes: { title: string; narrative: string; citations: { n: number; title: string; source: string; slug: string }[] }[];
  economicPulse: string;
  businessMoves: string;
  marketingTrends: string;
  powerShifts: string;
  ideas: string[];
  watchlist: { when: string; what: string; source: string; slug?: string }[];
  kind: "ai" | "compiled";
}

export interface Citation {
  n: number;
  title: string;
  url: string;
  source: string;
  slug?: string;
}

export interface SeriesPoint {
  period: string;
  value: number;
}
