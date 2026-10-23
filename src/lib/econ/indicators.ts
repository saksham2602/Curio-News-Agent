import { db, setSetting } from "../db";
import type { SeriesPoint } from "../types";

// Official data only. Every indicator records its provider, reference period,
// the provider's own "last updated" stamp and when we fetched it.
// World Bank = annual actuals (latest available year). ECB = daily reference rates.
// FRED (optional, needs key) = US monthly/daily series.

export interface IndicatorDef {
  code: string;
  name: string;
  region: "india" | "global";
  unit: string;
  frequency: "annual" | "monthly" | "daily";
  provider: "worldbank" | "ecb" | "fred" | "rbi-release";
  sourceName: string;
  sourceUrl: string;
  explanation: string;
  whyItMatters: string;
  valueKind: "actual" | "reference-rate" | "policy-rate";
  order: number;
  fetch: () => Promise<{ series: SeriesPoint[]; sourceUpdatedAt?: string }>;
}

const WB = "https://api.worldbank.org/v2";

async function worldBank(country: string, indicator: string): Promise<{ series: SeriesPoint[]; sourceUpdatedAt?: string }> {
  const res = await fetch(`${WB}/country/${country}/indicator/${indicator}?format=json&per_page=40&date=2008:${new Date().getFullYear()}`, { next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`World Bank ${indicator} ${res.status}`);
  const json = (await res.json()) as [{ lastupdated?: string }, { date: string; value: number | null }[] | null];
  const rows = json[1] ?? [];
  const series = rows
    .filter((r) => r.value !== null && r.value !== undefined)
    .map((r) => ({ period: r.date, value: Number(r.value) }))
    .sort((a, b) => a.period.localeCompare(b.period));
  return { series, sourceUpdatedAt: json[0]?.lastupdated };
}

interface SdmxJson {
  dataSets: { series: Record<string, { observations: Record<string, (number | null)[]> }> }[];
  structure: { dimensions: { observation: { values: { id: string }[] }[] } };
  header?: { prepared?: string };
}

async function ecbSeries(flow: string, key: string, n = 60): Promise<{ series: SeriesPoint[]; sourceUpdatedAt?: string }> {
  const res = await fetch(`https://data-api.ecb.europa.eu/service/data/${flow}/${key}?lastNObservations=${n}&format=jsondata`, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`ECB ${flow}/${key} ${res.status}`);
  const json = (await res.json()) as SdmxJson;
  const seriesObj = Object.values(json.dataSets[0]?.series ?? {})[0];
  const periods = json.structure.dimensions.observation[0].values.map((v) => v.id);
  const series: SeriesPoint[] = [];
  for (const [idx, obs] of Object.entries(seriesObj?.observations ?? {})) {
    const v = obs[0];
    if (v === null || v === undefined) continue;
    series.push({ period: periods[Number(idx)], value: Number(v) });
  }
  series.sort((a, b) => a.period.localeCompare(b.period));
  return { series, sourceUpdatedAt: json.header?.prepared?.slice(0, 10) };
}

async function ecbCross(): Promise<{ series: SeriesPoint[]; sourceUpdatedAt?: string }> {
  // USD/INR = (EUR/INR) / (EUR/USD) using ECB euro reference rates for the same day.
  const [inr, usd] = await Promise.all([ecbSeries("EXR", "D.INR.EUR.SP00.A", 90), ecbSeries("EXR", "D.USD.EUR.SP00.A", 90)]);
  const usdMap = new Map(usd.series.map((p) => [p.period, p.value]));
  const series = inr.series
    .filter((p) => usdMap.has(p.period))
    .map((p) => ({ period: p.period, value: Number((p.value / usdMap.get(p.period)!).toFixed(4)) }));
  return { series, sourceUpdatedAt: inr.sourceUpdatedAt };
}

async function fred(seriesId: string, units?: string): Promise<{ series: SeriesPoint[]; sourceUpdatedAt?: string }> {
  const key = process.env.FRED_API_KEY;
  if (!key) throw new Error("FRED_API_KEY not configured");
  const u = new URL("https://api.stlouisfed.org/fred/series/observations");
  u.searchParams.set("series_id", seriesId);
  u.searchParams.set("api_key", key);
  u.searchParams.set("file_type", "json");
  u.searchParams.set("sort_order", "desc");
  u.searchParams.set("limit", "60");
  if (units) u.searchParams.set("units", units);
  const res = await fetch(u.toString());
  if (!res.ok) throw new Error(`FRED ${seriesId} ${res.status}`);
  const json = (await res.json()) as { observations: { date: string; value: string }[] };
  const series = json.observations
    .filter((o) => o.value !== ".")
    .map((o) => ({ period: o.date, value: Number(o.value) }))
    .sort((a, b) => a.period.localeCompare(b.period));
  return { series };
}

// RBI policy repo rate: no machine-readable feed exists. We extract the latest figure
// from RBI's own press releases already ingested (monetary policy statements), and label it.
async function rbiRepoFromReleases(): Promise<{ series: SeriesPoint[]; sourceUpdatedAt?: string }> {
  const arts = await db.article.findMany({
    where: { sourceId: { in: ["rbi-press", "rbi-notifications"] }, OR: [{ title: { contains: "Monetary Policy" } }, { content: { contains: "policy repo rate" } }] },
    orderBy: { publishedAt: "desc" },
    take: 40,
    select: { content: true, description: true, publishedAt: true, url: true },
  });
  const series: SeriesPoint[] = [];
  for (const a of arts) {
    const text = `${a.description ?? ""} ${a.content ?? ""}`;
    const m = text.match(/policy repo rate[^.]{0,120}?(?:at|to)\s+(\d+(?:\.\d+)?)\s*per\s*cent/i);
    if (m) series.push({ period: a.publishedAt.toISOString().slice(0, 10), value: Number(m[1]) });
  }
  const dedup = new Map<string, number>();
  for (const p of series.reverse()) dedup.set(p.period, p.value);
  const out = Array.from(dedup.entries()).map(([period, value]) => ({ period, value })).sort((a, b) => a.period.localeCompare(b.period));
  if (!out.length) throw new Error("No RBI monetary policy statement with a repo-rate figure has been ingested yet");
  return { series: out, sourceUpdatedAt: out[out.length - 1].period };
}

export const INDICATORS: IndicatorDef[] = [
  // ───── India ─────
  { code: "IN_GDP", name: "India GDP growth", region: "india", unit: "%", frequency: "annual", provider: "worldbank", sourceName: "World Bank (NY.GDP.MKTP.KD.ZG)", sourceUrl: "https://data.worldbank.org/indicator/NY.GDP.MKTP.KD.ZG?locations=IN", explanation: "How much more the Indian economy produced this year than last, after adjusting for inflation.", whyItMatters: "Growth drives jobs, tax revenue and corporate earnings; it is the headline number markets and policymakers steer by.", valueKind: "actual", order: 1, fetch: () => worldBank("IN", "NY.GDP.MKTP.KD.ZG") },
  { code: "IN_CPI", name: "India CPI inflation", region: "india", unit: "%", frequency: "annual", provider: "worldbank", sourceName: "World Bank (FP.CPI.TOTL.ZG)", sourceUrl: "https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG?locations=IN", explanation: "The yearly rise in the prices of a typical basket of consumer goods and services.", whyItMatters: "Inflation erodes purchasing power and is the RBI's primary target (4% ± 2%); it shapes interest-rate decisions.", valueKind: "actual", order: 2, fetch: () => worldBank("IN", "FP.CPI.TOTL.ZG") },
  { code: "IN_UNEMP", name: "India unemployment (ILO modelled)", region: "india", unit: "%", frequency: "annual", provider: "worldbank", sourceName: "World Bank / ILO (SL.UEM.TOTL.ZS)", sourceUrl: "https://data.worldbank.org/indicator/SL.UEM.TOTL.ZS?locations=IN", explanation: "Share of the labour force without work but seeking it, using ILO's modelled estimate.", whyItMatters: "Employment underpins consumption and social stability; modelled estimates smooth over India's large informal sector.", valueKind: "actual", order: 3, fetch: () => worldBank("IN", "SL.UEM.TOTL.ZS") },
  { code: "IN_REPO", name: "RBI policy repo rate", region: "india", unit: "%", frequency: "monthly", provider: "rbi-release", sourceName: "RBI monetary policy statements (press releases)", sourceUrl: "https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx", explanation: "The rate at which the RBI lends to banks overnight against government securities; its main policy lever.", whyItMatters: "Every loan, deposit and bond yield in India is priced off it. Extracted from RBI's own statements; no official API exists.", valueKind: "policy-rate", order: 4, fetch: rbiRepoFromReleases },
  { code: "IN_CAB", name: "India current account balance", region: "india", unit: "% of GDP", frequency: "annual", provider: "worldbank", sourceName: "World Bank (BN.CAB.XOKA.GD.ZS)", sourceUrl: "https://data.worldbank.org/indicator/BN.CAB.XOKA.GD.ZS?locations=IN", explanation: "Net flow of goods, services, income and transfers with the rest of the world, as a share of GDP. Negative means a deficit.", whyItMatters: "A wider deficit means more reliance on foreign capital and more pressure on the rupee when flows reverse.", valueKind: "actual", order: 5, fetch: () => worldBank("IN", "BN.CAB.XOKA.GD.ZS") },
  { code: "IN_TRADE", name: "India external balance (goods & services)", region: "india", unit: "% of GDP", frequency: "annual", provider: "worldbank", sourceName: "World Bank (NE.RSB.GNFS.ZS)", sourceUrl: "https://data.worldbank.org/indicator/NE.RSB.GNFS.ZS?locations=IN", explanation: "Exports minus imports of goods and services as a share of GDP.", whyItMatters: "Shows how much India depends on imports (especially oil) and how competitive its exports are.", valueKind: "actual", order: 6, fetch: () => worldBank("IN", "NE.RSB.GNFS.ZS") },
  { code: "IN_RESERVES", name: "India foreign-exchange reserves", region: "india", unit: "US$ bn", frequency: "annual", provider: "worldbank", sourceName: "World Bank (FI.RES.TOTL.CD)", sourceUrl: "https://data.worldbank.org/indicator/FI.RES.TOTL.CD?locations=IN", explanation: "Total reserves including gold, in US dollars, converted to billions.", whyItMatters: "Reserves are the RBI's ammunition to defend the rupee and a buffer against external shocks.", valueKind: "actual", order: 7, fetch: async () => { const r = await worldBank("IN", "FI.RES.TOTL.CD"); return { ...r, series: r.series.map((p) => ({ period: p.period, value: Number((p.value / 1e9).toFixed(1)) })) }; } },
  { code: "IN_LEND", name: "India bank lending rate", region: "india", unit: "%", frequency: "annual", provider: "worldbank", sourceName: "World Bank (FR.INR.LEND)", sourceUrl: "https://data.worldbank.org/indicator/FR.INR.LEND?locations=IN", explanation: "Average rate charged by banks on loans to prime customers.", whyItMatters: "Translates policy rates into what businesses and households actually pay to borrow.", valueKind: "actual", order: 8, fetch: () => worldBank("IN", "FR.INR.LEND") },
  { code: "USDINR", name: "USD / INR", region: "india", unit: "INR", frequency: "daily", provider: "ecb", sourceName: "ECB euro reference rates (EUR/INR ÷ EUR/USD)", sourceUrl: "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html", explanation: "Rupees per US dollar, derived from the ECB's daily euro reference rates for INR and USD.", whyItMatters: "A weaker rupee makes imports (oil, electronics) dearer and feeds inflation; a stronger one squeezes exporters.", valueKind: "reference-rate", order: 9, fetch: ecbCross },
  { code: "EURINR", name: "EUR / INR", region: "india", unit: "INR", frequency: "daily", provider: "ecb", sourceName: "ECB euro reference rate", sourceUrl: "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/eurofxref-graph-inr.en.html", explanation: "Rupees per euro, the ECB's official daily reference rate.", whyItMatters: "Europe is a top export destination; the euro rate shapes margins for IT, pharma and textiles.", valueKind: "reference-rate", order: 10, fetch: () => ecbSeries("EXR", "D.INR.EUR.SP00.A", 90) },

  // ───── Global ─────
  { code: "WLD_GDP", name: "World GDP growth", region: "global", unit: "%", frequency: "annual", provider: "worldbank", sourceName: "World Bank (NY.GDP.MKTP.KD.ZG, WLD)", sourceUrl: "https://data.worldbank.org/indicator/NY.GDP.MKTP.KD.ZG?locations=1W", explanation: "Real growth of global output, aggregated by the World Bank.", whyItMatters: "Sets the tide for exports, commodity prices and investor risk appetite everywhere, including India.", valueKind: "actual", order: 20, fetch: () => worldBank("WLD", "NY.GDP.MKTP.KD.ZG") },
  { code: "US_GDP", name: "US GDP growth", region: "global", unit: "%", frequency: "annual", provider: "worldbank", sourceName: "World Bank (NY.GDP.MKTP.KD.ZG, USA)", sourceUrl: "https://data.worldbank.org/indicator/NY.GDP.MKTP.KD.ZG?locations=US", explanation: "Real annual growth of the world's largest economy.", whyItMatters: "US demand, rates and the dollar drive global capital flows; India's IT and pharma exporters depend on it.", valueKind: "actual", order: 21, fetch: () => worldBank("USA", "NY.GDP.MKTP.KD.ZG") },
  { code: "US_CPI", name: "US CPI inflation", region: "global", unit: "%", frequency: "annual", provider: "worldbank", sourceName: "World Bank (FP.CPI.TOTL.ZG, USA)", sourceUrl: "https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG?locations=US", explanation: "Annual change in US consumer prices.", whyItMatters: "Determines how long the Federal Reserve keeps rates high, which moves the dollar and emerging-market flows.", valueKind: "actual", order: 22, fetch: () => worldBank("USA", "FP.CPI.TOTL.ZG") },
  { code: "EMU_CPI", name: "Euro area CPI inflation", region: "global", unit: "%", frequency: "annual", provider: "worldbank", sourceName: "World Bank (FP.CPI.TOTL.ZG, EMU)", sourceUrl: "https://data.worldbank.org/indicator/FP.CPI.TOTL.ZG?locations=XC", explanation: "Annual change in consumer prices across the euro area.", whyItMatters: "Guides ECB policy, which shapes the euro and demand in India's second-largest export market.", valueKind: "actual", order: 23, fetch: () => worldBank("EMU", "FP.CPI.TOTL.ZG") },
  { code: "CHN_GDP", name: "China GDP growth", region: "global", unit: "%", frequency: "annual", provider: "worldbank", sourceName: "World Bank (NY.GDP.MKTP.KD.ZG, CHN)", sourceUrl: "https://data.worldbank.org/indicator/NY.GDP.MKTP.KD.ZG?locations=CN", explanation: "Real annual growth of the world's second-largest economy.", whyItMatters: "China's demand sets commodity prices and its exports shape competition for Indian manufacturers.", valueKind: "actual", order: 24, fetch: () => worldBank("CHN", "NY.GDP.MKTP.KD.ZG") },
  { code: "ECB_MRR", name: "ECB main refinancing rate", region: "global", unit: "%", frequency: "daily", provider: "ecb", sourceName: "ECB (FM.B.U2.EUR.4F.KR.MRR_FR.LEV)", sourceUrl: "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/key_ecb_interest_rates/html/index.en.html", explanation: "The rate at which euro-area banks borrow from the ECB for one week; the headline ECB policy rate.", whyItMatters: "Moves the euro and European demand, and signals the global direction of monetary policy.", valueKind: "policy-rate", order: 25, fetch: () => ecbSeries("FM", "B.U2.EUR.4F.KR.MRR_FR.LEV", 40) },
  { code: "ECB_DFR", name: "ECB deposit facility rate", region: "global", unit: "%", frequency: "daily", provider: "ecb", sourceName: "ECB (FM.B.U2.EUR.4F.KR.DFR.LEV)", sourceUrl: "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/key_ecb_interest_rates/html/index.en.html", explanation: "The rate banks receive for overnight deposits at the ECB; in practice the floor for euro money-market rates.", whyItMatters: "This is the rate the ECB actually steers today; it anchors European bond yields.", valueKind: "policy-rate", order: 26, fetch: () => ecbSeries("FM", "B.U2.EUR.4F.KR.DFR.LEV", 40) },
  { code: "EURUSD", name: "EUR / USD", region: "global", unit: "USD", frequency: "daily", provider: "ecb", sourceName: "ECB euro reference rate", sourceUrl: "https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/eurofxref-graph-usd.en.html", explanation: "Dollars per euro, the ECB's official daily reference rate.", whyItMatters: "The most traded currency pair; a barometer of relative US–European growth and rate expectations.", valueKind: "reference-rate", order: 27, fetch: () => ecbSeries("EXR", "D.USD.EUR.SP00.A", 90) },
  { code: "FED_FUNDS", name: "US federal funds rate", region: "global", unit: "%", frequency: "monthly", provider: "fred", sourceName: "FRED (FEDFUNDS)", sourceUrl: "https://fred.stlouisfed.org/series/FEDFUNDS", explanation: "Monthly average of the rate US banks charge each other overnight; the Fed's policy rate.", whyItMatters: "The world's benchmark interest rate: it prices the dollar, global bonds and flows into emerging markets.", valueKind: "policy-rate", order: 28, fetch: () => fred("FEDFUNDS") },
  { code: "US_CPI_M", name: "US CPI inflation (monthly, y/y)", region: "global", unit: "%", frequency: "monthly", provider: "fred", sourceName: "FRED (CPIAUCSL, % change from year ago)", sourceUrl: "https://fred.stlouisfed.org/series/CPIAUCSL", explanation: "Year-on-year change in the US consumer price index, monthly.", whyItMatters: "The freshest read on US inflation, watched for Fed rate moves.", valueKind: "actual", order: 29, fetch: () => fred("CPIAUCSL", "pc1") },
  { code: "US_10Y", name: "US 10-year Treasury yield", region: "global", unit: "%", frequency: "daily", provider: "fred", sourceName: "FRED (DGS10)", sourceUrl: "https://fred.stlouisfed.org/series/DGS10", explanation: "Yield on 10-year US government bonds.", whyItMatters: "The global risk-free benchmark; when it rises, money leaves emerging markets like India.", valueKind: "actual", order: 30, fetch: () => fred("DGS10") },
  { code: "BRENT", name: "Brent crude oil", region: "global", unit: "US$/bbl", frequency: "daily", provider: "fred", sourceName: "FRED (DCOILBRENTEU)", sourceUrl: "https://fred.stlouisfed.org/series/DCOILBRENTEU", explanation: "Daily spot price of Brent crude, the global oil benchmark.", whyItMatters: "India imports over 85% of its crude; every $10 move shifts the import bill, inflation and the rupee.", valueKind: "actual", order: 31, fetch: () => fred("DCOILBRENTEU") },
];

export async function refreshIndicators(): Promise<{ ok: number; failed: { code: string; error: string }[] }> {
  const job = await db.jobRun.create({ data: { name: "econ:refresh", status: "running" } });
  const failed: { code: string; error: string }[] = [];
  let ok = 0;
  for (const def of INDICATORS) {
    const base = {
      name: def.name, region: def.region, unit: def.unit, frequency: def.frequency, provider: def.provider,
      sourceName: def.sourceName, sourceUrl: def.sourceUrl, explanation: def.explanation, whyItMatters: def.whyItMatters,
      valueKind: def.valueKind, order: def.order,
    };
    try {
      if (def.provider === "fred" && !process.env.FRED_API_KEY) {
        await db.indicator.upsert({ where: { code: def.code }, update: { ...base, lastError: "FRED_API_KEY not configured" }, create: { code: def.code, ...base, seriesJson: "[]", lastError: "FRED_API_KEY not configured" } });
        failed.push({ code: def.code, error: "FRED_API_KEY not configured" });
        continue;
      }
      const { series, sourceUpdatedAt } = await def.fetch();
      if (!series.length) throw new Error("empty series");
      const latest = series[series.length - 1];
      const prev = series.length > 1 ? series[series.length - 2] : null;
      await db.indicator.upsert({
        where: { code: def.code },
        update: { ...base, seriesJson: JSON.stringify(series.slice(-60)), latestValue: latest.value, latestPeriod: latest.period, previousValue: prev?.value ?? null, previousPeriod: prev?.period ?? null, sourceUpdatedAt: sourceUpdatedAt ?? null, fetchedAt: new Date(), lastError: null },
        create: { code: def.code, ...base, seriesJson: JSON.stringify(series.slice(-60)), latestValue: latest.value, latestPeriod: latest.period, previousValue: prev?.value ?? null, previousPeriod: prev?.period ?? null, sourceUpdatedAt: sourceUpdatedAt ?? null, fetchedAt: new Date() },
      });
      ok++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      failed.push({ code: def.code, error: msg });
      await db.indicator.upsert({ where: { code: def.code }, update: { ...base, lastError: msg.slice(0, 300) }, create: { code: def.code, ...base, seriesJson: "[]", lastError: msg.slice(0, 300) } }).catch(() => {});
    }
  }
  await setSetting("lastEconRefreshAt", new Date().toISOString());
  await db.jobRun.update({ where: { id: job.id }, data: { status: failed.length === INDICATORS.length ? "error" : "ok", finishedAt: new Date(), details: JSON.stringify({ ok, failed }) } });
  return { ok, failed };
}
