import type { Metadata } from "next";
import Link from "next/link";
import { Container, SectionHeader, SubjectTag, EmptyState } from "@/components/ui";
import { Nodes } from "@/components/doodles";
import { getConnectCandidates } from "@/lib/queries";

export const metadata: Metadata = { title: "Connect the Dots" };
export const dynamic = "force-dynamic";

export default async function ConnectPage() {
  const stories = await getConnectCandidates(30);
  return (
    <Container className="pb-10 pt-8 sm:pt-12">
      <SectionHeader eyebrow={<>Connect the dots 🕸️</>} title="See how the world fits together" description="Pick a story to map its links to other news, history, indicators, policies and ideas — with every link labelled causal, correlated, plausible or speculative." doodle={<Nodes className="h-12 w-12" />} size="lg" />
      <div className="mt-8 border-t border-line" />
      {stories.length ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((s) => (
            <Link key={s.id} href={`/connect/${s.slug}`} className="card card-hover flex flex-col p-5">
              <SubjectTag subject={s.subject} />
              <h3 className="display mt-2 text-[19px] font-medium leading-snug">{s.title}</h3>
              <p className="mt-auto pt-3 text-[12px] text-muted">
                {s._count.linksFrom} {s._count.linksFrom === 1 ? "connection" : "connections"} found
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState doodle={<Nodes className="h-14 w-14" />} title="No connections yet" description="Links are computed as stories are ingested. Check back after the next refresh." />
        </div>
      )}
    </Container>
  );
}
