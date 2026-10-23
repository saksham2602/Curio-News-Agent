import type { Subject, Region } from "../types";

// Keyword-rule classification. Deterministic, transparent, and cheap.
// AI enrichment can refine later, but the rules alone give a solid first pass.

type Rule = { subject: Subject; weight: number; terms: RegExp };

const R = (subject: Subject, weight: number, words: string[]): Rule => ({
  subject,
  weight,
  terms: new RegExp(`\\b(${words.join("|")})\\b`, "i"),
});

const RULES: Rule[] = [
  R("economy", 3, ["gdp", "inflation", "cpi", "wpi", "repo rate", "monetary policy", "fiscal deficit", "fiscal", "interest rates?", "rate cut", "rate hike", "central bank", "rbi", "reserve bank", "federal reserve", "fed", "ecb", "imf", "world bank", "trade deficit", "exports?", "imports?", "tariffs?", "economy", "economic", "recession", "growth forecast", "unemployment", "jobs data", "payrolls", "iip", "core sector", "pmi", "budget", "gst", "taxation", "bond yields?", "t-bill", "treasury", "liquidity", "vrr", "omo", "forex reserves", "current account", "remittances", "subsid(y|ies)", "msp", "monsoon"]),
  R("markets", 3, ["sensex", "nifty", "stock market", "stocks?", "shares?", "equit(y|ies)", "ipo", "bse", "nse", "sebi", "mutual funds?", "bond market", "rupee", "dollar", "usd", "forex", "crude", "brent", "gold prices?", "bullion", "wall street", "s&p 500", "nasdaq", "dow", "investors?", "valuations?", "market cap", "fii", "dii", "hedge fund", "private equity", "venture capital", "fundrais(e|ing)", "listing", "dividend", "buyback"]),
  R("business", 2, ["company", "companies", "corporate", "ceo", "chief executive", "merger", "acquisition", "acquires?", "takeover", "earnings", "quarterly results", "q[1-4] results", "net profit", "revenue", "startup", "unicorn", "tata", "reliance", "adani", "infosys", "tcs", "wipro", "hdfc", "icici", "sbi", "airtel", "jio", "maruti", "mahindra", "bajaj", "zomato", "swiggy", "flipkart", "amazon", "google", "apple", "microsoft", "meta", "tesla", "openai", "nvidia", "boeing", "airbus", "factory", "manufacturing", "layoffs?", "hiring", "supply chain", "retail", "e-commerce", "deal", "stake"]),
  R("marketing", 3, ["marketing", "advertis(ing|ement|er)", "brands?", "branding", "campaign", "consumer behaviou?r", "d2c", "influencer", "ad spend", "agency", "cmo", "chief marketing", "sponsorship", "ipl sponsor", "product launch", "packaging", "loyalty", "customer experience", "festive sales?", "diwali sales?"]),
  R("geopolitics", 3, ["war", "ceasefire", "military", "missile", "drone strike", "nato", "sanctions?", "diplomac(y|tic)", "summit", "bilateral", "g20", "g7", "brics", "quad", "united nations", "un security council", "border", "sovereignty", "annex", "invasion", "troops", "pentagon", "kremlin", "putin", "zelensky", "ukraine", "russia", "china", "taiwan", "beijing", "israel", "gaza", "hamas", "iran", "houthi", "yemen", "north korea", "pakistan", "trade war", "tariff", "export controls?", "semiconductor curbs?", "foreign minister", "foreign policy", "ambassador", "embassy", "treaty", "alliance", "defence deal", "defense"]),
  R("politics", 2, ["parliament", "lok sabha", "rajya sabha", "assembly", "election", "polls?", "voters?", "ballot", "bjp", "congress", "aap", "dmk", "tmc", "minister", "chief minister", "prime minister", "president", "governor", "cabinet", "bill", "legislation", "ordinance", "supreme court", "high court", "verdict", "judiciary", "constitution", "opposition", "coalition", "manifesto", "government", "policy", "scheme", "welfare", "reservation", "census", "delimitation", "labour", "senate", "white house", "downing street", "mps?", "mlas?"]),
  R("society", 1, ["police", "arrested?", "killed", "dies", "dead", "death toll", "accident", "blast", "fire", "flood", "rain", "cyclone", "earthquake", "rescue", "festival", "temple", "school", "students?", "university", "exam", "crime", "murder", "protest", "strike", "migrants?", "women", "caste", "communal", "riots?", "village", "city", "municipal", "metro", "traffic", "railway", "train", "airport", "flight"]),
  R("science", 3, ["nasa", "isro", "spacex", "rocket", "satellite", "moon", "mars", "asteroid", "telescope", "astronom(y|ers)", "physics", "quantum", "scientists?", "study finds", "researchers?", "species", "fossil", "dinosaur", "genome", "dna", "neuroscience", "experiment", "nobel", "laboratory"]),
  R("health", 3, ["health", "hospital", "doctors?", "vaccine", "virus", "outbreak", "pandemic", "covid", "ebola", "malaria", "dengue", "cancer", "diabetes", "mental health", "who", "drug", "pharma", "medicine", "medical", "patients?", "disease", "obesity", "nutrition", "ayushman"]),
  R("environment", 3, ["climate", "emissions?", "carbon", "net zero", "global warming", "heatwave", "wildfire", "biodiversity", "renewable", "solar", "wind power", "coal", "pollution", "air quality", "aqi", "glacier", "monsoon", "drought", "cop\\d+", "sustainab(le|ility)", "ev", "electric vehicles?", "green hydrogen", "deforestation", "wildlife", "conservation", "paddy", "agrivoltaic"]),
  R("technology", 3, ["ai", "artificial intelligence", "chatbot", "llm", "software", "app", "smartphone", "semiconductors?", "chips?", "data cent(re|er)s?", "cloud", "cyber", "hack", "data breach", "5g", "6g", "broadband", "digital", "upi", "fintech", "crypto", "bitcoin", "blockchain", "robot", "automation", "algorithm", "social media", "platform", "whatsapp", "instagram", "x\\.com", "gadget", "launch(es)? (phone|laptop)"]),
];

const INDIA_TERMS = /\b(india|indian|bharat|delhi|mumbai|bengaluru|bangalore|chennai|kolkata|hyderabad|pune|ahmedabad|kerala|tamil nadu|karnataka|maharashtra|gujarat|punjab|haryana|rajasthan|bihar|uttar pradesh|madhya pradesh|west bengal|odisha|assam|manipur|andhra|telangana|jharkhand|chhattisgarh|goa|uttarakhand|himachal|kashmir|ladakh|sikkim|tripura|meghalaya|nagaland|mizoram|arunachal|rbi|sebi|modi|lok sabha|rajya sabha|rupee|sensex|nifty|crore|lakh|bjp|congress|isro|niti aayog|pib|upi|aadhaar|gst|msp|kharif|rabi|ipl|bcci|tata|reliance|adani|infosys|hdfc|icici|sbi|jio|airtel|cuddalore|vellore|chittoor|vizianagaram|pilibhit|konkan|ulhasnagar)\b/i;

const CROSS_TERMS = /\b(india[-–]?(us|china|uk|eu|japan|russia|pakistan)|(us|china|uk|eu|japan|russia|pakistan)[-–]?india|fta|free trade agreement|bilateral|diaspora|h-1b|remittance|import bill|exports? to|imports? from|foreign investors?|fii|fpi|global|world|international)\b/i;

export function classifySubject(text: string, hint?: Subject | null): Subject {
  const scores = new Map<Subject, number>();
  for (const rule of RULES) {
    const matches = text.match(new RegExp(rule.terms.source, "gi"));
    if (matches) scores.set(rule.subject, (scores.get(rule.subject) ?? 0) + rule.weight * Math.min(matches.length, 4));
  }
  if (hint) scores.set(hint, (scores.get(hint) ?? 0) + 4);
  let best: Subject = hint ?? "society";
  let bestScore = -1;
  for (const [s, v] of scores) {
    if (v > bestScore) {
      best = s;
      bestScore = v;
    }
  }
  return best;
}

export function classifyRegion(text: string, sourceRegion: "india" | "international"): Region {
  const india = INDIA_TERMS.test(text);
  const cross = CROSS_TERMS.test(text);
  if (india && cross && sourceRegion === "international") return "cross-border";
  if (india && cross && /\b(us|china|uk|eu|japan|russia|pakistan|global|world|imf|world bank|fta)\b/i.test(text)) return "cross-border";
  if (india) return "india";
  if (sourceRegion === "india" && !/\b(us|uk|china|europe|africa|america|russia|ukraine|israel|gaza|iran|japan|australia|canada)\b/i.test(text)) return "india";
  return "international";
}

export const OPINION_MARKERS = /\b(opinion|editorial|comment|column|analysis:|explainer|explained|why .* matters|view:)\b/i;
export function looksLikeOpinion(title: string, url: string): boolean {
  return OPINION_MARKERS.test(title) || /\/(opinion|editorial|columns?|commentisfree)\//i.test(url);
}
