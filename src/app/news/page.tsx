import type { Metadata } from "next";
import Link from "next/link";
import { Container, SectionHeader, EmptyState } from "@/components/ui";
import { StoryCard } from "@/components/story/StoryCard";
import { FiltersBar } from "@/components/news/FiltersBar";
import { GlobeNewspaper, PaperPlane } from "@/components/doodles";
import { currentUser } from "@/lib/auth";
import { getAllNews, getUserStoryState } from "@/lib/queries";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "All News" };
export const dynamic = "force-dynamic";

type SP = { subject?: string; region?: string; tier?: string; source?: string; days?: string; sort?: string; page?: string; saved?: string };

export default async function NewsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await currentUser();
  const days = [1, 3, 7, 30].includes(Number(sp.days)) ? Number(sp.days) : 3;
  const sort = (["importance", "latest", "sources"].includes(sp.sort ?? "") ? sp.sort : "importance") as "importance" | "latest" | "sources";
  const page = Math.max(1, Number(sp.page) || 1);
  const [{ total, rows, pageSize }, sources] = await Promise.all([
    getAllNews({ subject: sp.subject || undefined, region: sp.region || undefined, tier: sp.tier || undefined, sourceId: sp.source || undefined, days, sort, page, saved: sp.saved === "1", userId: user?.id }),
    db.source.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  const state = await getUserStoryState(user?.id ?? null, rows.map((r) => r.id));
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const qs = (p: number) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) if (v && k !== "page") u.set(k, v);
    u.set("page", String(p));
    return `/news?${u.toString()}`;
  };
  const uniqueSources = Array.from(new Map(sources.map((s) => [s.name, s])).values());

  return (
    <Container className="pb-10 pt-8 sm:pt-12">
      <SectionHeader eyebrow="All important news" title="Everything that matters, ranked by significance" description="Sorted by transparent editorial factors — corroboration, scale, policy and economic consequence, India relevance and freshness. Filters narrow; they never hide by default." doodle={<GlobeNewspaper className="h-12 w-12" />} size="lg" />
      <div className="mt-8 border-t border-line" />
      <FiltersBar sources={uniqueSources} current={{ subject: sp.subject ?? "", region: sp.region ?? "", tier: sp.tier ?? "", source: sp.source ?? "", days: String(days), sort, saved: sp.saved === "1" }} />
      <p className="mt-4 text-[13px] text-muted">{total.toLocaleString("en-IN")} stories</p>
      {rows.length ? (
        <div className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((s) => (
            <StoryCard key={s.id} story={s} variant="grid" bookmarked={state.bookmarked.has(s.id)} read={state.read.has(s.id)} />
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState doodle={<PaperPlane className="h-14 w-14" />} title="Nothing matches those filters" description="Try a wider date range or clear a filter." action={<Link href="/news" className="rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-paper">Clear filters</Link>} />
        </div>
      )}
      {pages > 1 && (
        <nav className="mt-8 flex items-center justify-center gap-2" aria-label="Pagination">
          <Link href={qs(Math.max(1, page - 1))} aria-disabled={page === 1} className={cn("pill border border-line bg-card", page === 1 && "pointer-events-none opacity-40")}>
            ← Previous
          </Link>
          <span className="text-[13px] text-muted">
            Page {page} of {pages}
          </span>
          <Link href={qs(Math.min(pages, page + 1))} aria-disabled={page === pages} className={cn("pill border border-line bg-card", page === pages && "pointer-events-none opacity-40")}>
            Next →
          </Link>
        </nav>
      )}
    </Container>
  );
}
