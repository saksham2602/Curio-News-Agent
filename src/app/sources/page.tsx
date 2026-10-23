import type { Metadata } from "next";
import { Container, SectionHeader } from "@/components/ui";
import { GlobeNewspaper } from "@/components/doodles";
import { getSourcesHealth } from "@/lib/queries";
import { EXCLUDED_SOURCES, SOURCE_MAP } from "@/lib/sources";
import { db } from "@/lib/db";
import { cn, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Source Health" };
export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const [sources, jobs] = await Promise.all([getSourcesHealth(), db.jobRun.findMany({ orderBy: { startedAt: "desc" }, take: 8 })]);
  const india = sources.filter((s) => s.region === "india");
  const intl = sources.filter((s) => s.region === "international");
  const Table = ({ rows }: { rows: typeof sources }) => (
    <div className="card mt-3 overflow-x-auto">
      <table className="w-full min-w-[640px] text-[13px]">
        <thead className="text-left text-[11px] uppercase tracking-wider text-muted">
          <tr className="border-b border-line">
            <th className="px-4 py-2.5">Source</th><th className="px-4 py-2.5">Kind</th><th className="px-4 py-2.5">Weight</th><th className="px-4 py-2.5">Cadence</th><th className="px-4 py-2.5">Last fetch</th><th className="px-4 py-2.5">Items</th><th className="px-4 py-2.5">72h articles</th><th className="px-4 py-2.5">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id} className="border-b border-line/60 last:border-0">
              <td className="px-4 py-2.5"><a href={s.feedUrl} target="_blank" rel="noopener noreferrer" className="font-medium hover:text-rust">{s.name}</a><span className="block text-[11px] text-muted">{s.feedUrl.replace(/^https?:\/\//, "").slice(0, 60)}</span></td>
              <td className="px-4 py-2.5">{s.kind}</td>
              <td className="px-4 py-2.5 font-mono">{s.credibility.toFixed(2)}</td>
              <td className="px-4 py-2.5">{SOURCE_MAP[s.id]?.cadence ?? "—"}</td>
              <td className="px-4 py-2.5">{s.lastFetchedAt ? timeAgo(s.lastFetchedAt) : "never"}</td>
              <td className="px-4 py-2.5 font-mono">{s.lastItemCount}</td>
              <td className="px-4 py-2.5 font-mono">{s.recentArticles}</td>
              <td className="px-4 py-2.5"><span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", s.lastStatus === "ok" ? "bg-sage/70 text-[#2F5D2F]" : s.lastStatus === "error" ? "bg-coral/60 text-[#7A2E24]" : "bg-line")}>{s.lastStatus ?? "pending"}</span>{s.lastError && <span className="block max-w-[220px] truncate text-[11px] text-muted" title={s.lastError}>{s.lastError}</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
  return (
    <Container className="pb-10 pt-8 sm:pt-12">
      <SectionHeader eyebrow="Source health" title="Where the news comes from" description="Every feed is a public RSS endpoint published by the outlet itself. We store headlines, the outlet's own summary, the link and image reference, and always link back. Credibility weight is an editorial prior used for ranking, not a verdict on truth." doodle={<GlobeNewspaper className="h-12 w-12" />} size="lg" />
      <div className="mt-8 border-t border-line" />
      <h2 className="display mt-8 text-[22px] font-medium">India ({india.length})</h2>
      <Table rows={india} />
      <h2 className="display mt-8 text-[22px] font-medium">International ({intl.length})</h2>
      <Table rows={intl} />
      <h2 className="display mt-8 text-[22px] font-medium">Evaluated but not integrated</h2>
      <ul className="card mt-3 divide-y divide-line text-[13px]">
        {EXCLUDED_SOURCES.map((s) => (
          <li key={s.name} className="flex flex-col gap-0.5 px-4 py-2.5 sm:flex-row sm:gap-4"><span className="w-56 shrink-0 font-medium">{s.name}</span><span className="text-muted">{s.reason}</span></li>
        ))}
      </ul>
      <h2 className="display mt-8 text-[22px] font-medium">Recent jobs</h2>
      <ul className="card mt-3 divide-y divide-line text-[13px]">
        {jobs.map((j) => (
          <li key={j.id} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
            <span className="w-32 font-mono">{j.name}</span>
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", j.status === "ok" ? "bg-sage/70 text-[#2F5D2F]" : j.status === "error" ? "bg-coral/60 text-[#7A2E24]" : "bg-butter")}>{j.status}</span>
            <span className="text-muted">{timeAgo(j.startedAt)}{j.finishedAt ? ` · ${Math.round((j.finishedAt.getTime() - j.startedAt.getTime()) / 1000)}s` : ""}</span>
            {j.details && <span className="truncate text-[11px] text-muted" title={j.details}>{j.details.slice(0, 120)}</span>}
          </li>
        ))}
      </ul>
    </Container>
  );
}
