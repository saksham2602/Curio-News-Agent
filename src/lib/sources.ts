import type { Subject } from "./types";

// Every feed below was verified reachable (HTTP 200 with items) at build time.
// Feeds are public RSS endpoints published by the outlets themselves; we store
// only the headline, the outlet's own summary, the link and the image reference,
// and always link back to the publisher. No full-text reproduction.

export interface SourceDef {
  id: string;
  name: string;
  homepage: string;
  feedUrl: string;
  region: "india" | "international";
  kind: "news" | "official" | "analysis";
  credibility: number; // 0..1 — editorial weight, not a judgement of truth
  subjectHint?: Subject;
  cadence: "breaking" | "general" | "analysis"; // which refresh schedule
}

export const SOURCES: SourceDef[] = [
  // ───────────── India: news ─────────────
  { id: "hindu-national", name: "The Hindu", homepage: "https://www.thehindu.com", feedUrl: "https://www.thehindu.com/news/national/feeder/default.rss", region: "india", kind: "news", credibility: 0.9, cadence: "breaking" },
  { id: "hindu-business", name: "The Hindu", homepage: "https://www.thehindu.com/business/", feedUrl: "https://www.thehindu.com/business/feeder/default.rss", region: "india", kind: "news", credibility: 0.9, subjectHint: "business", cadence: "general" },
  { id: "hindu-economy", name: "The Hindu", homepage: "https://www.thehindu.com/business/Economy/", feedUrl: "https://www.thehindu.com/business/Economy/feeder/default.rss", region: "india", kind: "news", credibility: 0.9, subjectHint: "economy", cadence: "general" },
  { id: "hindu-international", name: "The Hindu", homepage: "https://www.thehindu.com/news/international/", feedUrl: "https://www.thehindu.com/news/international/feeder/default.rss", region: "india", kind: "news", credibility: 0.9, cadence: "general" },
  { id: "mint-economy", name: "Mint", homepage: "https://www.livemint.com/economy", feedUrl: "https://www.livemint.com/rss/economy", region: "india", kind: "news", credibility: 0.88, subjectHint: "economy", cadence: "breaking" },
  { id: "mint-markets", name: "Mint", homepage: "https://www.livemint.com/market", feedUrl: "https://www.livemint.com/rss/markets", region: "india", kind: "news", credibility: 0.88, subjectHint: "markets", cadence: "general" },
  { id: "mint-companies", name: "Mint", homepage: "https://www.livemint.com/companies", feedUrl: "https://www.livemint.com/rss/companies", region: "india", kind: "news", credibility: 0.88, subjectHint: "business", cadence: "general" },
  { id: "et-top", name: "Economic Times", homepage: "https://economictimes.indiatimes.com", feedUrl: "https://economictimes.indiatimes.com/rssfeedsdefault.cms", region: "india", kind: "news", credibility: 0.82, cadence: "general" },
  { id: "et-markets", name: "Economic Times", homepage: "https://economictimes.indiatimes.com/markets", feedUrl: "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms", region: "india", kind: "news", credibility: 0.82, subjectHint: "markets", cadence: "general" },
  { id: "ie-business", name: "Indian Express", homepage: "https://indianexpress.com/section/business/", feedUrl: "https://indianexpress.com/section/business/feed/", region: "india", kind: "news", credibility: 0.86, subjectHint: "business", cadence: "general" },
  { id: "ie-india", name: "Indian Express", homepage: "https://indianexpress.com/section/india/", feedUrl: "https://indianexpress.com/section/india/feed/", region: "india", kind: "news", credibility: 0.86, cadence: "general" },
  { id: "afaqs", name: "afaqs!", homepage: "https://www.afaqs.com", feedUrl: "https://www.afaqs.com/rss", region: "india", kind: "news", credibility: 0.72, subjectHint: "marketing", cadence: "analysis" },

  // ───────────── India: official ─────────────
  { id: "rbi-press", name: "Reserve Bank of India", homepage: "https://www.rbi.org.in", feedUrl: "https://www.rbi.org.in/pressreleases_rss.xml", region: "india", kind: "official", credibility: 1, subjectHint: "economy", cadence: "breaking" },
  { id: "rbi-notifications", name: "Reserve Bank of India", homepage: "https://www.rbi.org.in", feedUrl: "https://www.rbi.org.in/notifications_rss.xml", region: "india", kind: "official", credibility: 1, subjectHint: "economy", cadence: "general" },
  { id: "pib", name: "Press Information Bureau", homepage: "https://www.pib.gov.in", feedUrl: "https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3&reg=3", region: "india", kind: "official", credibility: 0.95, subjectHint: "politics", cadence: "general" },
  { id: "sebi", name: "SEBI", homepage: "https://www.sebi.gov.in", feedUrl: "https://www.sebi.gov.in/sebirss.xml", region: "india", kind: "official", credibility: 1, subjectHint: "markets", cadence: "general" },

  // ───────────── International: news ─────────────
  { id: "bbc-world", name: "BBC", homepage: "https://www.bbc.com/news/world", feedUrl: "https://feeds.bbci.co.uk/news/world/rss.xml", region: "international", kind: "news", credibility: 0.92, cadence: "breaking" },
  { id: "bbc-business", name: "BBC", homepage: "https://www.bbc.com/news/business", feedUrl: "https://feeds.bbci.co.uk/news/business/rss.xml", region: "international", kind: "news", credibility: 0.92, subjectHint: "business", cadence: "general" },
  { id: "bbc-tech", name: "BBC", homepage: "https://www.bbc.com/news/technology", feedUrl: "https://feeds.bbci.co.uk/news/technology/rss.xml", region: "international", kind: "news", credibility: 0.92, subjectHint: "technology", cadence: "general" },
  { id: "guardian-world", name: "The Guardian", homepage: "https://www.theguardian.com/world", feedUrl: "https://www.theguardian.com/world/rss", region: "international", kind: "news", credibility: 0.88, cadence: "breaking" },
  { id: "guardian-business", name: "The Guardian", homepage: "https://www.theguardian.com/uk/business", feedUrl: "https://www.theguardian.com/uk/business/rss", region: "international", kind: "news", credibility: 0.88, subjectHint: "business", cadence: "general" },
  { id: "guardian-environment", name: "The Guardian", homepage: "https://www.theguardian.com/environment", feedUrl: "https://www.theguardian.com/environment/rss", region: "international", kind: "news", credibility: 0.88, subjectHint: "environment", cadence: "general" },
  { id: "guardian-science", name: "The Guardian", homepage: "https://www.theguardian.com/science", feedUrl: "https://www.theguardian.com/science/rss", region: "international", kind: "news", credibility: 0.88, subjectHint: "science", cadence: "general" },
  { id: "guardian-tech", name: "The Guardian", homepage: "https://www.theguardian.com/technology", feedUrl: "https://www.theguardian.com/technology/rss", region: "international", kind: "news", credibility: 0.88, subjectHint: "technology", cadence: "general" },
  { id: "aljazeera", name: "Al Jazeera", homepage: "https://www.aljazeera.com", feedUrl: "https://www.aljazeera.com/xml/rss/all.xml", region: "international", kind: "news", credibility: 0.82, subjectHint: "geopolitics", cadence: "breaking" },
  { id: "ft-home", name: "Financial Times", homepage: "https://www.ft.com", feedUrl: "https://www.ft.com/rss/home", region: "international", kind: "news", credibility: 0.95, subjectHint: "business", cadence: "general" },
  { id: "economist-finance", name: "The Economist", homepage: "https://www.economist.com/finance-and-economics", feedUrl: "https://www.economist.com/finance-and-economics/rss.xml", region: "international", kind: "analysis", credibility: 0.93, subjectHint: "economy", cadence: "analysis" },
  { id: "marketingweek", name: "Marketing Week", homepage: "https://www.marketingweek.com", feedUrl: "https://www.marketingweek.com/feed/", region: "international", kind: "analysis", credibility: 0.78, subjectHint: "marketing", cadence: "analysis" },
  { id: "arstechnica", name: "Ars Technica", homepage: "https://arstechnica.com", feedUrl: "https://feeds.arstechnica.com/arstechnica/index", region: "international", kind: "news", credibility: 0.8, subjectHint: "technology", cadence: "general" },
  { id: "mit-tr", name: "MIT Technology Review", homepage: "https://www.technologyreview.com", feedUrl: "https://www.technologyreview.com/feed/", region: "international", kind: "analysis", credibility: 0.85, subjectHint: "technology", cadence: "analysis" },
  { id: "sciencedaily", name: "ScienceDaily", homepage: "https://www.sciencedaily.com", feedUrl: "https://www.sciencedaily.com/rss/top/science.xml", region: "international", kind: "news", credibility: 0.75, subjectHint: "science", cadence: "analysis" },

  // ───────────── International: official / multilateral ─────────────
  { id: "fed-press", name: "Federal Reserve", homepage: "https://www.federalreserve.gov", feedUrl: "https://www.federalreserve.gov/feeds/press_all.xml", region: "international", kind: "official", credibility: 1, subjectHint: "economy", cadence: "breaking" },
  { id: "ecb-press", name: "European Central Bank", homepage: "https://www.ecb.europa.eu", feedUrl: "https://www.ecb.europa.eu/rss/press.html", region: "international", kind: "official", credibility: 1, subjectHint: "economy", cadence: "general" },
  { id: "wto", name: "WTO", homepage: "https://www.wto.org", feedUrl: "https://www.wto.org/library/rss/latest_news_e.xml", region: "international", kind: "official", credibility: 0.95, subjectHint: "geopolitics", cadence: "analysis" },
  { id: "un-news", name: "United Nations", homepage: "https://news.un.org", feedUrl: "https://news.un.org/feed/subscribe/en/news/all/rss.xml", region: "international", kind: "official", credibility: 0.9, cadence: "general" },
  { id: "who", name: "World Health Organization", homepage: "https://www.who.int", feedUrl: "https://www.who.int/rss-feeds/news-english.xml", region: "international", kind: "official", credibility: 0.95, subjectHint: "health", cadence: "analysis" },
  { id: "nasa", name: "NASA", homepage: "https://www.nasa.gov", feedUrl: "https://www.nasa.gov/news-release/feed/", region: "international", kind: "official", credibility: 0.95, subjectHint: "science", cadence: "analysis" },
];

export const SOURCE_MAP = Object.fromEntries(SOURCES.map((s) => [s.id, s]));

// Candidate sources evaluated but NOT integrated (and why). Shown on /sources.
export const EXCLUDED_SOURCES = [
  { name: "Reuters", reason: "No public RSS; content licensed via paid API only." },
  { name: "Bloomberg", reason: "No public RSS; paid terminal/API licensing." },
  { name: "Business Standard", reason: "Feed returns HTTP 403 to automated clients." },
  { name: "CNBC", reason: "Feed returns HTTP 403 to automated clients." },
  { name: "IMF", reason: "RSS endpoint returns 403/404; use official data pages instead." },
  { name: "OECD", reason: "News feed returns HTTP 403." },
  { name: "World Bank News", reason: "RSS endpoint retired (404); indicator data is fetched from the World Bank API instead." },
  { name: "Harvard Business Review", reason: "Feed host timed out repeatedly." },
  { name: "Campaign India / Exchange4media", reason: "RSS endpoints return empty documents." },
  { name: "Moneycontrol", reason: "No verified public RSS endpoint tested; not integrated." },
];
