import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui";
import { ReflectionEditor } from "@/components/perspectives/ReflectionEditor";
import { ExportButton } from "@/components/perspectives/ExportButton";
import { currentUser } from "@/lib/auth";
import { isAiConfigured } from "@/lib/ai/client";
import { db } from "@/lib/db";
import { safeJson } from "@/lib/utils";
import type { PerspectiveReview } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ReflectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return null;
  const r = await db.reflection.findFirst({ where: { id, userId: user.id }, include: { story: { select: { slug: true, title: true } } } });
  if (!r) notFound();
  return (
    <Container className="pb-10 pt-8 sm:pt-12">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <nav className="text-[12px] text-muted">
          <Link href="/perspectives" className="hover:text-rust">My Perspectives</Link> <span className="mx-1">/</span> {r.title}
          {r.story && (
            <>
              <span className="mx-1">·</span>
              <Link href={`/story/${r.story.slug}`} className="hover:text-rust">open the story</Link>
            </>
          )}
        </nav>
        <ExportButton single reflections={[{ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(), storyTitle: r.story?.title ?? null }]} />
      </div>
      <div className="mt-4">
        <ReflectionEditor initial={{ id: r.id, title: r.title, storyId: r.storyId, happened: r.happened, meaning: r.meaning, evidence: r.evidence, missing: r.missing, changeMind: r.changeMind, freeform: r.freeform, aiReview: safeJson<PerspectiveReview | null>(r.aiReview, null) }} aiConfigured={isAiConfigured()} storyTitle={r.story?.title} />
      </div>
    </Container>
  );
}
