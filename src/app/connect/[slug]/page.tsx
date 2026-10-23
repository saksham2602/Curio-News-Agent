import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, SubjectTag, TierBadge } from "@/components/ui";
import { Nodes } from "@/components/doodles";
import { ConnectionMap, type MapNode } from "@/components/connect/ConnectionMap";
import { db } from "@/lib/db";
import { isAiConfigured } from "@/lib/ai/client";
import type { DeepDive } from "@/lib/types";
import { safeJson, fmtShortDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = await db.story.findUnique({ where: { slug }, select: { title: true } });
  return { title: s ? `Connections: ${s.title}` : "Connect the Dots" };
}

export default async function ConnectStoryPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ from?: string }> }) {
  const { slug } = await params;
  const { from } = await searchParams;
  const story = await db.story.findUnique({
    where: { slug },
    include: {
      articles: { include: { source: true }, orderBy: { publishedAt: "desc" } },
      linksFrom: { include: { to: { include: { articles: { include: { source: true }, take: 2, orderBy: { publishedAt: "desc" } }, _count: { select: { linksFrom: true } } } } }, orderBy: { strength: "desc" }, take: 8 },
    },
  });
  if (!story) notFound();
  const dd = safeJson<DeepDive | null>(story.deepDiveJson, null);

  const nodes: MapNode[] = story.linksFrom.map((l) => ({
    id: l.to.id,
    slug: l.to.slug,
    label: l.to.title,
    kind: "story",
    subject: l.to.subject,
    relation: l.relation,
    strength: l.strength,
    explanation: l.rationale ?? `Shares ${safeJson<string[]>(l.shared, []).slice(0, 3).join(", ") || "themes"} with this story.`,
    shared: safeJson<string[]>(l.shared, []),
    sources: l.to.articles.map((a) => ({ name: a.source.name, url: a.url })),
    summary: l.to.summary ?? "",
    date: fmtShortDate(l.to.latestPublishedAt),
    furtherLinks: l.to._count.linksFrom,
  }));
  if (dd?.kind === "ai") {
    for (const c of dd.connections.filter((c) => c.kind !== "story").slice(0, 6)) {
      nodes.push({ id: `c:${c.label}`, slug: null, label: c.label, kind: c.kind, subject: story.subject, relation: c.relation, strength: c.relation === "causal" ? 4 : c.relation === "correlated" ? 3 : 2, explanation: c.explanation, shared: [], sources: [], summary: c.chain?.join(" → ") ?? "", date: "", furtherLinks: 0 });
    }
  }

  return (
    <Container className="pb-10 pt-6 sm:pt-10">
      <nav className="text-[12px] text-muted" aria-label="Breadcrumb">
        <Link href="/connect" className="hover:text-rust">Connect the Dots</Link>
        {from && (
          <>
            <span className="mx-1">/</span>
            <Link href={`/connect/${from}`} className="hover:text-rust">← back to previous map</Link>
          </>
        )}
      </nav>
      <header className="mt-4 flex items-start gap-4">
        <Nodes className="hidden h-14 w-14 shrink-0 sm:block" />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <SubjectTag subject={story.subject} />
            <TierBadge tier={story.tier} />
          </div>
          <h1 className="display mt-2 text-balance text-[28px] font-medium leading-[1.1] sm:text-[38px]">{story.title}</h1>
          <p className="mt-2 max-w-2xl text-[14px] text-muted">
            {nodes.length} connections. Links found by shared people, places and ideas are labelled <em>topical</em> until classified; AI classification marks each as causal, correlated, plausible or speculative, with a one-line rationale.
          </p>
          <div className="mt-3 flex flex-wrap gap-2 text-[13px]">
            <Link href={`/story/${story.slug}`} className="rounded-full border border-line px-3 py-1.5 font-semibold hover:border-ink/50">Quick read ⚡</Link>
            <Link href={`/story/${story.slug}/deep`} className="rounded-full bg-ink px-3 py-1.5 font-semibold text-paper">Take me deeper →</Link>
          </div>
        </div>
      </header>
      <div className="mt-6">
        <ConnectionMap origin={{ id: story.id, slug: story.slug, title: story.title, subject: story.subject }} nodes={nodes} aiConfigured={isAiConfigured()} hasUnclassified={story.linksFrom.some((l) => l.relation === "topical")} />
      </div>
    </Container>
  );
}
