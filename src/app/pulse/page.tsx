import type { Metadata } from "next";
import { Container, SectionHeader } from "@/components/ui";
import { ChartFrame } from "@/components/doodles";
import { IndicatorCard } from "@/components/pulse/IndicatorCard";
import { getIndicators } from "@/lib/queries";
import { getSetting } from "@/lib/db";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "The Economic Pulse" };
export const dynamic = "force-dynamic";

export default async function PulsePage() {
  const [indicators, last] = await Promise.all([getIndicators(), getSetting("lastEconRefreshAt")]);
  const india = indicators.filter((i) => i.region === "india");
  const global = indicators.filter((i) => i.region === "global");
  const toProps = (i: (typeof indicators)[number]) => ({ ...i, fetchedAt: i.fetchedAt?.toISOString() ?? null });
  return (
    <Container className="pb-10 pt-8 sm:pt-12">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeader eyebrow="The economic pulse" title="The numbers behind the news" description="Only verified official data, with reference periods. World Bank figures are annual actuals (latest available year, may be revised); currency pairs are ECB daily reference rates. Nothing is estimated or silently updated here." doodle={<ChartFrame className="h-12 w-12" />} size="lg" />
        {last && <p className="shrink-0 text-[12px] text-muted">Last fetched {timeAgo(last)}</p>}
      </div>
      <div className="mt-8 border-t border-line" />

      <h2 className="display mt-8 flex items-center gap-2 text-[24px] font-medium">
        <span className="rounded bg-ink px-1.5 py-0.5 font-mono text-[11px] text-paper">IN</span> India
      </h2>
      <div className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {india.map((i) => (
          <IndicatorCard key={i.code} indicator={toProps(i)} />
        ))}
      </div>

      <h2 className="display mt-12 flex items-center gap-2 text-[24px] font-medium">
        <span className="rounded bg-ink px-1.5 py-0.5 font-mono text-[11px] text-paper">🌐</span> Global
      </h2>
      <div className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {global.map((i) => (
          <IndicatorCard key={i.code} indicator={toProps(i)} />
        ))}
      </div>

      <p className="mt-10 text-[12px] text-muted">
        Data providers: World Bank Open Data API, European Central Bank Data Portal, and (optionally, with a free key) FRED. The RBI repo rate is extracted from RBI&rsquo;s own press releases because no machine-readable feed exists; its source link is shown on the card.
      </p>
    </Container>
  );
}
