import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui";
import { ReflectionEditor } from "@/components/perspectives/ReflectionEditor";
import { isAiConfigured } from "@/lib/ai/client";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "New reflection" };
export const dynamic = "force-dynamic";

export default async function NewReflectionPage({ searchParams }: { searchParams: Promise<{ story?: string }> }) {
  const { story: slug } = await searchParams;
  const story = slug ? await db.story.findUnique({ where: { slug }, select: { id: true, title: true } }) : null;
  return (
    <Container className="pb-10 pt-8 sm:pt-12">
      <nav className="text-[12px] text-muted"><Link href="/perspectives" className="hover:text-rust">My Perspectives</Link> <span className="mx-1">/</span> New</nav>
      <div className="mt-4">
        <ReflectionEditor initial={{ title: story ? `My take: ${story.title.slice(0, 70)}` : "", storyId: story?.id ?? null, happened: "", meaning: "", evidence: "", missing: "", changeMind: "", freeform: "" }} aiConfigured={isAiConfigured()} storyTitle={story?.title} />
      </div>
    </Container>
  );
}
