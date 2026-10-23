import type { Metadata } from "next";
import Link from "next/link";
import { Container, SectionHeader, EmptyState, PrimaryButton } from "@/components/ui";
import { Pencil, Lightbulb } from "@/components/doodles";
import { ExportButton } from "@/components/perspectives/ExportButton";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { fmtShortDate, timeAgo, truncate } from "@/lib/utils";

export const metadata: Metadata = { title: "My Perspectives" };
export const dynamic = "force-dynamic";

export default async function PerspectivesPage() {
  const user = await currentUser();
  if (!user) return null;
  const reflections = await db.reflection.findMany({ where: { userId: user.id }, orderBy: { updatedAt: "desc" }, include: { story: { select: { slug: true, title: true, subject: true } } } });

  // Revisit prompt: a reflection older than 14 days whose story has newer linked developments.
  let revisit: { id: string; title: string; newer: { slug: string; title: string } } | null = null;
  for (const r of reflections.filter((x) => x.storyId && Date.now() - x.createdAt.getTime() > 14 * 86_400_000)) {
    const link = await db.storyLink.findFirst({ where: { fromId: r.storyId!, to: { latestPublishedAt: { gt: r.createdAt } } }, orderBy: { strength: "desc" }, include: { to: { select: { slug: true, title: true } } } });
    if (link) {
      revisit = { id: r.id, title: r.title, newer: link.to };
      break;
    }
  }

  // Group by month for the timeline.
  const groups = new Map<string, typeof reflections>();
  for (const r of reflections) {
    const key = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric", timeZone: "Asia/Kolkata" }).format(r.updatedAt);
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }

  return (
    <Container className="pb-10 pt-8 sm:pt-12">
      <SectionHeader eyebrow={<>My perspectives ✍️</>} title="A private thinking space" description="Interpretations, questions, predictions, counterarguments. Nothing here is public. Revisit your earlier thinking as the world changes." doodle={<Pencil className="h-12 w-12" />} size="lg" action={{ href: "/perspectives/new", label: "New reflection" }} />
      <div className="mt-8 border-t border-line" />

      {revisit && (
        <div className="mt-8 flex items-start gap-3 rounded-[24px] bg-lavender/50 p-5 text-[14px] dark:bg-lavender/10">
          <Lightbulb className="h-8 w-8 shrink-0" />
          <p>
            You wrote <Link href={`/perspectives/${revisit.id}`} className="font-semibold hover:text-rust">{revisit.title}</Link> a while ago. Since then: <Link href={`/story/${revisit.newer.slug}`} className="text-rust hover:underline">{revisit.newer.title}</Link>. Would you like to <Link href={`/perspectives/${revisit.id}`} className="font-semibold underline">revisit your perspective</Link>?
          </p>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <p className="text-[13px] text-muted">{reflections.length} {reflections.length === 1 ? "reflection" : "reflections"}</p>
        {reflections.length > 0 && <ExportButton reflections={reflections.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(), storyTitle: r.story?.title ?? null }))} />}
      </div>

      {reflections.length ? (
        <div className="mt-4 space-y-8">
          {Array.from(groups.entries()).map(([month, list]) => (
            <section key={month}>
              <h2 className="eyebrow">{month}</h2>
              <ol className="timeline relative mt-3 space-y-3 pl-6">
                {list.map((r) => (
                  <li key={r.id} className="relative">
                    <span className="absolute -left-6 top-4 h-[15px] w-[15px] rounded-full border-2 border-paper bg-coral ring-1 ring-line" />
                    <Link href={`/perspectives/${r.id}`} className="card card-hover block p-4 sm:p-5">
                      <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-muted">
                        <span>{fmtShortDate(r.createdAt)}</span>
                        {r.updatedAt.getTime() - r.createdAt.getTime() > 60_000 && <span>· edited {timeAgo(r.updatedAt)}</span>}
                        {r.aiReview && <span className="rounded-full bg-lavender px-2 py-0.5 font-semibold text-[#3E2E6E]">AI reviewed</span>}
                      </div>
                      <h3 className="display mt-1 text-[20px] font-medium leading-snug">{r.title}</h3>
                      {r.story && <p className="mt-0.5 text-[12px] text-muted">On: {r.story.title}</p>}
                      <p className="mt-2 text-[13.5px] leading-relaxed text-ink/80">{truncate(r.meaning || r.freeform || r.happened || "—", 220)}</p>
                    </Link>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      ) : (
        <div className="mt-6">
          <EmptyState doodle={<Pencil className="h-14 w-14" />} title="No reflections yet" description="Start with the structured template: what happened, what you think it means, what supports your view, what you might be missing, and what could change your mind." action={<PrimaryButton href="/perspectives/new">Write your first reflection</PrimaryButton>} />
        </div>
      )}
    </Container>
  );
}
