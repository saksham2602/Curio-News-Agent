import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { Container, SectionHeader, SubjectTag, TierBadge, EmptyState } from "@/components/ui";
import { Magnifier, Nodes, Lightbulb } from "@/components/doodles";
import { SUBJECTS } from "@/lib/taxonomy";
import { searchStories } from "@/lib/search";
import { currentUser } from "@/lib/auth";
import { db, ci } from "@/lib/db";
import { cn, fmtShortDate, safeJson, timeAgo } from "@/lib/utils";
import { fmtValue } from "@/components/home/Sections";
import { isAiConfigured } from "@/lib/ai/client";

export const metadata: Metadata = { title: "Search & Explore" };
export const dynamic = "force-dynamic";

type SP = { q?: string; mode?: string; subject?: string; region?: string; tier?: string; days?: string; maxmin?: string };

const COUNTRIES = ["India", "United States", "China", "United Kingdom", "Europe", "Japan", "Russia", "Pakistan", "Israel", "Iran", "Gulf"];
const CONCEPTS = ["inflation", "repo rate", "GDP", "rupee", "crude oil", "tariffs", "bond yields", "IPO", "semiconductors", "fiscal deficit", "trade deal", "AI"];

export default async function ExplorePage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const mode = (["latest", "topic", "connections"].includes(sp.mode ?? "") ? sp.mode : "latest") as "latest" | "topic" | "connections";
  const user = await currentUser();

  const days = [1, 3, 7, 30, 90].includes(Number(sp.days)) ? Number(sp.days) : undefined;
  const hits = q ? await searchStories({ q, limit: 40, subject: sp.subject || undefined, region: sp.region || undefined, tier: sp.tier || undefined, days, maxMinutes: Number(sp.maxmin) || undefined }) : [];
  const [indicators, saved, notes, deepDives] = q
    ? await Promise.all([
        db.indicator.findMany({ where: { latestValue: { not: null }, OR: q.split(/\s+/).filter((t) => t.length > 2).map((t) => ({ name: { contains: t, ...ci } })) } , take: 4 }),
        user ? db.bookmark.findMany({ where: { userId: user.id, story: { OR: [{ title: { contains: q, ...ci } }, { summary: { contains: q, ...ci } }] } }, include: { story: { select: { slug: true, title: true } } }, take: 5 }) : [],
        user ? db.reflection.findMany({ where: { userId: user.id, OR: [{ title: { contains: q, ...ci } }, { meaning: { contains: q, ...ci } }, { freeform: { contains: q, ...ci } }] }, select: { id: true, title: true }, take: 5 }) : [],
        db.story.findMany({ where: { deepDiveKind: "ai", OR: [{ title: { contains: q, ...ci } }, { summary: { contains: q, ...ci } }] }, select: { slug: true, title: true }, take: 4 }),
      ])
    : [[], [], [], []];

  // Trending entities for browsing.
  const recent = await db.story.findMany({ where: { latestPublishedAt: { gte: new Date(Date.now() - 48 * 3_600_000) } }, select: { entitiesJson: true }, take: 300 });
  const counts = new Map<string, number>();
  for (const r of recent) for (const e of safeJson<string[]>(r.entitiesJson, []).slice(0, 6)) if (e.length > 3) counts.set(e, (counts.get(e) ?? 0) + 1);
  const trending = Array.from(counts.entries()).filter(([, n]) => n >= 3).sort((a, b) => b[1] - a[1]).slice(0, 18);

  const modeHref = (m: string) => `/explore?${new URLSearchParams({ ...(q ? { q } : {}), mode: m }).toString()}`;

  return (
    <Container className="pb-10 pt-8 sm:pt-12">
      <SectionHeader eyebrow="Search & explore" title={q ? `“${q}”` : "What are you curious about today?"} description="Search across stories, topics, companies, countries, economic concepts, your saved items and your notes." doodle={<Magnifier className="h-12 w-12" />} size="lg" />
      <form action="/explore" className="mt-6 flex max-w-2xl items-center rounded-full bg-card p-1.5 shadow-card ring-1 ring-line focus-within:ring-ink/40">
        <Search className="ml-3 h-[18px] w-[18px] shrink-0 text-muted" />
        <input name="q" defaultValue={q} type="search" placeholder="What are you curious about today?" className="min-w-0 flex-1 bg-transparent px-3 py-2 text-[15px] outline-none" aria-label="Search" autoFocus={!q} />
        <input type="hidden" name="mode" value={mode} />
        <button type="submit" className="rounded-full bg-ink px-5 py-2.5 text-[14px] font-semibold text-paper">Search</button>
      </form>

      {q ? (
        <>
          <div className="mt-5 inline-flex max-w-full flex-wrap gap-0.5 rounded-3xl border border-line p-0.5">
            {[["latest", "Latest News"], ["topic", "Understand the Topic"], ["connections", "Explore Connections"]].map(([m, label]) => (
              <Link key={m} href={modeHref(m)} className={cn("pill", mode === m ? "bg-ink text-paper" : "hover:bg-line/60")}>
                {label}
              </Link>
            ))}
          </div>

          {mode === "latest" && (
            <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_300px]">
              <div>
                <form action="/explore" className="flex flex-wrap gap-2">
                  <input type="hidden" name="q" value={q} />
                  <select name="subject" defaultValue={sp.subject ?? ""} className="rounded-full border border-line bg-card px-3 py-1.5 text-[13px]" aria-label="Subject"><option value="">All subjects</option>{SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
                  <select name="region" defaultValue={sp.region ?? ""} className="rounded-full border border-line bg-card px-3 py-1.5 text-[13px]" aria-label="Geography"><option value="">All geographies</option><option value="india">India</option><option value="international">International</option><option value="cross-border">Cross-border</option></select>
                  <select name="tier" defaultValue={sp.tier ?? ""} className="rounded-full border border-line bg-card px-3 py-1.5 text-[13px]" aria-label="Importance"><option value="">Any importance</option><option value="must-know">Must Know</option><option value="worth-understanding">Worth Understanding</option><option value="discover">Discover</option></select>
                  <select name="days" defaultValue={sp.days ?? ""} className="rounded-full border border-line bg-card px-3 py-1.5 text-[13px]" aria-label="Date"><option value="">Any date</option><option value="1">24 hours</option><option value="7">7 days</option><option value="30">30 days</option><option value="90">90 days</option></select>
                  <select name="maxmin" defaultValue={sp.maxmin ?? ""} className="rounded-full border border-line bg-card px-3 py-1.5 text-[13px]" aria-label="Reading time"><option value="">Any reading time</option><option value="5">≤ 5 min deep dive</option><option value="6">≤ 6 min</option></select>
                  <button type="submit" className="rounded-full border border-ink px-3 py-1.5 text-[13px] font-semibold">Apply</button>
                </form>
                <p className="mt-3 text-[13px] text-muted">{hits.length} {hits.length === 1 ? "story" : "stories"}</p>
                {hits.length ? (
                  <ul className="mt-2 divide-y divide-line">
                    {hits.map((h) => (
                      <li key={h.id} className="py-3.5">
                        <div className="flex flex-wrap items-center gap-2"><SubjectTag subject={h.subject} /><TierBadge tier={h.tier} /><span className="text-[11.5px] text-muted">{timeAgo(h.latestPublishedAt)} · {h.sourceName} · {h.quickMinutes} min quick · {h.deepMinutes} min deep</span></div>
                        <Link href={`/story/${h.slug}`} className="display mt-1 block text-[19px] font-medium leading-snug hover:text-rust">{h.title}</Link>
                        {h.summary && <p className="mt-1 text-[13.5px] text-ink/75">{h.summary.slice(0, 180)}…</p>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-4"><EmptyState doodle={<Magnifier className="h-14 w-14" />} title="No stories match" description="Try a broader term, or check Understand the Topic for explainers and data." /></div>
                )}
              </div>
              <aside className="space-y-4">
                {indicators.length > 0 && (
                  <div className="card p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Current official data</p>
                    <ul className="mt-2 space-y-2 text-[13px]">
                      {indicators.map((i) => (
                        <li key={i.code}><Link href={`/pulse#${i.code}`} className="hover:text-rust"><span className="font-medium">{i.name}</span>: <span className="font-mono">{fmtValue(i.latestValue!, i.unit)}{i.unit === "%" ? "%" : ` ${i.unit}`}</span> <span className="text-muted">({i.latestPeriod})</span></Link></li>
                      ))}
                    </ul>
                  </div>
                )}
                {(saved.length > 0 || notes.length > 0) && (
                  <div className="card p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">From your library &amp; notes</p>
                    <ul className="mt-2 space-y-1.5 text-[13px]">
                      {saved.map((b) => <li key={b.id}>📚 <Link href={`/story/${b.story.slug}`} className="hover:text-rust">{b.story.title}</Link></li>)}
                      {notes.map((n) => <li key={n.id}>✍️ <Link href={`/perspectives/${n.id}`} className="hover:text-rust">{n.title}</Link></li>)}
                    </ul>
                  </div>
                )}
                <div className="card p-4 text-[13px]">
                  <p className="font-semibold">Ask Curio about this</p>
                  <Link href={`/curio?q=${encodeURIComponent(`Explain ${q} and why it matters for India`)}`} className="mt-1 inline-block text-rust hover:underline">“Explain {q} and why it matters for India” ✨</Link>
                </div>
              </aside>
            </div>
          )}

          {mode === "topic" && (
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              <div className="card p-5">
                <p className="flex items-center gap-2 font-semibold"><Lightbulb className="h-6 w-6" /> Explainers &amp; deep dives</p>
                {deepDives.length ? (
                  <ul className="mt-2 space-y-1.5 text-[13.5px]">{deepDives.map((d) => <li key={d.slug}>🧠 <Link href={`/story/${d.slug}/deep`} className="hover:text-rust">{d.title}</Link></li>)}</ul>
                ) : (
                  <p className="mt-2 text-[13px] text-muted">No AI deep dive on this topic yet. Open any matching story and press “Take me deeper” — the fundamentals section explains the concepts from scratch.</p>
                )}
                {hits.slice(0, 3).map((h) => (
                  <p key={h.id} className="mt-2 text-[13px]">→ <Link href={`/story/${h.slug}/deep`} className="hover:text-rust">Deep dive: {h.title}</Link></p>
                ))}
              </div>
              <div className="card p-5">
                <p className="font-semibold">Official data</p>
                {indicators.length ? (
                  <ul className="mt-2 space-y-2 text-[13.5px]">{indicators.map((i) => <li key={i.code}><Link href={`/pulse#${i.code}`} className="hover:text-rust">{i.name}: <span className="font-mono">{fmtValue(i.latestValue!, i.unit)}{i.unit === "%" ? "%" : ` ${i.unit}`}</span> <span className="text-muted">· {i.latestPeriod} · {i.sourceName}</span></Link><p className="text-[12px] text-muted">{i.explanation}</p></li>)}</ul>
                ) : (
                  <p className="mt-2 text-[13px] text-muted">No indicator on the Economic Pulse matches this term. <Link href="/pulse" className="underline">Browse all indicators</Link>.</p>
                )}
              </div>
              <div className="card p-5 md:col-span-2">
                <p className="font-semibold">Historical trail</p>
                <p className="text-[12px] text-muted">Matching stories, oldest first — how the topic developed.</p>
                <ol className="mt-2 space-y-1.5 text-[13.5px]">
                  {[...hits].sort((a, b) => a.latestPublishedAt.getTime() - b.latestPublishedAt.getTime()).slice(0, 10).map((h) => (
                    <li key={h.id}><span className="mr-2 font-mono text-[11px] text-muted">{fmtShortDate(h.latestPublishedAt)}</span><Link href={`/story/${h.slug}`} className="hover:text-rust">{h.title}</Link></li>
                  ))}
                </ol>
                {isAiConfigured() && <Link href={`/curio?q=${encodeURIComponent(`Give me a beginner's explainer on ${q}, with historical context and what to watch`)}`} className="mt-3 inline-block text-[13px] font-semibold text-rust">Ask Curio for a full explainer ✨ →</Link>}
              </div>
            </div>
          )}

          {mode === "connections" && (
            <div className="mt-6">
              <p className="text-[13px] text-muted">Open a connection map for any matching story.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {hits.slice(0, 12).map((h) => (
                  <Link key={h.id} href={`/connect/${h.slug}`} className="card card-hover flex items-start gap-3 p-4"><Nodes className="h-8 w-8 shrink-0" /><span><SubjectTag subject={h.subject} /><span className="display mt-1 block text-[16px] font-medium leading-snug">{h.title}</span></span></Link>
                ))}
              </div>
              {!hits.length && <div className="mt-4"><EmptyState doodle={<Nodes className="h-14 w-14" />} title="No stories to connect" /></div>}
            </div>
          )}
        </>
      ) : (
        <div className="mt-10 space-y-10">
          <section>
            <h2 className="eyebrow">Browse by subject</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {SUBJECTS.map((s) => (
                <Link key={s.id} href={`/news?subject=${s.id}`} className="card card-hover p-4"><span className="text-xl">{s.emoji}</span><p className="display mt-1 text-[17px] font-medium">{s.label}</p><p className="mt-0.5 text-[12px] text-muted">{s.description}</p></Link>
              ))}
            </div>
          </section>
          <section>
            <h2 className="eyebrow">Countries &amp; regions</h2>
            <div className="mt-3 flex flex-wrap gap-2">{COUNTRIES.map((c) => <Link key={c} href={`/explore?q=${encodeURIComponent(c)}`} className="pill border border-line bg-card hover:border-ink/50">{c}</Link>)}</div>
          </section>
          <section>
            <h2 className="eyebrow">Economic concepts</h2>
            <div className="mt-3 flex flex-wrap gap-2">{CONCEPTS.map((c) => <Link key={c} href={`/explore?q=${encodeURIComponent(c)}&mode=topic`} className="pill border border-line bg-card hover:border-ink/50">{c}</Link>)}</div>
          </section>
          {trending.length > 0 && (
            <section>
              <h2 className="eyebrow">In the news right now</h2>
              <div className="mt-3 flex flex-wrap gap-2">{trending.map(([e, n]) => <Link key={e} href={`/explore?q=${encodeURIComponent(e)}`} className="pill border border-line bg-card hover:border-ink/50">{e} <span className="text-muted">{n}</span></Link>)}</div>
            </section>
          )}
        </div>
      )}
    </Container>
  );
}
