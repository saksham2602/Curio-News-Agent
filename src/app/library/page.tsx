import type { Metadata } from "next";
import Link from "next/link";
import { Container, SectionHeader, EmptyState, SubjectTag, PrimaryButton } from "@/components/ui";
import { Books, Lightbulb, Pencil } from "@/components/doodles";
import { BookmarkEditor } from "@/components/library/BookmarkEditor";
import { HighlightList } from "@/components/library/HighlightList";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { COLLECTIONS, SUBJECTS } from "@/lib/taxonomy";
import { fmtShortDate, timeAgo, cn } from "@/lib/utils";

export const metadata: Metadata = { title: "My Little Library" };
export const dynamic = "force-dynamic";

type SP = { q?: string; collection?: string; subject?: string };

export default async function LibraryPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const user = await currentUser();
  if (!user) return null;
  const q = (sp.q ?? "").trim().toLowerCase();
  const [bookmarks, highlights, reflections] = await Promise.all([
    db.bookmark.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { story: { include: { articles: { include: { source: true }, take: 1, orderBy: { publishedAt: "desc" } } } } } }),
    db.highlight.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.reflection.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, take: 5, select: { id: true, title: true, updatedAt: true } }),
  ]);
  const filtered = bookmarks.filter((b) => {
    if (sp.collection && b.collection !== sp.collection) return false;
    if (sp.subject && b.story.subject !== sp.subject) return false;
    if (q && !`${b.story.title} ${b.story.summary ?? ""} ${b.note ?? ""}`.toLowerCase().includes(q)) return false;
    return true;
  });
  const collections = Array.from(new Set([...COLLECTIONS, ...bookmarks.map((b) => b.collection)]));

  // "Remember this?": saved a while ago, and linked stories have appeared since.
  const old = bookmarks.filter((b) => Date.now() - b.createdAt.getTime() > 7 * 86_400_000).slice(0, 10);
  const recall: { bookmark: (typeof bookmarks)[number]; newer: { slug: string; title: string; latestPublishedAt: Date }[] }[] = [];
  for (const b of old) {
    const newer = await db.storyLink.findMany({ where: { fromId: b.storyId, to: { latestPublishedAt: { gt: b.createdAt } } }, include: { to: { select: { slug: true, title: true, latestPublishedAt: true } } }, orderBy: { strength: "desc" }, take: 2 });
    if (newer.length) recall.push({ bookmark: b, newer: newer.map((n) => n.to) });
    if (recall.length >= 2) break;
  }

  return (
    <Container className="pb-10 pt-8 sm:pt-12">
      <SectionHeader eyebrow={<>My little library 📚</>} title="Everything you chose to keep" description="Saved stories, collections, highlights and notes. Search finds something you read months ago." doodle={<Books className="h-12 w-12" />} size="lg" action={{ href: "/perspectives", label: "My Perspectives" }} />
      <div className="mt-8 border-t border-line" />

      {recall.length > 0 && (
        <section className="mt-8 rounded-[28px] bg-lavender/50 p-5 dark:bg-lavender/10 sm:p-6">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-8 w-8" />
            <h2 className="display text-[22px] font-medium">Remember this?</h2>
          </div>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {recall.map(({ bookmark, newer }) => (
              <div key={bookmark.id} className="rounded-2xl bg-card p-4 text-[13.5px]">
                <p>
                  {timeAgo(bookmark.createdAt).replace(" ago", "")} ago you saved <Link href={`/story/${bookmark.story.slug}`} className="font-semibold hover:text-rust">{bookmark.story.title}</Link>. Here&rsquo;s what has happened since:
                </p>
                <ul className="mt-2 space-y-1">
                  {newer.map((n) => (
                    <li key={n.slug}>
                      → <Link href={`/story/${n.slug}`} className="text-rust hover:underline">{n.title}</Link> <span className="text-[11px] text-muted">({fmtShortDate(n.latestPublishedAt)})</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      <form className="mt-8 flex flex-wrap gap-2" action="/library">
        <input name="q" defaultValue={sp.q ?? ""} placeholder="Search saved stories and notes…" className="min-w-[220px] flex-1 rounded-full border border-line bg-card px-4 py-2 text-[14px] outline-none focus:border-ink/50" aria-label="Search library" />
        <select name="collection" defaultValue={sp.collection ?? ""} className="rounded-full border border-line bg-card px-3 py-2 text-[13px]" aria-label="Collection">
          <option value="">All collections</option>
          {collections.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select name="subject" defaultValue={sp.subject ?? ""} className="rounded-full border border-line bg-card px-3 py-2 text-[13px]" aria-label="Subject">
          <option value="">All subjects</option>
          {SUBJECTS.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>
        <button type="submit" className="rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-paper">Filter</button>
      </form>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_320px]">
        <section>
          <p className="text-[13px] text-muted">{filtered.length} saved {filtered.length === 1 ? "story" : "stories"}</p>
          {filtered.length ? (
            <ul className="mt-3 space-y-3">
              {filtered.map((b) => (
                <li key={b.id} className={cn("card p-4 sm:p-5")}>
                  <div className="flex flex-wrap items-center gap-2">
                    <SubjectTag subject={b.story.subject} />
                    <span className="rounded-full bg-butter/70 px-2 py-0.5 text-[11px] font-semibold">{b.collection}</span>
                    <span className="text-[11.5px] text-muted">saved {timeAgo(b.createdAt)} · published {fmtShortDate(b.story.latestPublishedAt)}</span>
                  </div>
                  <Link href={`/story/${b.story.slug}`} className="display mt-2 block text-[20px] font-medium leading-snug hover:text-rust">{b.story.title}</Link>
                  {b.story.articles[0] && (
                    <p className="mt-1 text-[12px] text-muted">
                      {b.story.articles[0].source.name} · <a href={b.story.articles[0].url} target="_blank" rel="noopener noreferrer" className="text-rust hover:underline">original</a> · <Link href={`/story/${b.story.slug}/deep`} className="hover:underline">deep dive</Link> · <Link href={`/connect/${b.story.slug}`} className="hover:underline">connections</Link>
                    </p>
                  )}
                  <BookmarkEditor storyId={b.storyId} collection={b.collection} note={b.note ?? ""} collections={collections} />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-3">
              <EmptyState doodle={<Books className="h-14 w-14" />} title={bookmarks.length ? "No saved stories match" : "Your library is empty"} description={bookmarks.length ? "Try another search or collection." : "Tap the bookmark on any story to keep it here, add it to a collection and write a note."} action={!bookmarks.length ? <PrimaryButton href="/">Find something to save</PrimaryButton> : undefined} />
            </div>
          )}
        </section>
        <aside className="space-y-5">
          <div className="card p-4">
            <p className="flex items-center gap-1.5 font-semibold"><Pencil className="h-5 w-5" /> Recent perspectives</p>
            {reflections.length ? (
              <ul className="mt-2 space-y-1.5 text-[13px]">
                {reflections.map((r) => (
                  <li key={r.id}>
                    <Link href={`/perspectives/${r.id}`} className="hover:text-rust">{r.title}</Link> <span className="text-[11px] text-muted">· {timeAgo(r.updatedAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-[13px] text-muted">No reflections yet. Every deep dive ends with “Now, what do you think?”</p>
            )}
            <Link href="/perspectives/new" className="mt-3 inline-block text-[13px] font-semibold text-rust hover:underline">Write a reflection →</Link>
          </div>
          <div className="card p-4">
            <p className="font-semibold">Highlights</p>
            <HighlightList highlights={highlights.map((h) => ({ id: h.id, text: h.text, storyId: h.storyId, createdAt: h.createdAt.toISOString() }))} />
          </div>
          <div className="card p-4 text-[13px]">
            <p className="font-semibold">Collections</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {collections.map((c) => (
                <li key={c}>
                  <Link href={`/library?collection=${encodeURIComponent(c)}`} className={cn("pill border border-line text-[12px]", sp.collection === c ? "bg-ink text-paper" : "bg-card hover:border-ink/50")}>
                    {c} <span className="opacity-60">{bookmarks.filter((b) => b.collection === c).length}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </Container>
  );
}
