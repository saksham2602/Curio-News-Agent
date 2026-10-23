// Lightweight entity and keyword extraction used for clustering, linking and search.

const STOP = new Set(
  `a an the and or but of in on at to for from by with as is are was were be been being this that these those it its into over under after before during between about against than then there here he she they them his her their our your you we i not no yes also just only more most some any all each other such both few many much very can could should would may might will shall do does did done has have had having says said say told tells new news latest update updates live amid among per via vs versus how what when where which who whom whose why while so if else up down out off again further once because until`.split(/\s+/)
);

const MONTHS = /^(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|sept|oct|nov|dec)$/i;
const TITLE_WORDS = /^(mr|mrs|ms|dr|prof|cm|pm|mp|mla|ceo|cfo|md|lt|gen|col|sir)\.?$/i;

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[’']s\b/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w));
}

// Capitalised multi-word phrases — approximates named entities without a model.
export function extractEntities(title: string, text: string): string[] {
  const src = `${title}. ${text}`;
  const out = new Map<string, number>();
  const re = /\b([A-Z][A-Za-z&.'’-]+(?:\s+(?:of|de|the|and|&)\s+)?(?:\s+[A-Z][A-Za-z&.'’-]+){0,4})\b/g;
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = re.exec(src))) {
    const phrase = m[1].replace(/[.’']s$/, "").trim();
    const words = phrase.split(/\s+/);
    // skip sentence-initial single words that are ordinary (e.g. "The", "Why")
    const atStart = idx === 0 || /[.!?]\s*$/.test(src.slice(Math.max(0, m.index - 3), m.index));
    idx++;
    if (words.length === 1 && (STOP.has(phrase.toLowerCase()) || MONTHS.test(phrase) || TITLE_WORDS.test(phrase) || phrase.length < 4 || atStart)) continue;
    if (words.every((w) => STOP.has(w.toLowerCase()) || MONTHS.test(w))) continue;
    if (/^(The|A|An|This|That|Why|How|What|When|Where|Who|In|On|At|For|With|From|After|Before|As|Amid|Over)$/.test(words[0]) && words.length === 1) continue;
    const key = phrase.replace(/^(The|A|An)\s+/, "");
    if (key.length < 3) continue;
    out.set(key, (out.get(key) ?? 0) + 1);
  }
  // Acronyms (RBI, SEBI, GDP, IPO, EU, UN...)
  const acr = src.match(/\b[A-Z]{2,6}\b/g) ?? [];
  for (const a of acr) {
    if (["THE", "AND", "FOR", "LIVE", "NEW", "US"].includes(a)) continue;
    out.set(a, (out.get(a) ?? 0) + 1);
  }
  return Array.from(out.entries())
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .map(([k]) => k)
    .slice(0, 14);
}

export function extractKeywords(title: string, text: string, max = 12): string[] {
  const counts = new Map<string, number>();
  for (const tok of tokenize(title)) counts.set(tok, (counts.get(tok) ?? 0) + 3);
  for (const tok of tokenize(text)) counts.set(tok, (counts.get(tok) ?? 0) + 1);
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([k]) => k);
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

// Shared entities between two stories, case-insensitive, ignoring very generic ones.
const GENERIC = new Set(["india", "indian", "government", "minister", "state", "news", "world", "today", "people", "country", "centre", "center", "year", "week", "day", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", "october", "november", "september", "the hindu", "bbc", "guardian", "mint", "reuters", "pti", "ani"]);

export function sharedEntities(a: string[], b: string[]): string[] {
  const bl = new Map(b.map((x) => [x.toLowerCase(), x]));
  const out: string[] = [];
  for (const x of a) {
    const k = x.toLowerCase();
    if (GENERIC.has(k)) continue;
    if (bl.has(k)) out.push(x);
  }
  return out;
}
