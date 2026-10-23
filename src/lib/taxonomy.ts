import type { Subject, Tier, Region } from "./types";

export interface SubjectMeta {
  id: Subject;
  label: string;
  short: string;
  emoji: string;
  dot: string; // tailwind bg class for the tiny dot
  tint: string; // card tint for fallback illustration
  doodle: "chart" | "briefcase" | "ticker" | "megaphone" | "globe" | "notebook" | "people" | "planet" | "heart" | "leaf" | "chip";
  description: string;
}

export const SUBJECTS: SubjectMeta[] = [
  { id: "economy", label: "Economy", short: "Economy", emoji: "📈", dot: "bg-[#E8C84A]", tint: "bg-butter", doodle: "chart", description: "Growth, inflation, interest rates, trade and the policies behind them." },
  { id: "business", label: "Business & Finance", short: "Business", emoji: "💼", dot: "bg-[#E8C84A]", tint: "bg-butter", doodle: "briefcase", description: "Companies, strategy, deals, earnings and the people running them." },
  { id: "markets", label: "Markets & Money", short: "Markets", emoji: "💹", dot: "bg-[#B9A8E8]", tint: "bg-lavender", doodle: "ticker", description: "Stocks, bonds, currencies, central banks and capital flows." },
  { id: "marketing", label: "Brands & Marketing", short: "Marketing", emoji: "🎨", dot: "bg-[#F2B5A7]", tint: "bg-coral", doodle: "megaphone", description: "Consumer behaviour, campaigns, branding and growth." },
  { id: "geopolitics", label: "Geopolitics", short: "Geopolitics", emoji: "🌐", dot: "bg-[#F2B5A7]", tint: "bg-coral", doodle: "globe", description: "Alliances, conflicts, trade tensions and power dynamics." },
  { id: "politics", label: "Politics & Policy", short: "Politics", emoji: "🏛️", dot: "bg-[#9FC4E0]", tint: "bg-powder", doodle: "notebook", description: "Governance, legislation, elections and public policy." },
  { id: "society", label: "Society", short: "Society", emoji: "🧑‍🤝‍🧑", dot: "bg-[#BDBDBD]", tint: "bg-[#ECE9E1]", doodle: "people", description: "Demographics, culture, law and order, everyday life." },
  { id: "science", label: "Science", short: "Science", emoji: "🔭", dot: "bg-[#B9A8E8]", tint: "bg-lavender", doodle: "planet", description: "Discoveries, space, research and ideas that reshape industries." },
  { id: "health", label: "Health", short: "Health", emoji: "🩺", dot: "bg-[#F2B5A7]", tint: "bg-coral", doodle: "heart", description: "Public health, medicine, pharma and healthcare systems." },
  { id: "environment", label: "Environment & Climate", short: "Climate", emoji: "🌱", dot: "bg-[#8FBF8F]", tint: "bg-sage", doodle: "leaf", description: "Climate, energy transition, weather and sustainability." },
  { id: "technology", label: "Technology", short: "Tech", emoji: "💡", dot: "bg-[#9FC4E0]", tint: "bg-powder", doodle: "chip", description: "AI, semiconductors, platforms and digital infrastructure." },
];

export const SUBJECT_MAP = Object.fromEntries(SUBJECTS.map((s) => [s.id, s])) as Record<Subject, SubjectMeta>;
export const SUBJECT_IDS = SUBJECTS.map((s) => s.id);

export function subjectMeta(id: string): SubjectMeta {
  return SUBJECT_MAP[id as Subject] ?? SUBJECT_MAP.society;
}

export const TIERS: Record<Tier, { label: string; className: string; blurb: string }> = {
  "must-know": { label: "Must Know", className: "bg-coral/60 text-[#7A2E24]", blurb: "Significant, corroborated and consequential." },
  "worth-understanding": { label: "Worth Understanding", className: "bg-powder text-[#2A4D66]", blurb: "Important context that rewards a closer look." },
  discover: { label: "Discover Something New", className: "bg-lavender text-[#4B3A7A]", blurb: "Interesting and worth knowing, outside the headline rush." },
};

export const REGIONS: Record<Region, string> = {
  india: "India",
  international: "International",
  "cross-border": "Cross-border",
};

export const COLLECTIONS = [
  "Saved",
  "Economics Explained",
  "Business Strategy",
  "Marketing Inspiration",
  "Global Affairs",
  "Interesting Ideas",
  "Weekend Reading",
];

// Subject groups used on the home page ("Important developments, by subject")
export const HOME_SUBJECT_ORDER: Subject[] = [
  "politics",
  "economy",
  "geopolitics",
  "society",
  "health",
  "science",
  "business",
  "environment",
  "markets",
  "technology",
  "marketing",
];
